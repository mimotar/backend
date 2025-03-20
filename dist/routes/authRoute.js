"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/authRoute.ts
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const validateRequest_1 = require("../middlewares/validateRequest");
const loginLimiter_1 = require("../utils/loginLimiter");
const router = express_1.default.Router();
router.post("/register", validateRequest_1.registerValidation, authController_1.register);
router.post("/sign-in", validateRequest_1.loginValidation, loginLimiter_1.loginLimiter, authController_1.login);
router.post("/verify-email", authController_1.verifyEmail);
// router.post("/register", registerValidation, register);
exports.default = router;
