"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTokenMiddleware = authenticateTokenMiddleware;
const verifyToken_1 = __importDefault(require("../utils/verifyToken"));
const GlobalErrorHandler_1 = require("./error/GlobalErrorHandler");
async function authenticateTokenMiddleware(req, res, next) {
    try {
        const tokenHeader = req.cookies;
        console.log(tokenHeader);
        const token = tokenHeader.token;
        if (!token) {
            throw new GlobalErrorHandler_1.GlobalError("TokenError", "token not provided", 403, true);
        }
        // verify the token
        await (0, verifyToken_1.default)(token);
        next();
    }
    catch (error) {
        if (error instanceof GlobalErrorHandler_1.GlobalError) {
            return next(error);
        }
        else if (error instanceof Error) {
            next(new Error(error.message)); // Catch other errors and wrap them
        }
        else {
            return next(new Error("Internal server error"));
        }
    }
}
