import { TransactionType } from "./../zod/TicketSchema.js";
import { prisma } from "../config/db.js";
import { JwtPayload } from "jsonwebtoken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate.js";
import { createToken } from "../utils/createToken.js";
import { env } from "../config/env.js";
import { sendEmailWithTemplate } from "./emailService.js";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { generateSixDigitString } from "../utils/OTPGenerator.js";

import { transactionClosureQueue } from "../config/bullmq.js";
import { sendEmail } from "./emailService.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";


export const createTransactionService = async (data: TransactionType) => {
  const { files, expiresAt, creator_email, reciever_email, ...rest } = data;
  const LinkJwtPayload: JwtPayload = {
    creator_email,
    reciever_email,
  };

  const frontendUrl = `${env.FRONTEND_URL}/approve-transaction`;
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
      txn_link: `${frontendUrl}/${transactionToken}`,
    },
  });
};

export const getTransactionByIdService = async (id: number) => {
  try {
    const transaction = await prisma.transaction.findUnique({
    where: {
      id,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }
  const {otp,otp_created_at, ...rest} = transaction;

  return rest;
  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw new GlobalError("Error fetching transaction", "Error", 404, true);
    
  }
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

export const rejectTransactionService = async (id: number) => {
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
      status: "REJECTED",
    },
  });
  return updatedTransaction;
}


export const requestTokenToValidateTransactionService = async (id: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
  })
  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);

  }
  if (transaction.status === "EXPIRED") {
    throw new Error("Transaction expired");
  }
  const otp =  generateSixDigitString();
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
      status: true,
      creator_address: true,
      creator_fullname: true,
      currency: true,
      dispute: true,
      payment: true,
      earnings: true,
      inspection_duration: true,
      reciever_role: true,
      terms: true,
      transactionType: true,
      pay_escrow_fee: true,
      pay_shipping_cost: true,
      creator_role: true,
      receiver_address: true,
      receiver_no: true,
      expiresAt: true,
      link_expires: true,
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return transactions;
};

export const closeATransactionService = async (userId: number, transactionId: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  if (!transaction) {
    throw new Error("Transaction not found");
  }
  
  
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: "COMPLETED" },
  });
  if (!updatedTransaction) {
    throw new Error("Failed to close transaction");
  }
  return updatedTransaction;
}

export const resolveTransactionService = async (transactionId: number, initiatorEmail: string) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });
  
  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "ONGOING") throw new GlobalError("Transaction is not ongoing", "InvalidStatusError", 400, true);

  // Identify who is who
  const isCreatorInitiator = transaction.creator_email === initiatorEmail;
  const counterpartyEmail = isCreatorInitiator ? transaction.reciever_email : transaction.creator_email;
  const initiatorName = isCreatorInitiator ? transaction.creator_fullname : transaction.receiver_fullname;
  const counterpartyName = isCreatorInitiator ? transaction.receiver_fullname : transaction.creator_fullname;

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: "PENDING_CLOSURE" },
  });

  // Delay for 24h
  await transactionClosureQueue.add(
    `closure-${transactionId}`,
    { transactionId },
    { delay: 24 * 60 * 60 * 1000, jobId: `closure-${transactionId}` }
  );

  // Send Emails
  await sendEmail(initiatorEmail, EmailType.TRANSACTION_PENDING_CLOSURE_INITIATOR, {
    name: initiatorName,
    transactionId: transaction.transactionToken,
  });

  await sendEmail(counterpartyEmail, EmailType.TRANSACTION_PENDING_CLOSURE_COUNTERPARTY, {
    name: counterpartyName,
    transactionId: transaction.transactionToken,
  });

  return updatedTransaction;
};

export const acceptResolutionService = async (transactionId: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "PENDING_CLOSURE") throw new GlobalError("Transaction is not pending closure", "InvalidStatusError", 400, true);

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: "COMPLETED" },
  });

  // Remove scheduled job
  await transactionClosureQueue.remove(`closure-${transactionId}`);

  // Send emails
  await sendEmail(transaction.creator_email, EmailType.TRANSACTION_COMPLETED, {
    name: transaction.creator_fullname,
    transactionId: transaction.transactionToken,
    autoCompleted: false,
  });
  await sendEmail(transaction.reciever_email, EmailType.TRANSACTION_COMPLETED, {
    name: transaction.receiver_fullname,
    transactionId: transaction.transactionToken,
    autoCompleted: false,
  });

  return updatedTransaction;
};

export const rejectResolutionService = async (transactionId: number) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "PENDING_CLOSURE") throw new GlobalError("Transaction is not pending closure", "InvalidStatusError", 400, true);

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: "DISPUTE" },
  });

  // Remove scheduled job
  await transactionClosureQueue.remove(`closure-${transactionId}`);

  // Send emails
  await sendEmail(transaction.creator_email, EmailType.TRANSACTION_DISPUTED, {
    name: transaction.creator_fullname,
    transactionId: transaction.transactionToken,
  });
  await sendEmail(transaction.reciever_email, EmailType.TRANSACTION_DISPUTED, {
    name: transaction.receiver_fullname,
    transactionId: transaction.transactionToken,
  });

  return updatedTransaction;
};