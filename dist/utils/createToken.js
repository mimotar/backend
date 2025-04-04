"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createToken = createToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const GlobalErrorHandler_1 = require("../middlewares/error/GlobalErrorHandler");
function createToken(expires, payload) {
    return new Promise((resolve, reject) => {
        jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, { expiresIn: expires }, (err, token) => {
            if (err) {
                return reject(new GlobalErrorHandler_1.GlobalError(err.name, err.message, 500, true));
            }
            resolve(token);
        });
    });
}
