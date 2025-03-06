import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler";
import prisma from "../utils/prisma";
import { PrismaClient } from "@prisma/client";
import { createToken } from "../utils/createToken";
import { sendEmail } from "../services/emailService";
import { EmailType } from "../emails/templates/emailTypes";

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
}
