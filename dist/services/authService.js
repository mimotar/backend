"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationToken = exports.registerUser = void 0;
// src/services/authService.ts
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const registerUser = async (email, password) => {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
        throw new Error("Email already registered");
    const hashedPassword = await bcryptjs_1.default.hash(password, 10);
    return prisma.user.create({
        data: { email, password: hashedPassword, verified: false, firstName: "DefaultFirstName", lastName: "DefaultLastName" },
    });
};
exports.registerUser = registerUser;
const generateVerificationToken = (email) => {
    return jsonwebtoken_1.default.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
};
exports.generateVerificationToken = generateVerificationToken;
