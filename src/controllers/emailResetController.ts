import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import prisma from "../utils/prisma";
import { PrismaClient } from "@prisma/client";
import { createToken } from "../utils/createToken";
import { sendEmail } from "../services/emailService";
import { EmailType } from "../emails/templates/emailTypes";
import VerifyToken from "../utils/verifyToken";
import { hashPassword } from "../utils/HashPassword";
import { comparePassword } from "../utils/comparePassword";

export class PasswordResetController {
  protected prisma: PrismaClient;
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }
  async ConfirmEmail(req: Request, res: Response, next: NextFunction) {
    try {
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

      // Check if email exists in database
      const verifyEmail = await prisma.user.findFirst({
        where: { email },
        select: { email: true, password: true },
      });

      if (!verifyEmail) {
        next(new GlobalError("NotFound", "Email not found", 404, true));
        return;
      }

      //create token and new password form link
      const reset_token = await createToken(3600, validationResult.data);
      const resetPasswordUrl = `http://localhot:5000/reset-password?token=${reset_token}`;
      const linkObj = { resetLink: resetPasswordUrl };
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
      const { token, newPassWord, email } = req.body;
      //validate the token
      const tokenDecoded = await VerifyToken(token);

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
      const dbCredential = await prisma.user.findFirst({
        where: { email: email },
      });
      //check if the new password and old match
      const password_compare = await comparePassword(
        newPassWord,
        dbCredential?.password!
      );
      if (password_compare) {
        next(
          new GlobalError(
            "TheSamePasswordError",
            "new  Password other than the old one is required",
            400,
            true
          )
        );
        return;
      }

      //hash password
      const hash_Password = await hashPassword(newPassWord);
      await prisma.user.create({
        data: {
          password: hash_Password,
          email: "",
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
