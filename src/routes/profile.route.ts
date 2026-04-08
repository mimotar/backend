import express from "express";
import { getProfileController, updateProfileController, uploadAvatarController } from "../controllers/profile.controller.js";
import { upload } from "../config/cloudinary.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";

const profileRouter = express.Router();

profileRouter.get("/", authenticateTokenMiddleware, getProfileController);
profileRouter.put("/", authenticateTokenMiddleware, updateProfileController);
profileRouter.post("/avatar", authenticateTokenMiddleware, upload.single("avatar"), uploadAvatarController);

export default profileRouter;
