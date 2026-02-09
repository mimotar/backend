import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
// import prisma from "../utils/prisma";
// import { prisma } from "../config/db";
// import { PrismaClient } from "@prisma/client";
import { createToken } from "../utils/createToken.js";
import { sendEmailWithTemplate } from "../services/emailService.js";
import VerifyToken from "../utils/verifyToken.js";
import { hashPassword } from "../utils/HashPassword.js";
import { comparePassword } from "../utils/comparePassword.js";
import { env } from "../config/env.js";
import { JwtPayload } from "jsonwebtoken";
import prisma from "../utils/prisma.js";
import { PrismaClient } from "../generated/prisma/client.js";

//interface for the verify token payload object
interface EmailPayload extends JwtPayload {
  email: string;
}
export class PasswordResetController {
  private prisma: PrismaClient;
  constructor(prismaClient: PrismaClient) {
    this.prisma = prismaClient;
  }
  async ConfirmEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;

      //check if the request has authorization header
      // if (!authHeader || !authHeader.startsWith("Bearer ")) {
      //   next(new GlobalError("Unauthorized", "No token provided", 401, true));
      //   return;
      // }
      // const token = authHeader.split(" ")[1];

      //guessing this is the payload format that was used to signed the SIgn/login user token
      interface tokenSignPayload extends JwtPayload {
        userId: string;
        email: string;
      }

      //verify the req token
      // const tokenDecoded = await VerifyToken<tokenSignPayload>(token);

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

      //check if the current user email is the same with the email sent  to reset password.
      // this is to prevent user from resetting other user passwords
      // if (tokenDecoded.email !== ValidatedEmail.email) {
      //   next(
      //     new GlobalError(
      //       "Forbidden",
      //       "You are not allowed to reset other user password",
      //       403,
      //       true
      //     )
      //   );
      //   return;
      // }

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

      //create token and new password form link
      const reset_token = await createToken(3600, ValidatedEmail);
      const resetPasswordUrl = `${
        env.FRONTEND_URL
      }/auth/forget-password?type=set-newPassword&token=${encodeURIComponent(
        reset_token
      )}&email=${encodeURIComponent(ValidatedEmail.email)}`;
      const linkObj = {
        firstname: validationResult.data?.email,
        link: resetPasswordUrl,
      };

      await sendEmailWithTemplate(validationResult.data.email, linkObj, 2);
      res.status(200).json({
        success: true,
        message:
          "Password reset request confirmed. Please check your email for further instructions.",
        // email,
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
      // note: the current user email should come from the token for security reason
      // used the email payload here because the token is unavailable here for testing
      const { token, newPassword, email } = req.body;
      // console.log(token, newPassword, email);

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

      //validate the token
      const tokenDecoded = await VerifyToken<EmailPayload>(token);
      // console.log(tokenDecoded);

      //making sure it was the user who make the password reset request
      if (tokenDecoded.email !== email) {
        next(
          new GlobalError(
            "UnauthorizedPasswordReset",
            "Security bridge: You are not the user who make the password request.",
            401,
            true
          )
        );
        return;
      }

      //MAKE SURE THE USER IS NOT SENDING THE SAME PASSWORD as of old one
      //the db password of the current user
      const dbCredential = await prisma.user.findUnique({
        where: { email: email },
      });

      // check if the user is already registered
      if (!dbCredential) {
        next(
          new GlobalError(
            "forbidden",
            "Not registered User, no try this nonsense again for your life",
            401,
            true
          )
        );
        return;
      }

      //check if the new password and old password match
      const password_compare = await comparePassword(
        newPassword,
        dbCredential?.password! //hashed already
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
      await prisma.user.update({
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
        next(new GlobalError(error.name, error.message, 500, false));
        return;
        // "Internal server Error"
      }
      next(
        new GlobalError("UnknownError", "Internal server Error", 500, false)
      );

      return;
    }
  }
}
