import { NextFunction, Request, Response } from "express";
import { GlobalError } from "./GlobalErrorHandler.js";
import multer from "multer";

export const GlobalErrorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      name: err.code,
      message: err.message,
    });
    return;
  } else if (err instanceof GlobalError) {
    if (err.operational) {
      res.status(err.statusCode).json({
        name: err.name,
        message: err.message,
      });
      return;
    } else {
      console.error("Non-operational error:", err);
      res.status(500).json({
        name: err.name,
        message: "Something went wrong",
      });
      return;
    }
  } else {
    console.error("Unhandled error:", err);
    res.status(500).json({
      name: "error",
      message: "Internal Server Error",
    });
    return;
  }
};
