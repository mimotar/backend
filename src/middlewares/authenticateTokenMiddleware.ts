import { Request, Response, NextFunction } from "express";
import VerifyToken from "../utils/verifyToken";
import { GlobalError } from "./error/GlobalErrorHandler";

export async function authenticateTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const tokenHeader = req.cookies;
    console.log(tokenHeader);
    const token = tokenHeader.token;
    if (!token) {
      throw new GlobalError("TokenError", "token not provided", 403, true);
    }
    // verify the token
    await VerifyToken(token);
    next();
  } catch (error: unknown) {
    if (error instanceof GlobalError) {
      return next(error);
    } else if (error instanceof Error) {
      next(new Error(error.message)); // Catch other errors and wrap them
    } else {
      return next(new Error("Internal server error"));
    }
  }
}
