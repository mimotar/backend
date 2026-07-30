import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import prisma from "../utils/prisma.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import { systemDispatchNotificationByEmail } from "./notification/notification.service.js";
import { transactionClosureQueue } from "../config/bullmq.js";

const UNILATERAL_CANCEL_STATUSES = ["CREATED", "APPROVED"] as const;
const MUTUAL_CANCEL_STATUSES = ["ONGOING", "PENDING_CLOSURE", "DISPUTE"] as const;

async function assertParticipant(transactionId: number, userId: number, userEmail: string) {
  const participants = await getTransactionParticipants(transactionId);
  const emails = [participants.buyer.email, participants.seller.email];
  const ids = [participants.buyer.userId, participants.seller.userId].filter(
    (id): id is number => id !== null
  );

  if (!emails.includes(userEmail) && !ids.includes(userId)) {
    throw new GlobalError(
      "User is not a participant in this transaction",
      "FORBIDDEN",
      403,
      true
    );
  }

  return participants;
}

async function refundBuyerToWallet(
  tx: import("../generated/prisma/client.js").Prisma.TransactionClient,
  transaction: {
    id: number;
    currency: string;
    creator_email: string;
    reciever_email: string;
    creator_role: string;
  },
  refundAmount: number
) {
  const buyerEmail =
    transaction.creator_role === "CLIENT"
      ? transaction.creator_email
      : transaction.reciever_email;

  const buyer = await tx.user.findUnique({ where: { email: buyerEmail } });
  if (!buyer) {
    throw new GlobalError(
      "The buyer must have an account before escrow can be refunded",
      "BUYER_NOT_FOUND",
      409,
      true
    );
  }

  await tx.walletTransaction.create({
    data: {
      userId: buyer.id,
      amount: refundAmount,
      type: "INFLOW",
      currency: transaction.currency as any,
      description: `Refund for canceled transaction #${transaction.id}`,
    },
  });

  const balanceUpdate =
    transaction.currency === "USD"
      ? { walletBalanceUSD: { increment: refundAmount } }
      : { walletBalanceNGN: { increment: refundAmount } };

  await tx.user.update({
    where: { id: buyer.id },
    data: balanceUpdate,
  });

  return buyer;
}

async function finalizeCancel(
  transactionId: number,
  approverEmail: string | null,
  reason?: string | null
) {
  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: {
        payment: true,
        milestones: true,
        dispute: { where: { status: "ongoing" } },
      },
    });

    if (!transaction) {
      throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
    }

    if (transaction.payment?.status === "COMPLETED") {
      await refundBuyerToWallet(tx, transaction, transaction.payment.amount);
      await tx.payment.update({
        where: { id: transaction.payment.id },
        data: { status: "REFUNDED" },
      });
    }

    for (const dispute of transaction.dispute) {
      await tx.dispute.update({
        where: { id: dispute.id },
        data: { status: "cancel", resolvedAt: now },
      });
    }

    for (const milestone of transaction.milestones) {
      if (!["COMPLETED", "CANCELED"].includes(milestone.status)) {
        await tx.milestone.update({
          where: { id: milestone.id },
          data: { status: "CANCELED" },
        });
      }
    }

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: "CANCELED",
        cancel_approved_at: now,
        cancel_requested_by_email:
          transaction.cancel_requested_by_email ?? approverEmail,
        cancel_requested_at: transaction.cancel_requested_at ?? now,
        cancel_reason: reason ?? transaction.cancel_reason,
      },
      include: { payment: true, milestones: true },
    });
  });

  // Drop any pending auto-closure jobs for this transaction / its milestones
  const delayedJobs = await transactionClosureQueue.getJobs(["delayed", "waiting"]);
  await Promise.all(
    delayedJobs
      .filter((job) => job.data?.transactionId === transactionId)
      .map((job) => job.remove())
  );

  return updated;
}

/**
 * CREATED / APPROVED: either party may cancel immediately (no escrow).
 * ONGOING / PENDING_CLOSURE / DISPUTE: request cancel; counterparty must approve.
 */
