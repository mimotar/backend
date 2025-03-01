import { NextFunction, Request, Response } from "express";
import { GlobalError } from "./GlobalErrorHandler";

export const GlobalErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof GlobalError) {
    if (err.operational) {
      res.status(err.statusCode).json({
        name: err.name,
        message: err.message,
      });
      return;
    } else {
      res.status(500).json({
        name: err.name,
        message: "Something went wrong",
      });
      return;
    }
  } else {
    res.status(500).json({
      name: "error",
      message: "Internal Server Error",
    });
    return;
  }
};
