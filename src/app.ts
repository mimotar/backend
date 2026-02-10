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
// import { sessionConfig } from "./config/session";
dotenv.config();

import { connectDB } from "./config/db.js";
import { setupSwagger } from "./config/swagger.js";

const app = express();

// Initialize Database Connection
connectDB();

// Middlewares
// app.use(session(sessionConfig));
app.use(cookieParser());
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Routes
// app.use("/api", routes);
// app.use("/api/test", authenticateTokenMiddleware, routes);
// app.use("/api/email", emailRoutes);
// app.use("/api/auth", authRoutes);

PassportConfig();

app.use(express.urlencoded({ extended: true }));
app.use("/api", routes);
app.use(GlobalErrorMiddleware);

setupSwagger(app);

export default app;
