import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { errorHandler } from "./middlewares/error/error.middlewares";
import { GlobalErrorMiddleware } from "./middlewares/error/GlobalErrorMiddleware";
import { authenticateTokenMiddleware } from "./middlewares/authenticateTokenMiddleware";
const emailRoutes = require("./routes/emailRoute");
import authRoutes from "./routes/authRoute";

import { connectDB } from "./config/db";

const app = express();

// Initialize Database Connection
connectDB();
// Middlewares
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
app.use("/api", routes);
app.use("/api/test", authenticateTokenMiddleware, routes);
app.use("/api/email", emailRoutes);
app.use("/api/auth", authRoutes);



app.use(GlobalErrorMiddleware);

export default app;
