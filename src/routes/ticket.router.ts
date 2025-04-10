import { Router } from "express";
import { Ticket } from "../controllers/ticket";

import prisma from "../utils/prisma";
import { PasswordResetController } from "../controllers/emailResetController";
import createRateLimiterMiddleware from "../utils/loginLimiter";

const ticketRouter = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);
const TicketImpl = new Ticket(prisma);

ticketRouter.post(
  "/ticket",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  TicketImpl.GenerateTicket
);


ticketRouter.post(
    "/password-reset",
    createRateLimiterMiddleware(10 * 60 * 1000, 10),
    PasswordResetControllerImpl.passwordReset
  );


export default ticketRouter;