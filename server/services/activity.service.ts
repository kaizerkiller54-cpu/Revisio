import { Role } from "@prisma/client";
import { prisma } from "../prisma/client";

export interface ActivityInput {
  userId: string;
  userNom: string;
  userEmail: string;
  userRole: string;
  actionType: string;
  description: string;
  targetId?: string;
  targetTitle?: string;
}

export async function logUserActivity(input: ActivityInput) {
  return prisma.userActivity.create({
    data: {
      userId: input.userId,
      userNom: input.userNom,
      userEmail: input.userEmail,
      userRole: input.userRole as Role,
      actionType: input.actionType,
      description: input.description,
      targetId: input.targetId ?? null,
      targetTitle: input.targetTitle ?? null,
    },
  });
}
