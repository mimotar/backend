import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { GlobalErrorMiddleware } from "./middlewares/error/GlobalErrorMiddleware.js";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import { PassportConfig } from "./config/Passport.js";
dotenv.config();

import { connectDB } from "./config/db.js";
import { setupSwagger } from "./config/swagger.js";
import { env } from "./config/env.js";
import "./config/bullmq.js";

const app = express();

const localPorts = ["3000", "5173", "10000", env.PORT || "3000"];
const allowedOrigins: string[] = [
  ...new Set(
    localPorts.flatMap((port) => [
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
    ])
  ),
  "https://mimotar.com",
  "https://mim-backend.onrender.com",
];

const corsOptions: cors.CorsOptions = {
  origin: function (
    origin: string | undefined, 
    callback: (err: Error | null, allow?: boolean) => void
  ): void {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["set-cookie"],
};

// Initialize Database Connection
connectDB();

// Middleware order - CORS must come early
app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Other middleware
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

PassportConfig();

// Routes
app.use("/api", routes);
app.use(GlobalErrorMiddleware);

setupSwagger(app);

export default app;