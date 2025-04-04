"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
const env_1 = require("../config/env");
function hashPassword(plainPassword) {
    const saltRounds = env_1.env.saltRounds;
    return new Promise((resolve, reject) => {
        bcrypt_1.default.hash(plainPassword, saltRounds, (err, hash) => {
            if (err) {
                reject(new GlobalErrorHandler_1.GlobalError(err.name || "HashError", err.message, 500, true));
            }
            else {
                resolve(hash);
            }
        });
    });
}
