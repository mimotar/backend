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
import { systemDispatchNotificationByEmail } from "./notification/notification.service.js";
import { settleEscrowScope } from "./escrow-settlement.service.js";
import { getTransactionParticipants } from "../utils/payment/getTransactionParticipants.js";


// export const createTransactionService = async (data: TransactionType) => {
//   const { files, expiresAt, creator_email, reciever_email, milestones, ...rest } = data;

//   const parseDayToExpireToDate = convertDayToExpireDate(expiresAt);

//   const transaction = await prisma.$transaction(async (tx) => {
//     const createdTxn = await tx.transaction.create({
//       data: {
//         ...rest,
//         user_id: rest.user_id ?? null,
//         creator_email,
//         reciever_email,
//         expiresAt: new Date(parseDayToExpireToDate),
//         files: files?.length ? files : undefined,
//         transactionToken: "",
//         txn_link: "",
//       },
//     });

//     if (rest.transactionType === "MILESTONE_BASED_PROJECT" && milestones && milestones.length > 0) {
//       await tx.milestone.createMany({
//         data: milestones.map((m) => ({
//           transaction_id: createdTxn.id,
//           name: m.name,
//           amount: m.amount,
//           deadline: new Date(m.deadline),
//           files: m.files?.length ? m.files : undefined,
//           status: "CREATED",
//         })),
//       });
//     }

//     return createdTxn;
//   });

//   const LinkJwtPayload: JwtPayload = {
//     creator_email,
//     reciever_email,
//     transaction_id: transaction.id,
//   };

//   const frontendUrl = `${env.FRONTEND_URL}/approve-transaction`;
//   const expiresIn = expiresAt * 24 * 60 * 60 * 1000;
//   const transactionToken = await createToken(expiresIn, LinkJwtPayload);

//   return await prisma.transaction.update({
//     where: { id: transaction.id },
//     data: {
//       transactionToken,
//       txn_link: `${frontendUrl}/${transactionToken}`,
//     },
//     include: {
//       milestones: true,
//     },
//   });
// };

export const createTransactionService = async (data: TransactionType) => {
  const { files, expiresAt, creator_email, reciever_email, milestones, ...rest } = data;

  const parseDayToExpireToDate = convertDayToExpireDate(expiresAt);

  const transaction = await prisma.$transaction(async (tx) => {
    const createdTxn = await tx.transaction.create({
      data: {
        ...rest,
        user_id: rest.user_id ?? null,
        creator_email,
        reciever_email,
        expiresAt: new Date(parseDayToExpireToDate),
        // Ensure files are passed as an array or set to undefined
        files: files && files.length > 0 ? files : undefined,
        transactionToken: "",
        txn_link: "",
      },
    });

    if (rest.transactionType === "MILESTONE_BASED_PROJECT" && milestones && milestones.length > 0) {

      // FIX: Ensure milestones is an array. If it came as a JSON string from form-data, parse it.
      const milestonesArray = typeof milestones === 'string' ? JSON.parse(milestones) : milestones;

      await tx.milestone.createMany({
        data: milestonesArray.map((m: any, index: number) => ({
          transaction_id: createdTxn.id,
          sequence: index + 1,
          name: m.name,
          amount: Number(m.amount), // FIX: form-data passes numbers as strings. Force convert to Number.
          deadline: new Date(m.deadline),
          // FIX: Handle files array inside milestone carefully based on your schema (Json or string[])
          files: m.files && m.files.length > 0 ? m.files : [],
          status: "CREATED",
        })),
      });
    }

    return createdTxn;
  });

  const LinkJwtPayload: JwtPayload = {
    creator_email,
    reciever_email,
    transaction_id: transaction.id,
  };

  const frontendUrl = `${env.FRONTEND_URL}/approve-transaction`;
  const expiresIn = Number(expiresAt) * 24 * 60 * 60 * 1000;
  const transactionToken = await createToken(expiresIn, LinkJwtPayload);

  return await prisma.transaction.update({
    where: { id: transaction.id },
    data: {
      transactionToken,
      txn_link: `${frontendUrl}/${transactionToken}`,
    },
    include: {
      milestones: true,
    },
  });
};
export const getTransactionByIdService = async (id: number) => {
  try {
    const transaction = await prisma.transaction.findUnique({
    where: {
      id,
    },
    include: {
      milestones: true,
    },
  });

  if (!transaction) {
    throw new Error("Transaction not found");
  }
  const {otp,otp_created_at, ...rest} = transaction;

  return {
    ...rest,
    history: {
      transaction_created_at: transaction.created_at,
      agreement_accepted_at: transaction.agreement_accepted_at,
      payment_sent_to_escrow_at: transaction.payment_sent_to_escrow_at,
      inspection_started_at: transaction.inspection_started_at,
      inspection_completed_at: transaction.inspection_completed_at,
      transaction_completed_at: transaction.transaction_completed_at,
    },
  };
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
      agreement_accepted_at: new Date(),
    },
  });

  await systemDispatchNotificationByEmail(
    transaction.creator_email,
    "Transaction Approved",
    `Your transaction "${transaction.transaction_description}" has been approved by the counterparty.`
  );

  return updatedTransaction;
};

