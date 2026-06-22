import { Router } from "express";
import createRateLimiterMiddleware from "../utils/loginLimiter.js";
import { PasswordController } from "../controllers/password.controller.js";
import prisma from "../utils/prisma.js";

export const passwordRouter = Router();
const passwordController = new PasswordController(prisma);

passwordRouter.post(
  "/forgot",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  passwordController.forgotPassword.bind(passwordController)
);

passwordRouter.post(
  "/reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  passwordController.resetPassword.bind(passwordController)
);
