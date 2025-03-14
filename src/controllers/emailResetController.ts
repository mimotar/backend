import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
// import prisma from "../utils/prisma";
import { PrismaClient } from "@prisma/client";
import { createToken } from "../utils/createToken";
import { sendEmail } from "../services/emailService";
import { EmailType } from "../emails/templates/emailTypes";
import VerifyToken from "../utils/verifyToken";
import { hashPassword } from "../utils/HashPassword";
import { comparePassword } from "../utils/comparePassword";

export class PasswordResetController {
  private prisma: PrismaClient;
  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }
  async ConfirmEmail(req: Request, res: Response, next: NextFunction) {
    try {
      //this is gotten from the req header
      const currentUser = {
        email: "testing@gmail.com",
      };
      // email validation schema
      const emailSchema = z.object({
        email: z.string().email(),
      });

      const validationResult = emailSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.format().email?._errors;
        next(new GlobalError("ZodError", String(errors?.[0]), 400, true));
        return;
      }
      const { email } = validationResult.data;

      //check if the current user email is equal with the sent email
      if (currentUser.email !== email) {
        next(
          new GlobalError(
            "Forbidden",
            "Can't Reset email that is not your",
            403,
            true
          )
        );
        return;
      }
      // Check if email exists in database
      const verifyEmail = await this.prisma.user.findUnique({
        where: { email },
        select: { email: true, password: true },
      });

      console.log(verifyEmail);

      if (!verifyEmail) {
        next(new GlobalError("NotFound", "Email not found", 404, true));
        return;
      }

      //create token and new password form link
      const reset_token = await createToken(3600, validationResult.data);
      const resetPasswordUrl = `http://localhost:5000/reset-password?token=${reset_token}`;
      const linkObj = { resetLink: resetPasswordUrl };
      console.log("sendEmail function:", sendEmail);
      await sendEmail(email, EmailType.PASSWORD_RESET, linkObj);
      res.status(200).json({
        success: true,
        message:
          "Password reset request confirmed. Please check your email for further instructions.",
        email,
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
      const { token, newPassword, email } = req.body;
      const sampleToken =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";
      const passwordSchema = z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .max(32, "Password cannot be longer than 32 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(
          /[@$!%*?&]/,
          "Password must contain at least one special character (@$!%*?&)"
        );

      const validatePassword = passwordSchema.safeParse(newPassword);

      if (!validatePassword.success) {
        const errors = validatePassword.error.format()?._errors;
        next(new GlobalError("ZodError", String(errors?.[0]), 400, true));
        return;
      }
      //validate the token
      const tokenDecoded = await VerifyToken(sampleToken);

      //making sure it was the user who make the password reset request
      if (tokenDecoded !== email) {
        next(
          new GlobalError(
            "UnauthorizedPasswordReset",
            "Security bridge: You are not the user who make the password request",
            401,
            true
          )
        );
        return;
      }

      //MAKE SURE THE USER IS NOT SENDING THE SAME PASSWORD as of old one
      //the db password of the current user
      const dbCredential = await this.prisma.user.findUnique({
        where: { email: email },
      });
      //check if the new password and old password match
      const password_compare = await comparePassword(
        newPassword,
        dbCredential?.password!
      );
      if (password_compare) {
        next(
          new GlobalError(
            "SamePasswordError",
            "new Password matches the old password. Insert a new unique password",
            400,
            true
          )
        );
        return;
      }

      //hash password
      const hash_Password = await hashPassword(newPassword);
      await this.prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: hash_Password,
        },
      });

      res.status(200).json({ success: true, msg: "password reset successful" });
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
        next(new GlobalError(error.name, "Internal server Error", 500, false));
        return;
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }
}
