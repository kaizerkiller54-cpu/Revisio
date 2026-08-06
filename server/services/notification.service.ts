import { NotificationType } from "@prisma/client";
import { prisma } from "../prisma/client";

export async function createNotification(
  userId: string,
  titre: string,
  message: string,
  type: NotificationType = "info",
  linkTab?: string
) {
  return prisma.userNotification.create({
    data: { userId, titre, message, type, linkTab: linkTab ?? null },
  });
}
