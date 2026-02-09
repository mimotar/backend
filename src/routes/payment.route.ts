import { RequestHandler, Router } from "express";
import { initiatePaymentController, PaymentWebhookController } from "../controllers/payment/initiatePaymentController.js";

const paymentRouter = Router();

paymentRouter.post("/initialize/:id", initiatePaymentController as RequestHandler);

paymentRouter.post("/webhook", PaymentWebhookController as RequestHandler);



export default paymentRouter;