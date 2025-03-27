"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many login attempts, please try again later",
    headers: true,
});
const createRateLimiterMiddleware = (windowMs, maxRequests, message = "Too many requests, please try again later.") => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        limit: maxRequests,
        standardHeaders: "draft-8",
        legacyHeaders: false,
        message,
    });
};
exports.default = createRateLimiterMiddleware;
