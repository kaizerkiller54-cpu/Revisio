import { Router } from "express";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";

const router = Router();

async function computeStats() {
  const [totalUsers, totalDocuments, documentsPublies, documentsEnAttente, totalContributions, totalAuditLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.document.count({ where: { statut: "Publie", visible: true } }),
      prisma.contribution.count({ where: { statut: "En_attente" } }),
      prisma.contribution.count(),
      prisma.auditLog.count(),
    ]);

  return {
    totalUsers,
    totalDocuments,
    documentsPublies,
    documentsEnAttente,
    totalContributions,
    totalAuditLogs,
  };
}

router.get(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

router.get(
  "/stats",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

router.get(
  "/dashboard",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

export default router;
