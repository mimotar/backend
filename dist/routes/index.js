"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import emailRouter from "./emailRoute";
const signup_1 = __importDefault(require("./auth/signup"));
const emailRoute_1 = __importDefault(require("./emailRoute"));
;
const emailResetController_1 = require("../controllers/emailResetController");
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = (0, express_1.Router)();
const PasswordResetControllerImpl = new emailResetController_1.PasswordResetController(prisma_1.default);
router.get("/", (req, res) => {
    res.send("Hello World");
});
router.use("/auth", signup_1.default);
router.post("/middleware", (req, res) => {
    res.send("middleware");
});
router.use("/email", emailRoute_1.default);
// router.use("/email", emailRouter);
router.post("/confirm-email-password-reset", PasswordResetControllerImpl.ConfirmEmail);
router.post("/password-reset", PasswordResetControllerImpl.passwordReset);
exports.default = router;
