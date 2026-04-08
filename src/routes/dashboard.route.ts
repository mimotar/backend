import { Router } from "express";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";
import { getDashboardSummary } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(authenticateTokenMiddleware as any);
router.get("/", getDashboardSummary as any);

export default router;
