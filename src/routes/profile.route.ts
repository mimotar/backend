import express from "express";
import {
  getProfileController,
  updateProfileController,
  uploadAvatarController,
  sendPhoneOtpController,
  verifyPhoneOtpController,
} from "../controllers/profile.controller.js";
import { upload } from "../config/cloudinary.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import createRateLimiterMiddleware from "../utils/loginLimiter.js";

const profileRouter = express.Router();

profileRouter.get("/", authenticateTokenMiddleware, getProfileController);
profileRouter.put("/", authenticateTokenMiddleware, updateProfileController);
profileRouter.post("/avatar", authenticateTokenMiddleware, upload.single("avatar"), uploadAvatarController);

profileRouter.post(
  "/phone/send-otp",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 10, "Too many phone OTP requests, please try again later."),
  sendPhoneOtpController
);

profileRouter.post(
  "/phone/verify-otp",
  authenticateTokenMiddleware,
  createRateLimiterMiddleware(15 * 60 * 1000, 15, "Too many OTP verification attempts, please try again later."),
  verifyPhoneOtpController
);

export default profileRouter;