export const rejectTransactionService = async (id: number, rejection_reason: string) => {
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
      rejection_reason,
    },
  });

  await systemDispatchNotificationByEmail(
    transaction.creator_email,
    "Transaction Rejected",
    `Your transaction "${transaction.transaction_description}" has been rejected by the counterparty.`
  );

  return updatedTransaction;
}

export const updateTicketToOngoing = async (id: number) => {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { milestones: { orderBy: { sequence: "asc" } } },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const now = new Date();
    const updatedTransaction = await tx.transaction.update({
      where: { id },
      data: {
        status: "ONGOING",
        payment_sent_to_escrow_at: now,
        inspection_started_at: now,
      },
    });

    if (
      transaction.transactionType === "MILESTONE_BASED_PROJECT" &&
      transaction.milestones.length > 0
    ) {
      const [firstMilestone] = transaction.milestones;
      await tx.milestone.update({
        where: { id: firstMilestone.id },
        data: { status: "ONGOING", activatedAt: now },
      });
    }

    return updatedTransaction;
  });
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
      title: true,
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
      agreement_accepted_at: true,
      payment_sent_to_escrow_at: true,
      inspection_started_at: true,
      inspection_completed_at: true,
      transaction_completed_at: true,
      milestones: true,
    },
    orderBy: {
      created_at: 'desc'
    }
  });

  return transactions.map((transaction) => {
    const {
      agreement_accepted_at,
      payment_sent_to_escrow_at,
      inspection_started_at,
      inspection_completed_at,
      transaction_completed_at,
      ...rest
    } = transaction;

    return {
      ...rest,
      history: {
        transaction_created_at: transaction.created_at,
        agreement_accepted_at,
        payment_sent_to_escrow_at,
        inspection_started_at,
        inspection_completed_at,
        transaction_completed_at,
      },
    };
  });
};
export const closeATransactionService = async (userId: number, transactionId: number) => {
  const result = await settleEscrowScope(transactionId);
  return result.transaction;
}

