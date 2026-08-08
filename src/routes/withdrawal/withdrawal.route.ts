import { RequestHandler, Router } from "express";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware.js";
import { requireAdminApiKey } from "../../middlewares/requireAdminApiKey.js";
import createRateLimiterMiddleware from "../../utils/loginLimiter.js";
import {
  adminCompleteWithdrawalController,
  adminFailWithdrawalController,
  adminListPendingManualController,
  confirmWithdrawalController,
  getMyBankController,
  listBanksController,
  listMyWithdrawalsController,
  requestWithdrawalController,
  saveBankController,
  transferWebhookController,
} from "../../controllers/withdrawal/withdrawal.controller.js";

const withdrawalRouter = Router();

withdrawalRouter.post("/webhook/transfer", transferWebhookController as RequestHandler);

withdrawalRouter.get(
  "/admin/pending-manual",
  requireAdminApiKey,
  adminListPendingManualController as RequestHandler
);
withdrawalRouter.post(
  "/admin/:id/complete",
  requireAdminApiKey,
  adminCompleteWithdrawalController as RequestHandler
);
withdrawalRouter.post(
  "/admin/:id/fail",
  requireAdminApiKey,
  adminFailWithdrawalController as RequestHandler
);

withdrawalRouter.get("/banks", authenticateTokenMiddleware, listBanksController as RequestHandler);
withdrawalRouter.get("/bank", authenticateTokenMiddleware, getMyBankController as RequestHandler);
withdrawalRouter.put(
  "/bank",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 10),
  saveBankController as RequestHandler
);

withdrawalRouter.get(
  "/",
  authenticateTokenMiddleware,
  listMyWithdrawalsController as RequestHandler
);
withdrawalRouter.post(
  "/request",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 5),
  requestWithdrawalController as RequestHandler
);
withdrawalRouter.post(
  "/:id/confirm",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 10),
  confirmWithdrawalController as RequestHandler
);

export default withdrawalRouter;
