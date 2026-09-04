import { RequestHandler, Router } from "express";
import {
  initiatePaymentController,
  PaymentWebhookController,
  reconcilePaymentController,
  verifyPaymentController,
} from "../controllers/payment/initiatePaymentController.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { requireAdminApiKey } from "../middlewares/requireAdminApiKey.js";

const paymentRouter = Router();

paymentRouter.post("/initialize/:id", initiatePaymentController as RequestHandler);

paymentRouter.post("/webhook", PaymentWebhookController as RequestHandler);

paymentRouter.post(
  "/verify/:id",
  authenticateTokenMiddleware as RequestHandler,
  verifyPaymentController as RequestHandler
);

paymentRouter.post(
  "/reconcile/:id",
  requireAdminApiKey as RequestHandler,
  reconcilePaymentController as RequestHandler
);

export default paymentRouter;
