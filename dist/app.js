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
const authenticateTokenMiddleware_1 = require("./middlewares/authenticateTokenMiddleware");
const emailRoutes = require("./routes/emailRoute");
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const db_1 = require("./config/db");
const app = (0, express_1.default)();
// Initialize Database Connection
(0, db_1.connectDB)();
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use("/api", routes_1.default);
app.use("/api/test", authenticateTokenMiddleware_1.authenticateTokenMiddleware, routes_1.default);
app.use("/api/email", emailRoutes);
app.use("/api/auth", authRoute_1.default);
app.use(GlobalErrorMiddleware_1.GlobalErrorMiddleware);
exports.default = app;
