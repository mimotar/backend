import { Router } from "express";
import createRateLimiterMiddleware from "../utils/loginLimiter";
import { PasswordResetController } from "../controllers/emailResetController";
import prisma from "../utils/prisma";

export const passwordResetReqRouter = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);

passwordResetReqRouter.post(
  "/confirm-email-password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.ConfirmEmail
);

passwordResetReqRouter.post(
  "/password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.passwordReset
);
