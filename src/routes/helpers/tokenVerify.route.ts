import { Router } from "express";
import { verifyTokenController } from "../../controllers/helpers/verifyTokenController.js";

const tokenVerifyRouter = Router();

tokenVerifyRouter.post("/verify-token",
    verifyTokenController);

export default tokenVerifyRouter;