import { RequestHandler, Router } from "express";

import createRateLimiterMiddleware from "../utils/loginLimiter.js";
import { validateSchema } from "../middlewares/validations/allroute.validation.js";
import { TransactionSchema, RejectTransactionSchema, DeadlineExtensionSchema } from "../zod/TicketSchema.js";
import {
  approveTransactionController,
  createTransactionController,
  getAUserTransactionsController,
  getTransactionByIdCotroller,
  rejectTransactionController,
  requestTokenToValidateTransactionController,
  resolveTransactionController,
  acceptResolutionController,
  rejectResolutionController,
  updateTicketToOngoingController,
  extendTransactionDeadlineController,
  extendMilestoneDeadlineController
} from "../controllers/ticket.controller.js";

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
  validateSchema(RejectTransactionSchema),
  rejectTransactionController as RequestHandler
);

ticketRouter.put("/:id/resolve", authenticateTokenMiddleware, resolveTransactionController as RequestHandler);
ticketRouter.put("/:id/accept-resolution", authenticateTokenMiddleware, acceptResolutionController as RequestHandler);
ticketRouter.put("/:id/reject-resolution", authenticateTokenMiddleware, rejectResolutionController as RequestHandler);
ticketRouter.put("/:id/milestones/:milestoneId/resolve", authenticateTokenMiddleware, resolveTransactionController as RequestHandler);
ticketRouter.put("/:id/milestones/:milestoneId/accept-resolution", authenticateTokenMiddleware, acceptResolutionController as RequestHandler);
ticketRouter.put("/:id/milestones/:milestoneId/reject-resolution", authenticateTokenMiddleware, rejectResolutionController as RequestHandler);
ticketRouter.put("/:id/update-status-to-ongoing", authenticateTokenMiddleware, updateTicketToOngoingController as RequestHandler);

ticketRouter.patch(
  "/:id/deadline",
  authenticateTokenMiddleware,
  validateSchema(DeadlineExtensionSchema),
  extendTransactionDeadlineController as RequestHandler
);

ticketRouter.patch(
  "/:id/milestones/:milestoneId/deadline",
  authenticateTokenMiddleware,
  validateSchema(DeadlineExtensionSchema),
  extendMilestoneDeadlineController as RequestHandler
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
  // authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  getTransactionByIdCotroller as RequestHandler
);


ticketRouter.delete("/:id", deleteTransactionController as RequestHandler);
ticketRouter.delete("/", deleteAllTransactionController as RequestHandler);


export default ticketRouter;
