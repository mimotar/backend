import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import routes from "./routes";
import { GlobalErrorMiddleware } from "./middlewares/error/GlobalErrorMiddleware";
import passport from "passport";
import session from "express-session";
import dotenv from "dotenv";
import { PassportConfig } from "./config/Passport";
import { sessionConfig } from "./config/session";
dotenv.config();



const app = express();


// Middlewares
// app.use(session(sessionConfig));
app.use(session({ secret: "your_secret_key", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(compression());
app.use(express.json());



PassportConfig();

app.use(express.urlencoded({ extended: true }));
app.use("/", routes);
app.use(GlobalErrorMiddleware);

export default app;
