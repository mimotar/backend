import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import { sendEmail } from "../services/emailService.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import { hashPassword } from "../utils/HashPassword.js";
import { comparePassword } from "../utils/comparePassword.js";
import prisma from "../utils/prisma.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { generateSixDigitString } from "../utils/OTPGenerator.js";

//interface for the verify token payload object
interface EmailPayload {
  email: string;
}

export class PasswordResetController {
  private prisma: PrismaClient;
  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }
  
  async ConfirmEmail(req: Request, res: Response, next: NextFunction) {
    try {
      // validation the email u want to reset
      const emailSchema = z.object({
        email: z.string().email(),
      });

      const validationResult = emailSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.format().email?._errors;
        next(new GlobalError("ZodError", String(errors?.[0]), 400, true));
        return;
      }
      const ValidatedEmail = validationResult.data as EmailPayload;

      // Check if email exists in database
      const verifyEmailInDb = await prisma.user.findUnique({
        where: { email: ValidatedEmail.email },
        select: { email: true, password: true },
      });

      if (!verifyEmailInDb) {
        next(
          new GlobalError(
            "EmailNotFound",
            "The email you provided does not exist",
            404,
            true
          )
        );

        return;
      }

      // Generate OTP and save to DB
      const otp = generateSixDigitString();
      const otpCreatedAt = new Date();

      await prisma.user.update({
        where: { email: ValidatedEmail.email },
        data: { otp, otpCreatedAt }
      });

      // Send OTP implicitly
      await sendEmail(validationResult.data.email, EmailType.PASSWORD_RESET_OTP, { otp });
      
      res.status(200).json({
        success: true,
        message:
          "Password reset request confirmed. Please check your email for your OTP.",
      });
      return;
    } catch (error: unknown) {
      if (error instanceof GlobalError) {
        next(
          new GlobalError(
            error.name,
            error.message,
            error.statusCode,
            error.operational
          )
        );
        return;
      }

      if (error instanceof Error) {
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }

  async passwordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const { otp, newPassword, email } = req.body;

      const passwordSchema = z.object({
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

      const validatePassword = passwordSchema.safeParse({
        newPassword: newPassword,
      });

      if (!validatePassword.success) {
        const errors = validatePassword.error.format().newPassword?._errors;
        next(new GlobalError("ZodError", String(errors?.[0]), 400, true));
        return;
      }

      const dbCredential = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!dbCredential) {
        next(
          new GlobalError(
            "forbidden",
            "Not registered User, try with a valid email",
            401,
            true
          )
        );
        return;
      }

      // Verify OTP
      if (!otp || dbCredential.otp !== otp) {
        next(
          new GlobalError(
            "InvalidOTP",
            "The OTP provided is incorrect.",
            400,
            true
          )
        );
        return;
      }

      const now = new Date();
      if (
        !dbCredential.otpCreatedAt ||
        (now.getTime() - dbCredential.otpCreatedAt.getTime()) > 15 * 60 * 1000
      ) {
        next(
          new GlobalError(
            "ExpiredOTP",
            "The OTP has expired. Please request a new one.",
            400,
            true
          )
        );
        return;
      }

      if(!dbCredential.password) {
        next(
          new GlobalError(
            "OAuthAccount",
            "This account is linked via OAuth and does not have a password.",
            400,
            true
          )
        );
        return;
      }

      //check if the new password and old password match
      const password_compare = await comparePassword(
        newPassword,
        dbCredential.password
      );

      if (password_compare) {
        next(
          new GlobalError(
            "SamePasswordError",
            "New Password matches the old password. Insert a new unique password",
            400,
            true
          )
        );
        return;
      }

      //hash password
      const hash_Password = await hashPassword(newPassword);
      await prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: hash_Password,
          otp: null,
          otpCreatedAt: null
        },
      });

      res.status(200).json({ success: true, message: "Password reset successful" });
      return;
    } catch (error) {
      if (error instanceof GlobalError) {
        next(
          new GlobalError(
            error.name,
            error.message,
            error.statusCode,
            error.operational
          )
        );
        return;
      }

      if (error instanceof Error) {
        next(new GlobalError(error.name, error.message, 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }
}
