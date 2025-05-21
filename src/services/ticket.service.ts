import { TransactionType } from './../zod/TicketSchema';
import { prisma } from "../config/db";
import { JwtPayload } from "jsonwebtoken";
import { convertDayToExpireDate } from "../utils/convertDayToExpireDate";
import { createToken } from "../utils/createToken";
import { env } from '../config/env';



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
              transactionToken,
              txn_link: `${frontendUrl}/ticket/${transactionToken}`
            },
          });
          
};
