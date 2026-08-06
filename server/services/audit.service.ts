import { prisma } from "../prisma/client";
import { logUserActivity } from "./activity.service";

export interface AdminActionInput {
  adminId: string;
  adminNom: string;
  adminEmail: string;
  action: string;
  details: string;
  targetId?: string;
  targetName?: string;
}

export async function logAdminAction(input: AdminActionInput) {
  const log = await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      adminNom: input.adminNom,
      adminEmail: input.adminEmail,
      action: input.action,
      details: input.details,
      targetId: input.targetId ?? null,
      targetName: input.targetName ?? null,
    },
  });

  await logUserActivity({
    userId: input.adminId,
    userNom: input.adminNom,
    userEmail: input.adminEmail,
    userRole: "Administrateur",
    actionType: input.action,
    description: input.details,
    targetId: input.targetId,
    targetTitle: input.targetName,
  });

  return log;
}
