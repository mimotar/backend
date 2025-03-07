"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = comparePassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
function comparePassword(plainPassword, hashedPassword) {
    return new Promise((resolve, reject) => {
        bcrypt_1.default.compare(plainPassword, hashedPassword, (err, result) => {
            if (err) {
                reject(new GlobalErrorHandler_1.GlobalError(err.name || "CompareHashError", err.message, 500, true));
            }
            else {
                resolve(result);
            }
        });
    });
}
