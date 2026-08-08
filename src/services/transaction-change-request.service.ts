import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import prisma from "../utils/prisma.js";
import { ReviseTransactionType } from "../zod/TicketSchema.js";
import { systemDispatchNotificationByEmail } from "./notification/notification.service.js";
import { checkAndExpireAllTransactionService } from "./ticket.service.js";

async function loadTransaction(id: number) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      milestones: {
        include: {
          images: {
            select: { id: true, url: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  return transaction;
}

/**
 * Receiver requests the creator to revise commercial terms before approval.
 */
export async function requestChangesService(
  transactionId: number,
  requesterEmail: string,
  comment: string
) {
  await checkAndExpireAllTransactionService(transactionId);
  const transaction = await loadTransaction(transactionId);

  if (transaction.status === "EXPIRED") {
    throw new GlobalError("Transaction expired", "EXPIRED_TRANSACTION", 400, true);
  }

  if (transaction.status !== "CREATED") {
    throw new GlobalError(
      `Cannot request changes while transaction is ${transaction.status}`,
      "INVALID_STATUS",
      409,
      true
    );
  }

  if (transaction.reciever_email.toLowerCase() !== requesterEmail.toLowerCase()) {
    throw new GlobalError(
      "Only the transaction receiver can request changes",
      "FORBIDDEN",
      403,
      true
    );
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "CHANGES_REQUESTED",
      change_request_comment: comment,
      change_requested_at: new Date(),
      change_requested_by_email: requesterEmail,
    },
    include: {
      milestones: {
        orderBy: { sequence: "asc" },
      },
    },
  });

  await systemDispatchNotificationByEmail(
    transaction.creator_email,
    "Changes Requested",
    `The receiver requested changes on transaction "${transaction.title || transaction.transaction_description}". Comment: ${comment}`
  );

  return updated;
}

/**
 * Creator revises editable commercial fields while status is CHANGES_REQUESTED.
 * Does not resubmit for approval.
 */
export async function reviseTransactionService(
  transactionId: number,
  creatorUserId: number,
  creatorEmail: string,
  data: ReviseTransactionType
) {
  await checkAndExpireAllTransactionService(transactionId);
  const transaction = await loadTransaction(transactionId);

  if (transaction.status === "EXPIRED") {
    throw new GlobalError("Transaction expired", "EXPIRED_TRANSACTION", 400, true);
  }

  if (transaction.status !== "CHANGES_REQUESTED") {
    throw new GlobalError(
      "Transaction can only be revised while changes are requested",
      "INVALID_STATUS",
      409,
      true
    );
  }

  const isCreator =
    transaction.user_id === creatorUserId ||
    transaction.creator_email.toLowerCase() === creatorEmail.toLowerCase();

  if (!isCreator) {
    throw new GlobalError(
      "Only the transaction creator can revise this transaction",
      "FORBIDDEN",
      403,
      true
    );
  }

  if (
    data.milestones !== undefined &&
    transaction.transactionType !== "MILESTONE_BASED_PROJECT"
  ) {
    throw new GlobalError(
      "Milestones are only valid for milestone-based projects",
      "INVALID_MILESTONE",
      400,
      true
    );
  }

  if (
    transaction.transactionType === "MILESTONE_BASED_PROJECT" &&
    data.milestones !== undefined &&
    data.milestones.length === 0
  ) {
    throw new GlobalError(
      "At least one milestone is required for milestone-based projects",
      "MILESTONE_REQUIRED",
      400,
      true
    );
  }

  const effectiveDeadline = data.deadline ?? transaction.deadline;
  if (data.milestones) {
    for (const milestone of data.milestones) {
      if (milestone.deadline > effectiveDeadline) {
        throw new GlobalError(
          "Milestone deadline cannot be later than the transaction deadline",
          "INVALID_DEADLINE",
          400,
          true
        );
      }
    }
  }

  const {
    title,
    amount,
    transaction_description,
    terms,
    additional_agreement,
    deadline,
    inspection_duration,
    pay_escrow_fee,
    pay_shipping_cost,
    files,
    milestones,
  } = data;

  const updated = await prisma.$transaction(async (tx) => {
    if (milestones !== undefined) {
      await tx.milestone.deleteMany({
        where: { transaction_id: transactionId },
      });
      await tx.milestone.createMany({
        data: milestones.map((m, index) => ({
          transaction_id: transactionId,
          sequence: index + 1,
          name: m.name,
          amount: Number(m.amount),
          deadline: new Date(m.deadline),
          files: m.files && m.files.length > 0 ? m.files : [],
          status: "CREATED" as const,
        })),
      });
    }

    return tx.transaction.update({
      where: { id: transactionId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(transaction_description !== undefined
          ? { transaction_description }
          : {}),
        ...(terms !== undefined ? { terms } : {}),
        ...(additional_agreement !== undefined ? { additional_agreement } : {}),
        ...(deadline !== undefined ? { deadline: new Date(deadline) } : {}),
        ...(inspection_duration !== undefined ? { inspection_duration } : {}),
        ...(pay_escrow_fee !== undefined ? { pay_escrow_fee } : {}),
        ...(pay_shipping_cost !== undefined ? { pay_shipping_cost } : {}),
        ...(files !== undefined ? { files } : {}),
      },
      include: {
        milestones: {
          include: {
            images: {
              select: { id: true, url: true, createdAt: true },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
    });
  });

  return updated;
}

/**
 * Creator resubmits a revised transaction for receiver approval again.
 */
export async function resubmitTransactionService(
  transactionId: number,
  creatorUserId: number,
  creatorEmail: string
) {
  await checkAndExpireAllTransactionService(transactionId);
  const transaction = await loadTransaction(transactionId);

  if (transaction.status === "EXPIRED") {
    throw new GlobalError("Transaction expired", "EXPIRED_TRANSACTION", 400, true);
  }

  if (transaction.status !== "CHANGES_REQUESTED") {
    throw new GlobalError(
      "Only a transaction with requested changes can be resubmitted",
      "INVALID_STATUS",
      409,
      true
    );
  }

  const isCreator =
    transaction.user_id === creatorUserId ||
    transaction.creator_email.toLowerCase() === creatorEmail.toLowerCase();

  if (!isCreator) {
    throw new GlobalError(
      "Only the transaction creator can resubmit this transaction",
      "FORBIDDEN",
      403,
      true
    );
  }

  if (
    transaction.transactionType === "MILESTONE_BASED_PROJECT" &&
    transaction.milestones.length === 0
  ) {
    throw new GlobalError(
      "At least one milestone is required before resubmitting",
      "MILESTONE_REQUIRED",
      400,
      true
    );
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "CREATED",
      revision_count: { increment: 1 },
    },
    include: {
      milestones: {
        include: {
          images: {
            select: { id: true, url: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { sequence: "asc" },
      },
    },
  });

  await systemDispatchNotificationByEmail(
    transaction.reciever_email,
    "Transaction Resubmitted",
    `The creator revised transaction "${transaction.title || transaction.transaction_description}" and submitted it for your approval again.`
  );

  return updated;
}
