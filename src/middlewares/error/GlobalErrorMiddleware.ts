import { NextFunction, Request, Response } from "express";
import { GlobalError } from "./GlobalErrorHandler";

export const GlobalErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("error", err);
  console.error("stack", err.stack);
  console.error("error message", err.message);
  if (err instanceof GlobalError) {
    if (err.operational) {
      return res.status(err.statusCode).json({
        name: err.name,
        message: err.message,
      });
    } else {
      return res.status(500).json({
        name: err.name,
        message: "Something went wrong",
      });
    }
  } else {
    return res.status(500).json({
      name: "error",
      message: "Internal Server Error",
    });
  }
};
