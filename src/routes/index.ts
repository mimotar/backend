import { Router } from "express";
// import emailRouter from "./emailRoute";
import signupRouter from "./auth/signup";
import emailRouter from "./emailRoute";
import { PasswordResetController } from "../controllers/emailResetController";
// import prisma from "../utils/prisma";
import { prisma } from "../config/db";
import createRateLimiterMiddleware from "../utils/loginLimiter";

const router = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use("/auth", signupRouter);

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

router.post("/create/user", async (req, res) => {
  const {
    email,
    password,
    firstName,
    lastName,
    verificationToken,
    provider,
    subject,
  } = req.body;
  await prisma.user.create({
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

router.use("/email", emailRouter);

// router.use("/email", emailRouter);

router.post(
  "/confirm-email-password-reset",
  PasswordResetControllerImpl.ConfirmEmail
);

router.post(
  "/password-reset",
  createRateLimiterMiddleware(10 * 60 * 1000, 10),
  PasswordResetControllerImpl.passwordReset
);

export default router;
