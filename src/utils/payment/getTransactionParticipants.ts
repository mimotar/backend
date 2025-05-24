import { prisma } from "../../config/db";

interface ParticipantDetails {
  fullname: string;
  email: string;
  phonenumber: string;
  address: string | null;
}

interface TransactionParticipants {
  buyer: ParticipantDetails;
  seller: ParticipantDetails;
}

export async function getTransactionParticipants(transactionId: number): Promise<TransactionParticipants> {
  // Fetch transaction from database
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId
    },
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

  console.log("Transaction ID", transactionId);

  const creatorDetails: ParticipantDetails = {
    fullname: transaction.creator_fullname,
    email: transaction.creator_email,
    phonenumber: transaction.creator_no,
    address: transaction.creator_address
  };

  const receiverDetails: ParticipantDetails = {
    fullname: transaction.receiver_fullname,
    email: transaction.reciever_email,
    phonenumber: transaction.receiver_no,
    address: transaction.receiver_address
  };

  if (transaction.creator_role === 'BUYER') {
    return {
      buyer: creatorDetails,
      seller: receiverDetails
    };
  } else {
    // creator_role is 'SELLER'
    return {
      buyer: receiverDetails,
      seller: creatorDetails
    };
  }
}

