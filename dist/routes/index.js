"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// import emailRouter from "./emailRoute";
const signup_1 = __importDefault(require("./auth/signup"));
const emailRoute_1 = __importDefault(require("./emailRoute"));
const emailResetController_1 = require("../controllers/emailResetController");
// import prisma from "../utils/prisma";
const db_1 = require("../config/db");
const loginLimiter_1 = __importDefault(require("../utils/loginLimiter"));
const ticket_1 = require("../controllers/ticket");
const router = (0, express_1.Router)();
const PasswordResetControllerImpl = new emailResetController_1.PasswordResetController(db_1.prisma);
const TicketImpl = new ticket_1.Ticket(db_1.prisma);
router.get("/", (req, res) => {
    res.send("Hello World");
});
router.use("/auth", signup_1.default);
router.post("/middleware", (req, res) => {
    res.send("middleware");
});
router.post("/create/user", async (req, res) => {
    const { email, password, firstName, lastName, verificationToken, provider, subject, } = req.body;
    await db_1.prisma.user.create({
        data: {
            email,
            firstName,
            lastName,
            password,
            verificationToken,
            provider,
            subject,
        },
    });
    res.send("User Created");
});
router.use("/email", emailRoute_1.default);
// router.use("/email", emailRouter);
router.post("/confirm-email-password-reset", (0, loginLimiter_1.default)(10 * 60 * 1000, 10), PasswordResetControllerImpl.ConfirmEmail);
router.post("/password-reset", (0, loginLimiter_1.default)(10 * 60 * 1000, 10), PasswordResetControllerImpl.passwordReset);
//ticket route
router.post("/ticket", (0, loginLimiter_1.default)(10 * 60 * 1000, 10), TicketImpl.GenerateTicket);
exports.default = router;