export async function requestCancelTransactionService(
  transactionId: number,
  userId: number,
  userEmail: string,
  reason?: string
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  const participants = await assertParticipant(transactionId, userId, userEmail);

  if (
    UNILATERAL_CANCEL_STATUSES.includes(
      transaction.status as (typeof UNILATERAL_CANCEL_STATUSES)[number]
    )
  ) {
    const canceled = await finalizeCancel(transactionId, userEmail, reason);
    await Promise.all([
      systemDispatchNotificationByEmail(
        participants.buyer.email,
        "Transaction Canceled",
        `Transaction #${transactionId} was canceled.`
      ),
      systemDispatchNotificationByEmail(
        participants.seller.email,
        "Transaction Canceled",
        `Transaction #${transactionId} was canceled.`
      ),
    ]);
    return { transaction: canceled, pendingApproval: false };
  }

  if (
    !MUTUAL_CANCEL_STATUSES.includes(
      transaction.status as (typeof MUTUAL_CANCEL_STATUSES)[number]
    )
  ) {
    throw new GlobalError(
      `Cannot cancel a transaction in status ${transaction.status}`,
      "INVALID_STATUS",
      409,
      true
    );
  }

  if (transaction.cancel_requested_by_email) {
    throw new GlobalError(
      "A cancel request is already pending for this transaction",
      "CANCEL_ALREADY_REQUESTED",
      409,
      true
    );
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      cancel_requested_by_email: userEmail,
      cancel_requested_at: new Date(),
      cancel_reason: reason ?? null,
    },
  });

  const counterpartyEmail =
    userEmail === participants.buyer.email
      ? participants.seller.email
      : participants.buyer.email;

  await systemDispatchNotificationByEmail(
    counterpartyEmail,
    "Cancel Requested",
    `The other party requested to cancel transaction #${transactionId}. Please approve or reject.`
  );

  return { transaction: updated, pendingApproval: true };
}

export async function approveCancelTransactionService(
  transactionId: number,
  userId: number,
  userEmail: string
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  const participants = await assertParticipant(transactionId, userId, userEmail);

  if (!transaction.cancel_requested_by_email) {
    throw new GlobalError(
      "No pending cancel request for this transaction",
      "NO_CANCEL_REQUEST",
      409,
      true
    );
  }

  if (transaction.cancel_requested_by_email === userEmail) {
    throw new GlobalError(
      "The party who requested cancel cannot approve it",
      "FORBIDDEN",
      403,
      true
    );
  }

  if (
    !MUTUAL_CANCEL_STATUSES.includes(
      transaction.status as (typeof MUTUAL_CANCEL_STATUSES)[number]
    )
  ) {
    throw new GlobalError(
      `Cannot approve cancel while transaction is ${transaction.status}`,
      "INVALID_STATUS",
      409,
      true
    );
  }

  const canceled = await finalizeCancel(transactionId, userEmail);

  await Promise.all([
    systemDispatchNotificationByEmail(
      participants.buyer.email,
      "Transaction Canceled",
      `Transaction #${transactionId} was canceled by mutual agreement. Escrow has been refunded to the buyer where applicable.`
    ),
    systemDispatchNotificationByEmail(
      participants.seller.email,
      "Transaction Canceled",
      `Transaction #${transactionId} was canceled by mutual agreement.`
    ),
  ]);

  return canceled;
}

export async function rejectCancelTransactionService(
  transactionId: number,
  userId: number,
  userEmail: string
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  await assertParticipant(transactionId, userId, userEmail);

  if (!transaction.cancel_requested_by_email) {
    throw new GlobalError(
      "No pending cancel request for this transaction",
      "NO_CANCEL_REQUEST",
      409,
      true
    );
  }

  if (transaction.cancel_requested_by_email === userEmail) {
    throw new GlobalError(
      "The party who requested cancel cannot reject it",
      "FORBIDDEN",
      403,
      true
    );
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      cancel_requested_by_email: null,
      cancel_requested_at: null,
      cancel_reason: null,
    },
  });

  await systemDispatchNotificationByEmail(
    transaction.cancel_requested_by_email,
    "Cancel Request Rejected",
    `Your request to cancel transaction #${transactionId} was rejected. The transaction continues.`
  );

  return updated;
}
