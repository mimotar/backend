import { Router } from "express";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { getWalletBalances } from "../controllers/wallet/wallet.controller.js";

const router = Router();

router.use(authenticateTokenMiddleware as any);
router.get("/balances", getWalletBalances as any);

export default router;
