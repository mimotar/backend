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
    saltRounds: Number(process.env.SALTROUNDS),
};
