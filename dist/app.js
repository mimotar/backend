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
const app = (0, express_1.default)();
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
// Error handling
// app.use(
//   (
//     err: Error,
//     req: express.Request,
//     res: express.Response,
//     next: express.NextFunction
//   ) => {
//     errorHandler(err, req, res, next);
//   }
// );
//error handling middleware
app.use(GlobalErrorMiddleware_1.GlobalErrorMiddleware);
exports.default = app;
