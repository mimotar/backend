"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
class JWTService {
    constructor() {
        const secretKey = env_1.env.JWT_SECRET;
        if (!secretKey) {
            throw new Error('JWT_SECRET is not defined in .env');
        }
        this.secretKey = secretKey;
    }
    signToken(userId, email) {
        const payload = {
            userId: userId,
            email: email,
        };
        return jsonwebtoken_1.default.sign(payload, this.secretKey, { expiresIn: "12M" });
    }
    verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.secretKey);
            return decoded;
        }
        catch (error) {
            console.error('Token verification failed:', error);
            return null;
        }
    }
}
exports.default = new JWTService();
