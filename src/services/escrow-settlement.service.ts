import type { Prisma } from "../generated/prisma/client.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import prisma from "../utils/prisma.js";
import {
  calculateEscrowPayment,
  EscrowFeePayer,
} from "../utils/payment/calculateAmountToPay.js";

type TransactionClient = Prisma.TransactionClient;

interface SettlementOptions {
  milestoneId?: number;
  disputeId?: number;
  resolvedById?: number;
}

async function creditSellerOnce(
  tx: TransactionClient,
  transaction: {
    id: number;
    amount: number;
    creator_role: string;
    creator_email: string;
    reciever_email: string;
    pay_escrow_fee: string;
    currency: string;
  },
  grossAmount: number,
  releaseKey: string,
  milestoneId?: number
) {
  const existingRelease = await tx.earnings.findUnique({
    where: { releaseKey },
  });

  if (existingRelease) {
    return existingRelease;
  }

  const sellerEmail =
    transaction.creator_role === "FREELANCER"
      ? transaction.creator_email
      : transaction.reciever_email;
  const seller = await tx.user.findUnique({ where: { email: sellerEmail } });

  if (!seller) {
    throw new GlobalError(
      "The seller must have an account before escrow can be released",
      "SELLER_NOT_FOUND",
      409,
      true
    );
  }

  const { sellerCommissionShare } = calculateEscrowPayment(
    grossAmount,
    transaction.pay_escrow_fee as EscrowFeePayer
  );
  const payoutAmount = grossAmount - sellerCommissionShare;

  const earning = await tx.earnings.create({
    data: {
      userId: seller.id,
      amount: payoutAmount,
      status: "PENDING",
      transaction_id: transaction.id,
      milestone_id: milestoneId,
      releaseKey,
      description: milestoneId
        ? `Earnings from milestone #${milestoneId}`
        : `Earnings from completed transaction #${transaction.id}`,
    },
  });

  await tx.walletTransaction.create({
    data: {
      userId: seller.id,
      amount: payoutAmount,
      type: "INFLOW",
      currency: transaction.currency as any,
      description: milestoneId
        ? `Payout for milestone #${milestoneId} on transaction #${transaction.id}`
        : `Payout for transaction #${transaction.id}`,
    },
  });

  const balanceUpdate =
    transaction.currency === "USD"
      ? {
          walletBalanceUSD: { increment: payoutAmount },
          totalEarningsUSD: { increment: payoutAmount },
        }
      : {
          walletBalanceNGN: { increment: payoutAmount },
          totalEarningsNGN: { increment: payoutAmount },
        };

  await tx.user.update({
    where: { id: seller.id },
    data: balanceUpdate,
  });

  return earning;
}

/**
 * Releases one escrow scope exactly once. For milestone projects it completes
 * the current milestone and activates the next one; otherwise it completes the
 * whole transaction. All balance and lifecycle writes share one DB transaction.
 */
export async function settleEscrowScope(
  transactionId: number,
  options: SettlementOptions = {}
) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new GlobalError(
        "Transaction not found",
        "NOT_FOUND",
        404,
        true
      );
    }

    if (
      transaction.transactionType === "MILESTONE_BASED_PROJECT" &&
      options.milestoneId === undefined
    ) {
      throw new GlobalError(
        "milestoneId is required when settling a milestone project",
        "MILESTONE_REQUIRED",
        400,
        true
      );
    }
    if (
      transaction.transactionType !== "MILESTONE_BASED_PROJECT" &&
      options.milestoneId !== undefined
    ) {
      throw new GlobalError(
        "This transaction does not use milestones",
        "INVALID_MILESTONE",
        400,
        true
      );
    }

    const settleableTransactionStatuses = ["PENDING_CLOSURE", "DISPUTE"] as const;
    if (
      !settleableTransactionStatuses.includes(
        transaction.status as (typeof settleableTransactionStatuses)[number]
      )
    ) {
      throw new GlobalError(
        `Cannot settle escrow while transaction is ${transaction.status}`,
        "INVALID_TRANSACTION_STATUS",
        409,
        true
      );
    }

    if (options.disputeId !== undefined) {
      const dispute = await tx.dispute.findUnique({
        where: { id: options.disputeId },
      });
      if (
        !dispute ||
        dispute.transactionId !== transactionId ||
        dispute.milestoneId !== (options.milestoneId ?? null) ||
        dispute.status !== "ongoing"
      ) {
        throw new GlobalError(
          "Dispute does not match the escrow scope or is no longer ongoing",
          "INVALID_DISPUTE",
          409,
          true
        );
      }
    }

    const now = new Date();
    let milestone = null;
    let nextMilestone = null;

    if (options.milestoneId !== undefined) {
      milestone = await tx.milestone.findUnique({
        where: { id: options.milestoneId },
      });

      if (!milestone || milestone.transaction_id !== transactionId) {
        throw new GlobalError(
          "Milestone does not belong to this transaction",
          "INVALID_MILESTONE",
          400,
          true
        );
      }
      if (!["PENDING_CLOSURE", "DISPUTE"].includes(milestone.status)) {
        throw new GlobalError(
          "Milestone is not ready for settlement",
          "INVALID_MILESTONE_STATUS",
          409,
          true
        );
      }

      await creditSellerOnce(
        tx,
        transaction,
        milestone.amount,
        `milestone:${milestone.id}`,
        milestone.id
      );

      milestone = await tx.milestone.update({
        where: { id: milestone.id },
        data: {
          status: "COMPLETED",
          completedAt: milestone.completedAt ?? now,
          releasedAt: milestone.releasedAt ?? now,
        },
      });

      nextMilestone = await tx.milestone.findFirst({
        where: {
          transaction_id: transactionId,
          sequence: { gt: milestone.sequence },
          status: { not: "COMPLETED" },
        },
        orderBy: { sequence: "asc" },
      });

      if (nextMilestone) {
        nextMilestone = await tx.milestone.update({
          where: { id: nextMilestone.id },
          data: {
            status: "ONGOING",
            activatedAt: nextMilestone.activatedAt ?? now,
          },
        });
      }
    } else {
      await creditSellerOnce(
        tx,
        transaction,
        transaction.amount,
        `transaction:${transaction.id}`
      );
    }

    if (options.disputeId !== undefined) {
      await tx.dispute.update({
        where: { id: options.disputeId },
        data: {
          status: "closed",
          resolution: "RELEASE_TO_SELLER",
          resolvedAt: now,
          resolvedById: options.resolvedById,
        },
      });
    }

    const completed = options.milestoneId === undefined || !nextMilestone;
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: completed ? "COMPLETED" : "ONGOING",
        transaction_completed_at: completed
          ? transaction.transaction_completed_at ?? now
          : null,
        inspection_started_at: completed
          ? transaction.inspection_started_at
          : now,
        inspection_completed_at: completed ? now : null,
      },
    });

    return {
      transaction: updatedTransaction,
      milestone,
      nextMilestone,
    };
  });
}
