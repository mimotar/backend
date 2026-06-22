import type { NextFunction, Request, Response } from "express";
import { getCurrentUserDetail } from "../services/auth/currentUser.js";

export async function getCurrentUserController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const currentUser = await getCurrentUserDetail(
      typeof req.user === "object" ? req.user : undefined
    );

    res.status(200).json({
      status: 200,
      message: "Current user retrieved successfully",
      data: currentUser,
      success: true,
    });
  } catch (error) {
    next(error);
  }
}
