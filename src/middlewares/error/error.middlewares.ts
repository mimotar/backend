// import { Request, Response, NextFunction } from 'express';
// import logger from "../../utils/logger";

// export class AppError extends Error {
//   constructor(public statusCode: number, message: string) {
//     super(message);
//     this.statusCode = statusCode;
//   }
// }

// export const errorHandler = (
//   err: Error,
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   if (err instanceof AppError) {
//     return res.status(err.statusCode).json({
//       success: false,
//       error: err.message
//     });
//   }

//   logger.error(err.stack);

//   return res.status(500).json({
//     success: false,
//     error: 'Internal server error'
//   });
// };




// error.middlewares.ts
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  // Your error handling logic here
  return res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
};