import { deleteCloudinaryFiles } from "../config/cloudinary.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";
import prisma from "../utils/prisma.js";
// import { prisma } from "../config/db.js";
import { DisputeType } from "../zod/Dispute.zod.js";

class DisputeService {
  async createDispute(data: DisputeType, userId: number) {
    const { transactionId, reason, description, resolutionOption } = data;

    const transaction = await prisma.transaction.findUnique({
      where: { id: Number(transactionId) },
    });

    const fourDaysLater = new Date();
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);

    if (!transaction) {
      throw new Error("Transaction not found");
    }


    if(transaction.status === "DISPUTE") {

      // throw new Error("Dispute already exists for this transaction");
      throw new GlobalError(
        "Dispute already exists for this transaction",
        "DISPUTE_ALREADY_EXISTS FOR THIS TRANSACTION",
        400,
        false
      );
    }

    if (
      transaction.status !== "ONGOING" &&
      transaction.status !== "COMPLETED"
    ) {
      throw new Error(
        "Dispute can only be created for ongoing or completed transactions"
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    const participants = await getTransactionParticipants(transactionId);

    if (
      !participants.buyer.userId ||
      !participants.seller.userId ||
      !participants.creatorId
    ) {
      throw new Error(
        "One or more users involved in the transaction have not signed up yet."
      );
    }

    if (
      participants.buyer.email !== user?.email &&
      participants.seller.email !== user?.email
    ) {
      throw new Error("User is not a participant in this transaction");
    }

try {

  const payload = {
            transactionId,
            reason,
            description,
            resolutionOption,
            evidenceUrl: data.evidenceUrl ?? undefined,
            evidenceId: data.evidenceId ?? undefined,
            status: data.status ?? "ongoing",
            elapsesAt: fourDaysLater,
            creatorId: userId,
            buyerId: participants?.buyer.userId,
            sellerId: participants?.seller.userId,
          }
  
   
    const dispute = await prisma.$transaction(
      [
        prisma.dispute.create({
          data: payload
        }),
        prisma.transaction.update({
          where: { id: transactionId },
          data: { status: "DISPUTE" },
        }),
      ]
    )
    return dispute;
} catch (error) {
  console.log(error)
  throw new Error(`Error creating dispute ${error}`)
}
  }

  async deleteDispute(disputeId: number) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }

    if (dispute.evidenceId && dispute.evidenceId.length > 0) {
      try {
        await deleteCloudinaryFiles(dispute.evidenceId);
      } catch (error) {
        console.error("Error deleting evidence files:", error);
      }
    }
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: dispute.transactionId },
        data: { status: "ONGOING" },
      }),
      prisma.dispute.delete({
        where: { id: disputeId },
      }),
      
    ])
  }

  async getDisputeById(disputeId: number) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }

    return dispute;
  }

  async getUserDisputes(userId: number) {
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          { buyerId: userId },
          { sellerId: userId },
          { creatorId: userId },
        ],
      },
      include: {
        transaction: true,
      },
    });


    return disputes;
  }
}

export default new DisputeService();
