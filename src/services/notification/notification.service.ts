import prisma from "../../utils/prisma.js";

export interface CreateNotificationDto {
  title: string;
  content?: string;
  link?: string;
  avatar: string;
  sender_user_id?: number | null;
  receiver_user_id: number;
}

export const createNotificationService = async (data: CreateNotificationDto) => {
  return await prisma.notification.create({
    data: {
      ...data,
      read: "unread",
    },
  });
};

export const getUserNotificationsService = async (userId: number) => {
  return await prisma.notification.findMany({
    where: { receiver_user_id: userId },
    orderBy: { timestamp: "desc" },
  });
};

export const markAsReadService = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.receiver_user_id !== userId) {
    throw new Error("Notification not found");
  }

  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: "read" },
  });
};

export const markAllAsReadService = async (userId: number) => {
  return await prisma.notification.updateMany({
    where: { receiver_user_id: userId, read: "unread" },
    data: { read: "read" },
  });
};

export const deleteNotificationService = async (notificationId: number, userId: number) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.receiver_user_id !== userId) {
    throw new Error("Notification not found");
  }

  return await prisma.notification.delete({
    where: { id: notificationId },
  });
};

export const systemDispatchNotificationByEmail = async (
  email: string,
  title: string,
  content?: string,
  link?: string
) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await createNotificationService({
        title,
        content,
        link,
        avatar: "https://ui-avatars.com/api/?name=System+Notification&background=random",
        sender_user_id: null,
        receiver_user_id: user.id,
      });
    }
  } catch (error) {
    console.error("Failed to dispatch system notification by email:", error);
  }
};