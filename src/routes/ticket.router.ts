import { RequestHandler, Router } from "express";

import createRateLimiterMiddleware from "../utils/loginLimiter.js";
import { validateSchema } from "../middlewares/validations/allroute.validation.js";
import { TransactionSchema } from "../zod/TicketSchema.js";
import { approveTransactionController, createTransactionController, getAUserTransactionsController, getTransactionByIdCotroller, rejectTransactionController, requestTokenToValidateTransactionController } from "../controllers/ticket.controller.js";

import { upload } from "../config/cloudinary.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { deleteAllTransactionController, deleteTransactionController } from "../controllers/payment/initiatePaymentController.js";

const ticketRouter = Router();

// Create Transaction
ticketRouter.post('/', authenticateTokenMiddleware, upload.array("files", 2), validateSchema(TransactionSchema), createTransactionController as RequestHandler  )

// Approve Transaction 
ticketRouter.put(
  "/approve/:id",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  approveTransactionController as RequestHandler
);

ticketRouter.put(
  "/reject/:id",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  rejectTransactionController as RequestHandler
);

// Request Token to Validate Transaction
ticketRouter.post("/:id/request-token", 
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  requestTokenToValidateTransactionController as RequestHandler
)

// Get User Transaction
ticketRouter.get(
  "/transactions",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  getAUserTransactionsController as RequestHandler
);

ticketRouter.get(
  "/:id",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  getTransactionByIdCotroller as RequestHandler
);


ticketRouter.delete("/:id", deleteTransactionController as RequestHandler);
ticketRouter.delete("/", deleteAllTransactionController as RequestHandler);


export default ticketRouter;
