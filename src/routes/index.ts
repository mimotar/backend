import { RequestHandler, Router } from "express";
// import emailRouter from "./emailRoute";
import signupRouter from "./auth/signup.js";
import { createUser, demo } from "../controllers/test/user.js";
import disputeRouter from "./dispute/dispute.router.js";
import userRouter from "./userRoutes.js";
import ticketRouter from "./ticket.router.js";
import { passwordResetReqRouter } from "./password-reset-req.router.js";
import { settingRouter } from "./setting.route.js";
import { validateSchema } from "../middlewares/validations/allroute.validation.js";
import { TransactionSchema } from "../zod/TicketSchema.js";
import paymentRouter from "./payment.route.js";
import authRouter from "./auth/index.js"
import settingsRouter from "./settings/settings.route.js";
import tokenVerifyRouter from "./helpers/tokenVerify.route.js";


const router = Router();
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use("/auth", signupRouter);
router.use("/user", userRouter);
router.use("/users", authRouter);

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

router.get("/demo", validateSchema(TransactionSchema), demo);

// router.use("/email", emailRouter);

router.use("/password-reset", passwordResetReqRouter);
router.use("/ticket", ticketRouter);
router.use("/setting", settingRouter);

router.use("/dispute", disputeRouter);
router.post("/user", createUser as RequestHandler);

router.use("/settings", settingsRouter);

router.use("/token", tokenVerifyRouter);
// router.use("/payment", paymentRouter);
router.use("/payment", paymentRouter)

export default router;
