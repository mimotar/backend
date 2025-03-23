"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const routes_1 = __importDefault(require("./routes"));
const GlobalErrorMiddleware_1 = require("./middlewares/error/GlobalErrorMiddleware");
const emailRoutes = require("./routes/emailRoute");
const passport_1 = __importDefault(require("passport"));
const express_session_1 = __importDefault(require("express-session"));
const dotenv_1 = __importDefault(require("dotenv"));
const Passport_1 = require("./config/Passport");
dotenv_1.default.config();
const db_1 = require("./config/db");
const app = (0, express_1.default)();
// Initialize Database Connection
(0, db_1.connectDB)();
// Middlewares
// app.use(session(sessionConfig));
app.use((0, express_session_1.default)({ secret: "your_secret_key", resave: false, saveUninitialized: true }));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
// app.use("/api", routes);
// app.use("/api/test", authenticateTokenMiddleware, routes);
// app.use("/api/email", emailRoutes);
// app.use("/api/auth", authRoutes);
(0, Passport_1.PassportConfig)();
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/api", routes_1.default);
app.use(GlobalErrorMiddleware_1.GlobalErrorMiddleware);
exports.default = app;
