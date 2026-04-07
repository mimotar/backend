import express from "express";
import { getProfileController, updateProfileController } from "../controllers/profile.controller.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";

const profileRouter = express.Router();

profileRouter.get("/", authenticateTokenMiddleware, getProfileController);
profileRouter.put("/", authenticateTokenMiddleware, updateProfileController);

export default profileRouter;
