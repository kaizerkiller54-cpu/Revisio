import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { mapAuditLog } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";

const router = Router();

router.get(
  "/audit-logs",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { adminId, action, search } = req.query;
    const where: Prisma.AuditLogWhereInput = {};

    if (adminId && adminId !== "all") {
      where.OR = [{ adminId: adminId as string }, { adminEmail: { equals: (adminId as string).toLowerCase(), mode: "insensitive" } }];
    }
    if (action && action !== "all") {
      where.action = action as string;
    }
    if (search) {
      const q = (search as string).toLowerCase();
      where.AND = [
        {
          OR: [
            { details: { contains: q, mode: "insensitive" } },
            { adminNom: { contains: q, mode: "insensitive" } },
            { adminEmail: { contains: q, mode: "insensitive" } },
            { targetName: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const rows = await prisma.auditLog.findMany({ where, orderBy: { date: "desc" } });
    res.json(rows.map(mapAuditLog));
  })
);

export default router;
