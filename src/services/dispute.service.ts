import { deleteCloudinaryFiles } from "../config/cloudinary.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import prisma from "../utils/prisma.js";
import { DisputeType } from "../zod/Dispute.zod.js";
import { settleEscrowScope } from "./escrow-settlement.service.js";
import { systemDispatchNotificationByEmail } from "./notification/notification.service.js";

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
} as const;

class DisputeService {
  async createDispute(data: DisputeType, userId: number) {
    const {
      transactionId,
      milestoneId,
      reason,
      description,
      resolutionOption,
    } = data;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new GlobalError(
        "Transaction not found",
        "TRANSACTION_NOT_FOUND",
        404,
        true
      );
    }

    const isMilestoneProject =
      transaction.transactionType === "MILESTONE_BASED_PROJECT";
    let milestone = null;

    if (isMilestoneProject) {
      if (!milestoneId) {
        throw new GlobalError(
          "milestoneId is required for milestone transactions",
          "MILESTONE_REQUIRED",
          400,
          true
        );
      }

      milestone = await prisma.milestone.findUnique({
        where: { id: milestoneId },
      });

      if (!milestone || milestone.transaction_id !== transactionId) {
        throw new GlobalError(
          "Milestone does not belong to this transaction",
          "INVALID_MILESTONE",
          400,
          true
        );
      }

      if (!["ONGOING", "PENDING_CLOSURE", "DISPUTE"].includes(milestone.status)) {
        throw new GlobalError(
          "Only the active milestone can be disputed",
          "MILESTONE_NOT_ACTIVE",
          409,
          true
        );
      }
    } else if (milestoneId) {
      throw new GlobalError(
        "milestoneId is only valid for milestone transactions",
        "INVALID_MILESTONE",
        400,
        true
      );
    }

    const allowedTransactionStatuses = isMilestoneProject
      ? ["ONGOING", "PENDING_CLOSURE", "DISPUTE"]
      : ["ONGOING", "COMPLETED", "PENDING_CLOSURE", "DISPUTE"];

    if (!allowedTransactionStatuses.includes(transaction.status)) {
      throw new GlobalError(
        "Dispute cannot be created in the transaction's current state",
        "INVALID_TRANSACTION_STATUS",
        409,
        true
      );
    }

    const existingDispute = await prisma.dispute.findFirst({
      where: { transactionId, status: "ongoing" },
    });

    if (existingDispute) {
      throw new GlobalError(
        "An ongoing dispute already exists for this transaction",
        "DISPUTE_ALREADY_EXISTS",
        409,
        true
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new GlobalError("User not found", "USER_NOT_FOUND", 404, true);
    }

    const participants = await getTransactionParticipants(transactionId);
    if (
      !participants.buyer.userId ||
      !participants.seller.userId ||
      !participants.creatorId
    ) {
      throw new GlobalError(
        "Both transaction participants must have accounts before a dispute can be opened",
        "PARTICIPANT_NOT_REGISTERED",
        409,
        true
      );
    }

    if (
      participants.buyer.userId !== userId &&
      participants.seller.userId !== userId
    ) {
      throw new GlobalError(
        "User is not a participant in this transaction",
        "FORBIDDEN",
        403,
        true
      );
    }

    const elapsesAt = new Date();
    elapsesAt.setDate(elapsesAt.getDate() + 4);

    const dispute = await prisma.$transaction(async (tx) => {
      const createdDispute = await tx.dispute.create({
        data: {
          transactionId,
          milestoneId,
          reason,
          description,
          resolutionOption,
          evidenceUrl: data.evidenceUrl ?? [],
          evidenceId: data.evidenceId ?? [],
          status: "ongoing",
          elapsesAt,
          creatorId: userId,
          buyerId: participants.buyer.userId!,
          sellerId: participants.seller.userId!,
        },
        include: { milestone: true },
      });

      if (milestoneId) {
        await tx.milestone.update({
          where: { id: milestoneId },
          data: { status: "DISPUTE" },
        });
      }

      await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "DISPUTE" },
      });

