"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = VerifyToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const env_1 = require("../config/env");
async function VerifyToken(token) {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                // console.log(err);
                reject(new GlobalErrorHandler_1.GlobalError(err.name, err.message, 401, true));
            }
            else {
                resolve(decoded?.data);
            }
        });
    });
}
