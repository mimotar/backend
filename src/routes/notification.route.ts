import express from "express";
import {
  createNotificationController,
  getUserNotificationsController,
  markAsReadController,
  markAllAsReadController,
  deleteNotificationController
} from "../controllers/notification.controller.js";
import { authenticateTokenMiddleware } from "../middlewares/authenticateTokenMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.post("/", authenticateTokenMiddleware, createNotificationController);
notificationRouter.get("/", authenticateTokenMiddleware, getUserNotificationsController);
notificationRouter.put("/read-all", authenticateTokenMiddleware, markAllAsReadController);
notificationRouter.put("/:id/read", authenticateTokenMiddleware, markAsReadController);
notificationRouter.delete("/:id", authenticateTokenMiddleware, deleteNotificationController);

export default notificationRouter;