      return createdDispute;
    });

    const scope = milestoneId
      ? `milestone #${milestoneId} of transaction #${transactionId}`
      : `transaction #${transactionId}`;
    await Promise.all([
      systemDispatchNotificationByEmail(
        participants.buyer.email,
        "Dispute Created",
        `A dispute has been opened regarding ${scope}.`
      ),
      systemDispatchNotificationByEmail(
        participants.seller.email,
        "Dispute Created",
        `A dispute has been opened regarding ${scope}.`
      ),
    ]);

    return dispute;
  }

  async cancelDispute(disputeId: number, userId: number) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new GlobalError("Dispute not found", "NOT_FOUND", 404, true);
    }
    if (dispute.creatorId !== userId) {
      throw new GlobalError(
        "Only the dispute creator can cancel it",
        "FORBIDDEN",
        403,
        true
      );
    }
    if (dispute.status !== "ongoing") {
      throw new GlobalError(
        "Only an ongoing dispute can be cancelled",
        "INVALID_DISPUTE_STATUS",
        409,
        true
      );
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id: disputeId },
        data: { status: "cancel" },
      });

      if (dispute.milestoneId) {
        await tx.milestone.update({
          where: { id: dispute.milestoneId },
          data: { status: "ONGOING" },
        });
      }

      await tx.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: "ONGOING" },
      });
      return updated;
    });

    if (dispute.evidenceId.length > 0) {
      try {
        await deleteCloudinaryFiles(dispute.evidenceId);
      } catch (error) {
        console.error("Error deleting cancelled dispute evidence:", error);
      }
    }

    return cancelled;
  }

  async resolveAndReleaseDispute(disputeId: number, userId: number) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: true, milestone: true },
    });

    if (!dispute) {
      throw new GlobalError("Dispute not found", "NOT_FOUND", 404, true);
    }
    if (dispute.status !== "ongoing") {
      throw new GlobalError(
        "Dispute has already been resolved or cancelled",
        "INVALID_DISPUTE_STATUS",
        409,
        true
      );
    }

    // There is currently no administrator role in the User model. The buyer is
    // therefore the only participant allowed to approve release to the seller.
    if (dispute.buyerId !== userId) {
      throw new GlobalError(
        "Only the buyer can approve release of disputed escrow",
        "FORBIDDEN",
        403,
        true
      );
    }

    const settlement = await settleEscrowScope(dispute.transactionId, {
      milestoneId: dispute.milestoneId ?? undefined,
      disputeId: dispute.id,
      resolvedById: userId,
    });

    const scope = dispute.milestoneId
      ? `milestone #${dispute.milestoneId}`
      : `transaction #${dispute.transactionId}`;
    await Promise.all([
      systemDispatchNotificationByEmail(
        dispute.transaction.creator_email,
        "Dispute Resolved",
        `The dispute for ${scope} was closed and escrow was released.`
      ),
      systemDispatchNotificationByEmail(
        dispute.transaction.reciever_email,
        "Dispute Resolved",
        `The dispute for ${scope} was closed and escrow was released.`
      ),
    ]);

    return settlement;
  }

  async getDisputeById(disputeId: number, userId: number) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        transaction: true,
        milestone: true,
        buyer: { select: publicUserSelect },
        seller: { select: publicUserSelect },
        creator: { select: publicUserSelect },
      },
    });

    if (!dispute) {
      throw new GlobalError("Dispute not found", "NOT_FOUND", 404, true);
    }
    if (![dispute.buyerId, dispute.sellerId, dispute.creatorId].includes(userId)) {
      throw new GlobalError("User cannot view this dispute", "FORBIDDEN", 403, true);
    }

    return dispute;
  }

  async getUserDisputes(userId: number) {
    return prisma.dispute.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { creatorId: userId },
        ],
      },
      include: {
        transaction: { include: { payment: true, earnings: true } },
        milestone: true,
        buyer: { select: publicUserSelect },
        seller: { select: publicUserSelect },
        creator: { select: publicUserSelect },
        resolver: { select: publicUserSelect },
        chat: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export default new DisputeService();
