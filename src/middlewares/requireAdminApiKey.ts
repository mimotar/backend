import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/** Protects admin-only withdrawal actions with ADMIN_API_KEY header. */
export function requireAdminApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const key = req.header("x-admin-api-key");
  if (!env.ADMIN_API_KEY || !key || key !== env.ADMIN_API_KEY) {
    res.status(401).json({ message: "Unauthorized", success: false });
    return;
  }
  next();
}
