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
import { createTransactionService } from "../services/ticket.service";
import { env } from "../config/env";
import { sendEmailWithTemplate } from "../services/emailService";




export const createTransactionController = async (req: Request, res: Response): Promise<Response | void> => {
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
      expiresAt
    } = req.body

    let uploadedFiles: TransactionType["files"] = [];
    const userId = (req.user as { id: number })?.id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid token or user ID missing" });
    }


    if (rawFiles && rawFiles.length) {
      const uploads = await Promise.all(
        rawFiles.map(async (file) => {
          const result = await uploadToCloudinary(file);
          const { public_id } = result as any;
          return {
            fileName: file.originalname,
            fileType: file.mimetype.split("/")[0] as "image" | "pdf" | "doc" | "other",
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
      user_id: userId
    };

    const transaction = await createTransactionService(transactionData);

     res.status(201).json({
      message: "Transaction created successfully",
      data: transaction,
    });
    sendEmailWithTemplate(reciever_email, {
      transaction_description, receiver_fullname, amount, link: transaction.txn_link, creator_fullname, inspection_duration, expiresAt
    },6);
    sendEmailWithTemplate(creator_email, {creator_fullname, transaction_description, amount, expiresAt, inspection_duration}, 7)
    return
  } catch (error) {
    console.error("Transaction creation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




export class Ticket {
  constructor(private readonly prisma: PrismaClient) {}
  async GenerateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const userId = req.user as number;
      const payload: TransactionType = {
        amount: data.amount,
        transaction_description: data.transaction_description,
        user_id: userId,
        pay_escrow_fee: data.pay_escrow_fee,
        additional_agreement: data.additional_agreement,
        pay_shipping_cost: data.pay_shipping_cost,
        creator_fullname: data.creator_fullname,
        creator_email: data.creator_email,
        creator_no: data.creator_no,
        creator_address: data.creator_address,
        creator_role: data.creator_role,
        receiver_fullname: data.receiver_fullname,
        reciever_email: data.reciever_email,
        receiver_no: data.receiver_no,
        receiver_address: data.receiver_address,
        reciever_role: data.reciever_role,
        terms: data.terms,
        transactionType: data.transactionType,
        expiresAt: data.expiresAt,
        inspection_duration: data.inspection_duration,
        files: data.files ?? [], // Ensure files are optional
      };
  
      // Validate the payload using Zod
      const validateTicket = TransactionSchema.safeParse(payload);
  
      if (!validateTicket.success) {
        let error: string = "";
        const errors = validateTicket.error.format();
        console.log(errors);
        for (let [key, value] of Object.entries(errors)) {
          if (
            value &&
            typeof value === "object" &&
            "_errors" in value &&
            Array.isArray(value._errors)
          ) {
            error += ` ${key} field: ${value._errors[0]},`;
          }
        }
  
        next(new GlobalError("ZodError", String(error), 400, true));
        return;
      }
  
      const LinkJwtPayload: JwtPayload = {
        creator_email: payload.creator_email,
        reciever_email: payload.reciever_email,
      };
  
      const parseDayToExpireToDate = convertDayToExpireDate(payload.expiresAt);
      const expiresIn = payload.expiresAt * 24 * 60 * 60 * 1000;
      const transactionToken = await createToken(expiresIn, LinkJwtPayload);
  
      const transaction = await prisma.transaction.create({
        data: {
          ...payload,
          transactionToken: transactionToken,
          txn_link: `${env.FRONTEND_URL}/ticket/${transactionToken}`,
          expiresAt: new Date(parseDayToExpireToDate),
        },
        select: {
          id: true,
          receiver_fullname: true,
          reciever_email: true,
          receiver_no: true,
          created_at: true,
          transactionToken: true,
          txn_link: true,
          amount: true,
          transaction_description: true,
          files: true, // Include files in the response
        },
      });
  
      res.status(200).json({
        message: "Ticket created successfully",
        data: transaction,
      });
  
      return;
    } catch (error) {
      console.log(error);
      if (error instanceof GlobalError) {
        next(new GlobalError(error.name, error.message, error.statusCode, error.operational));
        return;
      }
  
      if (error instanceof Error) {
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      
      next(new GlobalError("UnknownError", "Internal server Error", 500, false));
      return;
    }
  }
  

  async approveTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;
      const bodyObj = {
        ticket_id: body.ticketId,
        ticket_token: body.ticketToken,
        creator_email: body.creatorEmail,
        reciever_email: body.recieverEmail,
      };

      type JWTPayloadUsedToSigned = JwtPayload & {
        creator_email: string;
        reciever_email: string;
      };

      //check if link has expires
      const verifyLinkDecoded = await VerifyToken<JWTPayloadUsedToSigned>(
        bodyObj.ticket_token
      );
      if (!verifyLinkDecoded) {
        next(
          new GlobalError(
            "ExpiresInvalidToken",
            "The token has expired or is invalid",
            401,
            true
          )
        );
        return;
      }

      // console.log(bodyObj, body);
      // optional:check the token is in db
      const ticket = await prisma.transaction.findFirst({
        where: {
          transactionToken: bodyObj.ticket_token,
        },
      });

      if (!ticket) {
        next(
          new GlobalError("NotFound", "The token not found in db", 404, true)
        );
        return;
      }

      // aprrove
      await prisma.transaction.update({
        where: {
          id: bodyObj.ticket_id,
        },
        data: {
          approveStatus: true,
        },
      });
      console.log("approved");

      res.status(200).json({
        message: "Ticket approve successfully",
      });
      return;
    } catch (error) {
      if (error instanceof GlobalError) {
        next(
          new GlobalError(
            error.name,
            error.message,
            error.statusCode,
            error.operational
          )
        );
        return;
      }

      if (error instanceof Error) {
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }
}




