import { RequestHandler, Router } from "express";
// import emailRouter from "./emailRoute";
import signupRouter from "./auth/signup";
import { createUser, demo } from "../controllers/test/user";
import disputeRouter from "./dispute/dispute.router";
import userRouter from "./userRoutes";
import ticketRouter from "./ticket.router";
import { passwordResetReqRouter } from "./password-reset-req.router";
import { settingRouter } from "./setting.route";
import { validateSchema } from "../middlewares/validations/allroute.validation";
import { TransactionSchema } from "../zod/TicketSchema";


const router = Router();
router.get("/", (req, res) => {
  res.send("Hello World");
});

router.use("/auth", signupRouter);
router.use("/user", userRouter);

router.post("/middleware", (req, res) => {
  res.send("middleware");
});

router.get("/demo", validateSchema(TransactionSchema), demo);

// router.use("/email", emailRouter);

router.use("password-reset", passwordResetReqRouter);
router.use("/ticket", ticketRouter);
router.use("/setting", settingRouter);

router.use("/dispute", disputeRouter);
router.post("/user", createUser as RequestHandler);

export default router;
