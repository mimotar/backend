import { PrismaClient } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { TransactionType } from "../zod/TicketSchema";
import { createToken } from "../utils/createToken";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import { JwtPayload } from "jsonwebtoken";
import VerifyToken from "../utils/verifyToken";

export class Ticket {
  constructor(private readonly prisma: PrismaClient) {}
  async GenerateTicket(req: Request, res: Response, next: NextFunction) {
    const payload = (await req.body) as TransactionType;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next(new GlobalError("Unauthorized", "No token provided", 401, true));
      return;
    }
    const token = authHeader.split(" ")[1];

    //guessing this is the payload format that was used to signed the SIgn/login user token
    interface tokenSignPayload extends JwtPayload {
      userId: string;
      email: string;
    }
    // console.log(token);
    const user = await VerifyToken<tokenSignPayload>(token);
    console.log(user);

    const transactionToken = await createToken(172800000, user);
  }
}
