import { Router } from "express";

import prisma from "../utils/prisma";
import createRateLimiterMiddleware from "../utils/loginLimiter";
import { validateSchema } from "../middlewares/validations/allroute.validation";
import { TransactionSchema } from "../zod/TicketSchema";
import { createTransactionController, Ticket } from "../controllers/ticket.controller";
import { upload } from "../config/cloudinary";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware";

const ticketRouter = Router();
const TicketImpl = new Ticket(prisma);

ticketRouter.post(
  "/create",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  TicketImpl.GenerateTicket
);

ticketRouter.post('/', authenticateTokenMiddleware, upload.array("files", 2), validateSchema(TransactionSchema), createTransactionController  )


ticketRouter.put(
  "/approve",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  TicketImpl.approveTicket
);

export default ticketRouter;
