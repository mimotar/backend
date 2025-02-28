import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";

import routes from "./routes";
import { errorHandler } from "./middlewares/error/error.middlewares";
import { GlobalErrorMiddleware } from "./middlewares/error/GlobalErrorMiddleware";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

//error handling middleware
app.use(
  (err: Error, req: Request, res: Response, next: express.NextFunction) => {
    GlobalErrorMiddleware(err, req, res, next);
  }
);

// Error handling
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    errorHandler(err, req, res, next);
  }
);

export default app;
