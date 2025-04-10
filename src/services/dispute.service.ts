import { UpdateDisputeInput } from "../types/dispute";
import prisma from "../utils/prisma";

export async function createDisputeService(data: any) {
  try {
    const {
      userId,
      orderId,
      evidenceUrl,
      evidenceId,
      description,
      reason,
      resolutionOption,
    } = data;

    if (!userId || !orderId || !reason) {
      return { status: 400, message: "All fields are required" };
    }

    const order = await prisma.transaction.findUnique({
      where: {
        id: orderId,
      },
      include: {
        user: true,
      },
    });

    if (!order) {
      return { status: 404, message: "Order not found" };
    }

    const isCreator =
      order.creator_email === userId || order.user?.id === userId;
    const isReceiver = order.reciever_email === userId;

    if (!isCreator && !isReceiver) {
      return {
        status: 403,
        message:
          "Unauthorized: You must be either the sender or receiver of this transaction to create a dispute",
      };
    }

    const disputeData = {
      reason,
      resolutionOption,
      description,
      evidenceUrl,
      evidenceId,
      orderId,
      userId,
    };

    const dispute = await prisma.dispute.create({
      data: disputeData,
    });
    return {
      status: 201,
      data: dispute,
      message: "Dispute created successfully",
    };
  } catch (error) {
    console.error("Error creating dispute:", error);
    return { status: 500, message: "Internal server error" };
  }
}

export async function getDisputeById(disputeId: number) {
  try {
    const dispute = await prisma.dispute.findUnique({
      where: {
        id: disputeId,
      },
      include: {
        user: true,
        transaction: true,
      },
    });

    if (!dispute) {
      return { status: 404, message: "Dispute not found" };
    }

    return { status: 200, data: dispute };
  } catch (error) {
    console.error("Error fetching dispute:", error);
    return { status: 500, message: "Internal server error" };
  }
}

export async function getAllUserDisputes(userId: number) {
  try {
    const disputes = await prisma.dispute.findMany({
      where: {
        OR: [
          {
            sender_userId: userId,
          },
          {
            receiver_userId: userId,
          },
        ],
      },
      include: {
        user: true,
        transaction: true,
      },
    });

    return {
      status: 200,
      data: disputes,
      message: "Disputes fetched successfully",
    };
  } catch (error) {
    console.error("Error fetching disputes:", error);
    return { status: 500, message: "Internal server error" };
  }
}

// export async function updateDisputeStatus(input: UpdateDisputeInput, status: string, reason: string) {
//     try {
//         const { disputeId, userId, data } = input;

//         if (!disputeId || !userId || !status) {
//             return { status: 400, message: "All fields are required" };
//         }

//         const existingDispute = await prisma.dispute.findUnique({
//             where: { id: disputeId },
//             include: {
//               transaction: true
//             }
//           });

//           if (!existingDispute) {
//             throw new Error(`Dispute with ID ${disputeId} not found`);
//           }

//           if (existingDispute.sender_userId !== userId && existingDispute.receiver_userId !== userId) {
//             throw new Error('You are not authorized to update this dispute');
//           }

//           const updatedDispute = await prisma.dispute.update({
//             where: { id: disputeId },
//             data: {
//               description: data.description,
//               reason: data.reason,
//               resolutionOption: data.resolutionOption,
//               evidence: data.evidence,
//               statusId: data.statusId,
//               elapsed: new Date()
//             },
//             include: {
//               transaction: true,
//               status: true,
//               user: true,
//               receiver: true,
//               chat: true
//             }
//           });

//         return { status: 200, data: updatedDispute, message: "Dispute status updated successfully" };
//     } catch (error) {
//         console.error("Error updating dispute status:", error);
//         return { status: 500, message: "Internal server error" };

//     }
// }
