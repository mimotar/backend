import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { TransactionSchema, TransactionType } from "../zod/TicketSchema";
import { createToken } from "../utils/createToken";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { JwtPayload } from "jsonwebtoken";
import VerifyToken from "../utils/verifyToken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate";
import prisma from "../utils/prisma";
import { uploadToCloudinary } from "../config/cloudinary";
import {
  approveTransactionService,
  checkAndExpireAllTransactionService,
  createTransactionService,
  getAUserTransactionService,
  requestTokenToValidateTransactionService,
  validateTransactionOtpService,
} from "../services/ticket.service";
import { env } from "../config/env";
import { sendEmailWithTemplate } from "../services/emailService";
import { OTPGenerator } from "../utils/OTPGenerator";
import { getALlUsersService } from "../services/auth/users.service";

export const createTransactionController = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const rawFiles = req.files as Express.Multer.File[] | undefined;
    const {
      reciever_email,
      creator_email,
      receiver_fullname,
      creator_fullname,
      transaction_description,
      amount,
      inspection_duration,
      expiresAt,
    } = req.body;

    let uploadedFiles: TransactionType["files"] = [];
    const userId = (req.user as { id: number })?.id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Invalid token or user ID missing" });
    }

    if (rawFiles && rawFiles.length) {
      const uploads = await Promise.all(
        rawFiles.map(async (file) => {
          const result = await uploadToCloudinary(file);
          const { public_id } = result as any;
          return {
            fileName: file.originalname,
            fileType: file.mimetype.split("/")[0] as
              | "image"
              | "pdf"
              | "doc"
              | "other",
            fileUrl: (result as any).secure_url,
            fileId: public_id,
          };
        })
      );

      uploadedFiles = uploads;
    }

    const transactionData: TransactionType = {
      ...req.body,
      amount: Number(req.body.amount),
      inspection_duration: Number(req.body.inspection_duration),
      expiresAt: Number(req.body.expiresAt),
      files: uploadedFiles,
      user_id: userId,
    };

    const transaction = await createTransactionService(transactionData);

    const LinkJwtPayload: JwtPayload = {
      creator_email: transaction.creator_email,
      reciever_email: transaction.reciever_email,
      transaction_id: transaction.id,
    };

    const token = await createToken("3d", LinkJwtPayload);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        transactionToken: token,
        txn_link: `${env.FRONTEND_URL}/ticket/${token}`,
      },
    });

    res.status(201).json({
      message: "Transaction created successfully",
      data: transaction,
    });
    sendEmailWithTemplate(
      reciever_email,
      {
        transaction_description,
        receiver_fullname,
        amount,
        link: transaction.txn_link,
        creator_fullname,
        inspection_duration,
        expiresAt,
      },
      6
    );
    sendEmailWithTemplate(
      creator_email,
      {
        creator_fullname,
        transaction_description,
        amount,
        expiresAt,
        inspection_duration,
      },
      7
    );
    return;
  } catch (error) {
    console.error("Transaction creation error:", error);
    res.status(500).json({ message: error });
  }
};

export const approveTransactionController = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;
  const { otp } = req.body;

  try {
    // Expire transaction if necessary
    await checkAndExpireAllTransactionService(Number(id));

    // Validate OTP (throws if invalid or expired)
    await validateTransactionOtpService(Number(id), otp);

    // Approve the transaction (throws if already approved or expired)
    const approved = await approveTransactionService(Number(id));

    return res.status(200).json({
      message: "Transaction approved successfully",
      data: approved,
    });

  } catch (error: any) {
    console.error("Transaction approval error:", error);

    if (error instanceof GlobalError) {
      return res.status(error.statusCode).json({
        message: error.message,
        name: error.name,
        operational: error.operational,
      });
    }

    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};





export const validateTransactionOtpController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {  
  const { otp } = req.body;
  const { id } = req.params;
  
  try {
    const validateTransaction = await validateTransactionOtpService(
      Number(id),
      otp
    );
    if (!validateTransaction) {
      throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
    }
    res.status(200).json({
      message: "Transaction validated successfully",
      data: validateTransaction,
    });
    next();
  } catch (error) {
    console.error("Error validating OTP:", error);
    if (error instanceof GlobalError) {
      return res.status(error.statusCode).json({
        message: error.message,
        name: error.name,
        operational: error.operational,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
    
  }}


export const requestTokenToValidateTransactionController = async (req: Request, res: Response): Promise<Response | void> => {
  const id = req.params.id;
  try {

    const requestToken = await requestTokenToValidateTransactionService(
      Number(id)
    );
    if (!requestToken) {
      throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
    }
    res.status(200).json({
      message: "Token requested successfully",
      data: requestToken,
    });
  } catch (error){
    console.error("Error requesting token:", error);
    if (error instanceof GlobalError) {
      return res.status(error.statusCode).json({
        message: error.message,
        name: error.name,
        operational: error.operational,
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const getAUserTransactionsController = async (req: Request, res: Response): Promise<Response | void> => {
  const userId = (req.user as { id: number })?.id;
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!userId) {
    return res.status(401).json({ message: "Invalid token or user ID missing" });
  }
  try {
    const transactions = await getAUserTransactionService(user?.email as string);
    res.status(200).json({
      message: "Transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    console.error("Error retrieving transactions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}