import { Router } from "express";
import {
  getKycChannelsController,
  getKycStatusController,
  verifyIdentityController,
} from "../../controllers/withdrawal/kyc.controller.js";
import { authenticateTokenMiddleware } from "../../middlewares/authenticateTokenMiddleware.js";

const kycRouter = Router();

kycRouter.get("/channels", getKycChannelsController);
kycRouter.get("/status", authenticateTokenMiddleware, getKycStatusController);
kycRouter.post("/verify", authenticateTokenMiddleware, verifyIdentityController);

export default kycRouter;
