"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const routes_1 = __importDefault(require("./routes"));
const error_middlewares_1 = require("./middlewares/error/error.middlewares");
const GlobalErrorMiddleware_1 = require("./middlewares/error/GlobalErrorMiddleware");
const app = (0, express_1.default)();
// Middlewares
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use("/api", routes_1.default);
//error handling middleware
app.use((err, req, res, next) => {
    (0, GlobalErrorMiddleware_1.GlobalErrorMiddleware)(err, req, res, next);
});
// Error handling
app.use((err, req, res, next) => {
    (0, error_middlewares_1.errorHandler)(err, req, res, next);
});
exports.default = app;
