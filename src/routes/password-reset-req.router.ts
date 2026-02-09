import { Router } from "express";
import createRateLimiterMiddleware from "../utils/loginLimiter.js";
import { PasswordResetController } from "../controllers/emailResetController.js";
import prisma from "../utils/prisma.js";

export const passwordResetReqRouter = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);

passwordResetReqRouter.post(
  "/confirm-email-password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.ConfirmEmail
);

passwordResetReqRouter.post(
  "/",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.passwordReset
);
