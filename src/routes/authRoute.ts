// src/routes/authRoute.ts
import express from "express";
import { login, register,verifyEmail  } from "../controllers/authController";
import { loginValidation, registerValidation } from "../middlewares/validateRequest";
import { loginLimiter } from "../utils/loginLimiter";



const router = express.Router();
router.post("/register", registerValidation, register);
router.post("/sign-in", loginValidation, loginLimiter,login);
router.post("/verify-email", verifyEmail);
// router.post("/register", registerValidation, register);
export default router;