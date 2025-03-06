import { Router } from "express";
import { PasswordResetController } from "../controllers/emailResetController";
import prisma from "../utils/prisma";

const router = Router();
const PasswordResetControllerImpl = new PasswordResetController(prisma);
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

router.post(
  "/confirm-email-password-reset",
  PasswordResetControllerImpl.ConfirmEmail
);

export default router;
