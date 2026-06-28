import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import prisma from "../utils/prisma.js";

const terminalStatuses = ["COMPLETED", "CANCELED", "EXPIRED"] as const;

async function assertParticipant(transactionId: number, userId: number) {
  const participants = await getTransactionParticipants(transactionId);
  if (![participants.buyer.userId, participants.seller.userId].includes(userId)) {
    throw new GlobalError(
      "FORBIDDEN",
      "Only a transaction participant can extend a deadline",
      403,
      true
    );
  }
  return participants;
}

function assertLaterDeadline(current: Date, proposed: Date) {
  if (proposed.getTime() <= Date.now()) {
    throw new GlobalError(
      "INVALID_DEADLINE",
      "The new deadline must be in the future",
      400,
      true
    );
  }
  if (proposed.getTime() <= current.getTime()) {
    throw new GlobalError(
      "DEADLINE_NOT_EXTENDED",
      "A deadline can only be extended to a later date",
      409,
      true
    );
  }
}

export async function extendTransactionDeadlineService(
  transactionId: number,
  userId: number,
  newDeadline: Date,
  reason?: string
) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { milestones: { select: { deadline: true } } },
  });

  if (!transaction) {
    throw new GlobalError("NOT_FOUND", "Transaction not found", 404, true);
  }
  if (terminalStatuses.includes(transaction.status as any)) {
    throw new GlobalError(
      "INVALID_TRANSACTION_STATUS",
      "A finished or inactive transaction deadline cannot be extended",
      409,
      true
    );
  }

  await assertParticipant(transactionId, userId);
  assertLaterDeadline(transaction.deadline, newDeadline);

  const latestMilestoneDeadline = transaction.milestones.reduce<Date | null>(
    (latest, milestone) =>
      !latest || milestone.deadline > latest ? milestone.deadline : latest,
    null
  );
  if (latestMilestoneDeadline && newDeadline < latestMilestoneDeadline) {
    throw new GlobalError(
      "INVALID_DEADLINE",
      "Transaction deadline cannot be earlier than a milestone deadline",
      400,
      true
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transaction.updateMany({
      where: {
        id: transactionId,
        deadline: transaction.deadline,
      },
      data: { deadline: newDeadline },
    });
    if (updated.count !== 1) {
      throw new GlobalError(
        "DEADLINE_CONFLICT",
        "Transaction deadline changed while this request was being processed",
        409,
        true
      );
    }

    const extension = await tx.deadlineExtension.create({
      data: {
        transactionId,
        previousDeadline: transaction.deadline,
        newDeadline,
        reason,
        extendedById: userId,
      },
    });

    const updatedTransaction = await tx.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { milestones: true },
    });
    return { transaction: updatedTransaction, extension };
  });
}

export async function extendMilestoneDeadlineService(
  transactionId: number,
  milestoneId: number,
  userId: number,
  newDeadline: Date,
  reason?: string
) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { transaction: true },
  });

  if (!milestone || milestone.transaction_id !== transactionId) {
    throw new GlobalError(
      "INVALID_MILESTONE",
      "Milestone does not belong to this transaction",
      404,
      true
    );
  }
  if (milestone.transaction.transactionType !== "MILESTONE_BASED_PROJECT") {
    throw new GlobalError(
      "NOT_A_PROJECT",
      "Milestone deadlines only apply to milestone-based projects",
      400,
      true
    );
  }
  if (terminalStatuses.includes(milestone.transaction.status as any)) {
    throw new GlobalError(
      "INVALID_TRANSACTION_STATUS",
      "A finished or inactive transaction deadline cannot be extended",
      409,
      true
    );
  }
  if (milestone.status === "COMPLETED") {
    throw new GlobalError(
      "MILESTONE_COMPLETED",
      "A completed milestone deadline cannot be extended",
      409,
      true
    );
  }

  await assertParticipant(transactionId, userId);
  assertLaterDeadline(milestone.deadline, newDeadline);

  if (
    newDeadline > milestone.transaction.deadline
  ) {
    throw new GlobalError(
      "PROJECT_DEADLINE_EXCEEDED",
      "Extend the transaction deadline before extending a milestone beyond it",
      400,
      true
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.milestone.updateMany({
      where: { id: milestoneId, deadline: milestone.deadline },
      data: { deadline: newDeadline },
    });
    if (updated.count !== 1) {
      throw new GlobalError(
        "DEADLINE_CONFLICT",
        "Milestone deadline changed while this request was being processed",
        409,
        true
      );
    }

    const extension = await tx.deadlineExtension.create({
      data: {
        transactionId,
        milestoneId,
        previousDeadline: milestone.deadline,
        newDeadline,
        reason,
        extendedById: userId,
      },
    });
    const updatedMilestone = await tx.milestone.findUniqueOrThrow({
      where: { id: milestoneId },
    });
    return { milestone: updatedMilestone, extension };
  });
}
