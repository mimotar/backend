import { Router } from "express";
import { SettingController } from "../controllers/SettingController.js";
import prisma from "../utils/prisma.js";

export const settingRouter = Router();
const SettingControllerImpl = new SettingController(prisma);
settingRouter.get("/", SettingControllerImpl.find);
settingRouter.put("/update", SettingControllerImpl.update);
