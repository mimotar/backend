import { Request, Response, NextFunction } from "express";
import VerifyToken from "../utils/verifyToken.js";
import { GlobalError } from "./error/GlobalErrorHandler.js";

export async function authenticateTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader?.split(' ')[1]
    
    if (!token) {
      res.status(401).json({
        status: 401,
        message: 'Authorization token required',
        data: null,
        success: false
      });
      return;
    }

    const decoded = await VerifyToken(token);
    req.user = decoded;
    // console.log("USER DETAIL",decoded)

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







