import { RequestHandler, Router } from "express";
// import emailRouter from "./emailRoute";
import signupRouter from "./auth/signup";
import { PasswordResetController } from "../controllers/emailResetController";
// import prisma from "../utils/prisma";
import { prisma } from "../config/db";
import createRateLimiterMiddleware from "../utils/loginLimiter";
import { Ticket } from "../controllers/ticket";
import { createUser } from "../controllers/test/user";
import disputeRouter from "./dispute/dispute.router";
import userRouter from "./userRoutes";

const router = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);
const TicketImpl = new Ticket(prisma);
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use("/auth", signupRouter);
router.use("/user", userRouter);



router.post("/middleware", (req, res) => {
  res.send("middleware");
});


// router.use("/email", emailRouter);

router.post(
  "/confirm-email-password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.ConfirmEmail
);

router.post(
  "/password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.passwordReset
);

//ticket route
router.post(
  "/ticket",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  TicketImpl.GenerateTicket
);

router.use("/dispute", disputeRouter);

router.post('/user', createUser as RequestHandler);

export default router;
