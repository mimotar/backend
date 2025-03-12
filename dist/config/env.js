"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "3000",
    JWT_SECRET: process.env.JWT_SECRET,
    brevoApiKey: process.env.BREVO_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    EMAIL: process.env.EMAIL_SENDER,
    FACEBOOK_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_SECRET: process.env.FACEBOOK_SECRET,
    GOOGLE_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_SECRET: process.env.GOOGLE_CLIENT_SECRET
};
