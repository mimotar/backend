import { Router } from "express";
import { settingsController } from "../../controllers/settings/index.js";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware.js";
import createRateLimiterMiddleware from "../../utils/loginLimiter.js";

const settingsRouter = Router();

settingsRouter.get(
  "/",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  settingsController.getSettings.bind(settingsController)
);
settingsRouter.put(
  "/",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  settingsController.updateSettings.bind(settingsController)
);

export default settingsRouter;
