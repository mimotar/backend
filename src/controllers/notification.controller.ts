import { Request, Response, NextFunction } from "express";
import {
  createNotificationService,
  getUserNotificationsService,
  markAsReadService,
  markAllAsReadService,
  deleteNotificationService,
  CreateNotificationDto
} from "../services/notification/notification.service.js";

export const createNotificationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data: CreateNotificationDto = req.body;
    const notification = await createNotificationService(data);
    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      data: notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const getUserNotificationsController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const notifications = await getUserNotificationsService(Number(userId));
    res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const markAsReadController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;
    const notificationId = Number(req.params.id);

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const notification = await markAsReadService(notificationId, Number(userId));
    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error: any) {
    res.status(error.message === "Notification not found" ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};

export const markAllAsReadController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await markAllAsReadService(Number(userId));
    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal server error",
    });
  }
};

export const deleteNotificationController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user as any;
    const userId = user?.id || user?.userId;
    const notificationId = Number(req.params.id);

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    await deleteNotificationService(notificationId, Number(userId));
    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error: any) {
    res.status(error.message === "Notification not found" ? 404 : 500).json({
      success: false,
      message: error.message,
    });
  }
};
