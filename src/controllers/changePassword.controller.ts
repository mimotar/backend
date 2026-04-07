import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { sendEmail } from "../services/emailService.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import { comparePassword } from "../utils/comparePassword.js";
import { hashPassword } from "../utils/HashPassword.js";
import prisma from "../utils/prisma.js";
import { generateSixDigitString } from "../utils/OTPGenerator.js";

export const requestChangePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      next(new GlobalError("Unauthorized", "You must be logged in to change your password.", 401, true));
      return;
    }

    const { oldPassword, newPassword } = req.body;

    const passwordSchema = z.object({
      oldPassword: z.string().min(1, "Old password is required"),
      newPassword: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(32, "Password cannot be longer than 32 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(
          /[@$!%*?&]/,
          "Password must contain at least one special character (@$!%*?&)"
        ),
    });

    const validationResult = passwordSchema.safeParse({ oldPassword, newPassword });
    if (!validationResult.success) {
      const errors = validationResult.error.format();
      const firstError = Object.values(errors)
         .flatMap(val => (val as any)?._errors || [])[0];
      next(new GlobalError("ZodError", String(firstError || "Invalid password data"), 400, true));
      return;
    }

    const dbCredential = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
    });

    if (!dbCredential || !dbCredential.password) {
      next(new GlobalError("AccountInvalid", "Cannot change password for this account. Note: OAuth accounts do not have passwords.", 400, true));
      return;
    }

    const isMatch = await comparePassword(oldPassword, dbCredential.password);
    if (!isMatch) {
      next(new GlobalError("InvalidCredentials", "The old password you entered is incorrect.", 400, true));
      return;
    }

    const password_compare = await comparePassword(newPassword, dbCredential.password);
    if (password_compare) {
      next(new GlobalError("SamePasswordError", "New password cannot match the old password.", 400, true));
      return;
    }

    const otp = generateSixDigitString();
    const otpCreatedAt = new Date();

    await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: { otp, otpCreatedAt },
    });

    await sendEmail(dbCredential.email, EmailType.CHANGE_PASSWORD_OTP, { otp });

    res.status(200).json({
      success: true,
      message: "Change password request accepted. An OTP has been sent to your registered email.",
    });
  } catch (error) {
    if (error instanceof GlobalError) {
      next(error);
      return;
    }
    next(new GlobalError("UnknownError", error instanceof Error ? error.message : "Internal server Error", 500, false));
  }
};

export const verifyChangePassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      next(new GlobalError("Unauthorized", "You must be logged in to change your password.", 401, true));
      return;
    }

    const { otp, newPassword, oldPassword } = req.body;
    
    if (!otp) {
        next(new GlobalError("ValidationError", "OTP is required.", 400, true));
        return;
    }

    const dbCredential = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
    });

    if (!dbCredential || !dbCredential.password) {
      next(new GlobalError("AccountInvalid", "Invalid account.", 400, true));
      return;
    }

    const isMatch = await comparePassword(oldPassword, dbCredential.password);
    if (!isMatch) {
      next(new GlobalError("InvalidCredentials", "The old password you entered is incorrect.", 400, true));
      return;
    }

    if (dbCredential.otp !== otp) {
      next(new GlobalError("InvalidOTP", "The OTP provided is incorrect.", 400, true));
      return;
    }

    const now = new Date();
    if (!dbCredential.otpCreatedAt || (now.getTime() - dbCredential.otpCreatedAt.getTime()) > 15 * 60 * 1000) {
      next(new GlobalError("ExpiredOTP", "The OTP has expired. Please request a new one.", 400, true));
      return;
    }

    const hash_Password = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: { password: hash_Password, otp: null, otpCreatedAt: null },
    });

    res.status(200).json({ success: true, message: "Password successfully changed." });
  } catch (error) {
    if (error instanceof GlobalError) {
      next(error);
      return;
    }
    next(new GlobalError("UnknownError", error instanceof Error ? error.message : "Internal server Error", 500, false));
  }
};
