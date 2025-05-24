import { TransactionType } from "./../zod/TicketSchema";
import { prisma } from "../config/db";
import { JwtPayload } from "jsonwebtoken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate";
import { createToken } from "../utils/createToken";
import { env } from "../config/env";
import { sendEmailWithTemplate } from "./emailService";
import { OTPGenerator } from "../utils/OTPGenerator";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";

export const createTransactionService = async (data: TransactionType) => {
  const { files, expiresAt, creator_email, reciever_email, ...rest } = data;
  const LinkJwtPayload: JwtPayload = {
    creator_email,
    reciever_email,
  };

  const frontendUrl = env.FRONTEND_URL;
  const parseDayToExpireToDate = convertDayToExpireDate(expiresAt);
  const expiresIn = expiresAt * 24 * 60 * 60 * 1000;
  const transactionToken = await createToken(expiresIn, LinkJwtPayload);

  return await prisma.transaction.create({
    data: {
      ...rest,
      user_id: rest.user_id ?? null,
      creator_email,
      reciever_email,
      expiresAt: new Date(parseDayToExpireToDate),
      files: files?.length ? JSON.stringify(files) : undefined,
      transactionToken: "",
      txn_link: ``,
    },
  });
};

export const getTransactionByIdService = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      receiver_fullname: true,
      reciever_email: true,
      status: true,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }
  return transaction;
};

export const checkAndExpireAllTransactionService = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({ where: { id } });

  if (
    transaction &&
    transaction.status === "CREATED" &&
    new Date() > transaction.expiresAt
  ) {
    await prisma.transaction.update({
      where: { id },
      data: { status: "EXPIRED" },
    });

    transaction.status = "EXPIRED";
  }
};

export const approveTransactionService = async (id: number) => {
  await checkAndExpireAllTransactionService(id);

  const transaction = await getTransactionByIdService(id);
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  if (transaction.status === "APPROVED") {
    throw new Error("Transaction already approved");
  }
  if (transaction.status === "EXPIRED") {
    throw new Error("Transaction expired");
  }
  const updatedTransaction = await prisma.transaction.update({
    where: {
      id,
    },
    data: {
      status: "APPROVED",
    },
  });
  return updatedTransaction;
};



export const requestTokenToValidateTransactionService = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  })
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  if (transaction.status === "EXPIRED") {
    throw new Error("Transaction expired");
  }
  const otp =  OTPGenerator();
  const updatedTransaction = await prisma.transaction.update({
    where: {
      id,
    },
    data: {
      otp: otp,
      otp_created_at: new Date(),
    },
  });
  if (!updatedTransaction) {
    throw new Error("Failed to update transaction");
  }
  await sendEmailWithTemplate(transaction.reciever_email, {otp, firstName: transaction.receiver_fullname},8)
  return updatedTransaction;
}

export const validateTransactionOtpService = async (id: number, otp: string) => {
  const transaction = await prisma.transaction.findUnique({ where: { id } });

  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  const now = new Date();
  const otpCreated = transaction.otp_created_at;

  if (!otpCreated || now.getTime() - otpCreated.getTime() > 60 * 1000) {
    throw new GlobalError("OTP expired", "OtpExpiredError", 400, true);
  }

  if (transaction.otp !== otp) {
    throw new GlobalError("Invalid OTP", "InvalidOtpError", 400, true);
  }

  return transaction;
};

export const deleteTransactionService = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  });
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  
  const deletedTransaction = await prisma.transaction.delete({
    where: { id },
  });
  if (!deletedTransaction) {
    throw new Error("Failed to delete transaction");
  }
  return deletedTransaction;
}

export const deleteAllTransactionService = async () => {
  const transactions = await prisma.transaction.findMany();
  if (!transactions) {
    throw new Error("No transactions found");
  }
  const deletedTransactions = await prisma.transaction.deleteMany();
  if (!deletedTransactions) {
    throw new Error("Failed to delete transactions");
  } 
  return deletedTransactions;
}




export const getAUserTransactionService = async (userEmail: string) => {
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { creator_email: userEmail },
        { reciever_email: userEmail }
      ]
    },
    select: {
      id: true,
      receiver_fullname: true,
      reciever_email: true,
      creator_email: true,
      created_at: true,
      transactionToken: true,
      txn_link: true,
      amount: true,
      transaction_description: true,
      files: true,
      status: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return transactions;
};

