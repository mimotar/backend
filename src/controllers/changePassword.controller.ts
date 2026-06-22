import type { NextFunction, Request, Response } from "express";
import { GlobalError } from "../middlewares/error/GlobalErrorHandler.js";
import {
  completePasswordChange,
  requestPasswordChange,
} from "../services/auth/changePassword.service.js";
import {
  changePasswordRequestSchema,
  changePasswordVerifySchema,
} from "../zod/changePassword.schema.js";

function authenticatedUserId(req: Request): number {
  const principal = (
    typeof req.user === "object" ? req.user : undefined
  ) as { id?: unknown; userId?: unknown } | undefined;
  const id = Number(principal?.id ?? principal?.userId);

  if (!Number.isInteger(id) || id < 1) {
    throw new GlobalError(
      "UnauthorizedError",
      "You must be logged in to change your password",
      401,
      true
    );
  }

  return id;
}

function validationError(error: { issues: Array<{ message: string }> }): GlobalError {
  return new GlobalError(
    "ValidationError",
    error.issues[0]?.message ?? "Invalid request data",
    400,
    true
  );
}

export async function requestChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = changePasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }

    await requestPasswordChange(authenticatedUserId(req), parsed.data);

    res.status(200).json({
      status: 200,
      message: "An OTP has been sent to your registered email address",
      data: null,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyChangePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = changePasswordVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      throw validationError(parsed.error);
    }

    await completePasswordChange(authenticatedUserId(req), parsed.data.otp);

    res.status(200).json({
      status: 200,
      message: "Password changed successfully",
      data: null,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
