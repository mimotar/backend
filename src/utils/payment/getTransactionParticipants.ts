import { prisma } from "../../config/db";

interface ParticipantDetails {
  fullname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  userId: number | null; // 👈 Added
}

interface TransactionParticipants {
  buyer: ParticipantDetails;
  seller: ParticipantDetails;
  creatorId: number | null; // 👈 Added for dispute creator
}

export async function getTransactionParticipants(transactionId: number): Promise<TransactionParticipants> {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId },
    select: {
      creator_fullname: true,
      creator_email: true,
      creator_no: true,
      creator_address: true,
      receiver_fullname: true,
      reciever_email: true,
      receiver_no: true,
      receiver_address: true,
      creator_role: true
    }
  });

  if (!transaction) {
    throw new Error(`Transaction with ID ${transactionId} not found`);
  }

  // Try to find users by their email (they may or may not exist)
  const [creatorUser, receiverUser] = await Promise.all([
    prisma.user.findUnique({ where: { email: transaction.creator_email } }),
    prisma.user.findUnique({ where: { email: transaction.reciever_email } }),
  ]);

  const creatorDetails: ParticipantDetails = {
    fullname: transaction.creator_fullname,
    email: transaction.creator_email,
    phonenumber: transaction.creator_no,
    address: transaction.creator_address,
    userId: creatorUser?.id ?? null,
  };

  const receiverDetails: ParticipantDetails = {
    fullname: transaction.receiver_fullname,
    email: transaction.reciever_email,
    phonenumber: transaction.receiver_no,
    address: transaction.receiver_address,
    userId: receiverUser?.id ?? null,
  };

  const participants =
    transaction.creator_role === 'BUYER'
      ? {
          buyer: creatorDetails,
          seller: receiverDetails,
        }
      : {
          buyer: receiverDetails,
          seller: creatorDetails,
        };

  return {
    ...participants,
    creatorId: creatorUser?.id ?? null,
  };
}
