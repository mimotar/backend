import { Router } from "express";
import { Ticket } from "../controllers/ticket";

import prisma from "../utils/prisma";
import createRateLimiterMiddleware from "../utils/loginLimiter";

const ticketRouter = Router();
const TicketImpl = new Ticket(prisma);

ticketRouter.post(
  "/create",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  TicketImpl.GenerateTicket
);

export default ticketRouter;