export const resolveTransactionService = async (
  transactionId: number,
  initiatorEmail: string,
  milestoneId?: number
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { milestones: true },
  });
  
  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "ONGOING" && transaction.status !== "DISPUTE") throw new GlobalError("InvalidStatusError", "Transaction is neither ongoing nor dispute", 400, true);
  if (
    transaction.creator_email !== initiatorEmail &&
    transaction.reciever_email !== initiatorEmail
  ) {
    throw new GlobalError("User is not a participant in this transaction", "FORBIDDEN", 403, true);
  }

  if (transaction.transactionType === "MILESTONE_BASED_PROJECT") {
    if (!milestoneId) {
      throw new GlobalError("milestoneId is required for milestone projects", "MILESTONE_REQUIRED", 400, true);
    }
    const milestone = transaction.milestones.find((item) => item.id === milestoneId);
    if (!milestone || !["ONGOING", "DISPUTE"].includes(milestone.status)) {
      throw new GlobalError("Only the active milestone can be resolved", "INVALID_MILESTONE", 400, true);
    }
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { status: "PENDING_CLOSURE" },
    });
  } else if (milestoneId) {
    throw new GlobalError("This transaction does not use milestones", "INVALID_MILESTONE", 400, true);
  }

  // Identify who is who
  const isCreatorInitiator = transaction.creator_email === initiatorEmail;
  const counterpartyEmail = isCreatorInitiator ? transaction.reciever_email : transaction.creator_email;
  const initiatorName = isCreatorInitiator ? transaction.creator_fullname : transaction.receiver_fullname;
  const counterpartyName = isCreatorInitiator ? transaction.receiver_fullname : transaction.creator_fullname;

  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: "PENDING_CLOSURE",
      inspection_completed_at: new Date(),
    },
  });

  // Delay for 24h
  await transactionClosureQueue.add(
    milestoneId ? `closure-${transactionId}-milestone-${milestoneId}` : `closure-${transactionId}`,
    { transactionId, milestoneId },
    {
      delay: 24 * 60 * 60 * 1000,
      jobId: milestoneId ? `closure-${transactionId}-milestone-${milestoneId}` : `closure-${transactionId}`,
    }
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

export const acceptResolutionService = async (
  transactionId: number,
  userId: number,
  milestoneId?: number
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "PENDING_CLOSURE") throw new GlobalError("Transaction is not pending closure", "InvalidStatusError", 400, true);
  if (transaction.transactionType === "MILESTONE_BASED_PROJECT" && !milestoneId) {
    throw new GlobalError("milestoneId is required for milestone projects", "MILESTONE_REQUIRED", 400, true);
  }
  if (transaction.transactionType !== "MILESTONE_BASED_PROJECT" && milestoneId) {
    throw new GlobalError("This transaction does not use milestones", "INVALID_MILESTONE", 400, true);
  }

  const participants = await getTransactionParticipants(transactionId);
  if (participants.buyer.userId !== userId) {
    throw new GlobalError("Only the buyer can approve escrow release", "FORBIDDEN", 403, true);
  }

  const result = await settleEscrowScope(transactionId, { milestoneId });

  // Remove scheduled job
  await transactionClosureQueue.remove(
    milestoneId ? `closure-${transactionId}-milestone-${milestoneId}` : `closure-${transactionId}`
  );

  if (result.transaction.status === "COMPLETED") {
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
  } else if (milestoneId) {
    await Promise.all([
      systemDispatchNotificationByEmail(
        transaction.creator_email,
        "Milestone Completed",
        `Milestone #${milestoneId} was completed and the next milestone is now active.`
      ),
      systemDispatchNotificationByEmail(
        transaction.reciever_email,
        "Milestone Completed",
        `Milestone #${milestoneId} was completed and the next milestone is now active.`
      ),
    ]);
  }

  return result;
};

export const rejectResolutionService = async (
  transactionId: number,
  userId: number,
  milestoneId?: number
) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
  });

  if (!transaction) throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  if (transaction.status !== "PENDING_CLOSURE") throw new GlobalError("Transaction is not pending closure", "InvalidStatusError", 400, true);
  if (transaction.transactionType === "MILESTONE_BASED_PROJECT" && !milestoneId) {
    throw new GlobalError("milestoneId is required for milestone projects", "MILESTONE_REQUIRED", 400, true);
  }
  const participants = await getTransactionParticipants(transactionId);
  if (![participants.buyer.userId, participants.seller.userId].includes(userId)) {
    throw new GlobalError("User is not a participant in this transaction", "FORBIDDEN", 403, true);
  }

  const updatedTransaction = await prisma.$transaction(async (tx) => {
    if (milestoneId) {
      const milestone = await tx.milestone.findUnique({ where: { id: milestoneId } });
      if (!milestone || milestone.transaction_id !== transactionId) {
        throw new GlobalError("Milestone does not belong to this transaction", "INVALID_MILESTONE", 400, true);
      }
      await tx.milestone.update({
        where: { id: milestoneId },
        data: { status: "DISPUTE" },
      });
    }
    return tx.transaction.update({
      where: { id: transactionId },
      data: { status: "DISPUTE" },
    });
  });

  // Remove scheduled job
  await transactionClosureQueue.remove(
    milestoneId ? `closure-${transactionId}-milestone-${milestoneId}` : `closure-${transactionId}`
  );

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
