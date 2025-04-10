import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { TransactionSchema, TransactionType } from "../zod/TicketSchema";
import { createToken } from "../utils/createToken";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { JwtPayload } from "jsonwebtoken";
import VerifyToken from "../utils/verifyToken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate";
import prisma from "../utils/prisma";

export class Ticket {
  constructor(private readonly prisma: PrismaClient) {}
  async GenerateTicket(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const payload: TransactionType = {
        amount: data.amount,
        transaction_description: data.transaction_description,
        user_id: data.user_id,
        // status: data.status,
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
        // link_expires: data.link_expires,
        // txn_link: data.txn_link,
        terms: data.terms,
        transactionType: data.transactionType,
        // transactionToken: data.transactionToken,
        expiresAt: data.expiresAt,
        inspection_duration: data.inspection_duration,
        // created_at: data.created_at,
      };
      // const authHeader = req.headers.authorization;

      // if (!authHeader || !authHeader.startsWith("Bearer ")) {
      //   next(new GlobalError("Unauthorized", "No token provided", 401, true));
      //   return;
      // }
      // const token = authHeader.split(" ")[1];
      // //guessing this is the payload format that was used to signed the SIgn/login user token
      // interface tokenSignPayload extends JwtPayload {
      //   userId: string;
      //   email: string;
      // }
      // // console.log(token);
      // const user = await VerifyToken<tokenSignPayload>(token);
      // console.log(user);

      const validateTicket = TransactionSchema.safeParse({
        ...payload,
      });

      if (!validateTicket.success) {
        let error: string = "";
        const errors = validateTicket.error.format();
        console.log(errors);
        for (let [key, value] of Object.entries(errors)) {
          // console.log(key, value);
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

      const parseDayToExpireToDate = convertDayToExpireDate(payload.expiresAt); //user send 2 (i.e 2day). add 2 to expire Date
      const expiresIn = payload.expiresAt * 24 * 60 * 60 * 1000; // convert to milliseconds
      const transactionToken = await createToken(expiresIn, LinkJwtPayload);

      const transaction = await prisma.transaction.create({
        data: {
          ...payload,
          transactionToken: transactionToken,
          txn_link: `${process.env.FRONTEND_URL}/ticket/${transactionToken}`,
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
        },
      });

      res.status(200).json({
        message: "Ticket created successfully",
        data: { ...transaction },
      });
      return;
    } catch (error) {
      console.log(error);
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
