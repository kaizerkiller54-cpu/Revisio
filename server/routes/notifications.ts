import { Router } from "express";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { mapNotification } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";

const router = Router();

function resolveUserContext(req: any): { userId: string; userRole: string } {
  if (req.user) {
    return { userId: req.user.id, userRole: req.user.role };
  }
  const userId = (req.headers["x-user-id"] as string) || "user-1";
  const userRole = (req.headers["x-user-role"] as string) || "Etudiant";
  return { userId, userRole };
}

router.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = resolveUserContext(req);
    const rows = await prisma.userNotification.findMany({
      where: {
        OR: [
          { userId: "ALL" },
          { userId },
          ...(userRole === "Administrateur" || userRole === "SuperAdministrateur" ? [{ userId: "ADMINS" }] : []),
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(mapNotification));
  })
);

router.put(
  "/:id/read",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.update({
      where: { id: req.params.id },
      data: { lue: true },
    });
    res.json({ message: "Notification marquée comme lue.", notification: mapNotification(notif) });
  })
);

router.put(
  "/read-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = resolveUserContext(req);
    const results = await prisma.userNotification.updateMany({
      where: {
        OR: [
          { userId: "ALL" },
          { userId },
          ...(userRole === "Administrateur" || userRole === "SuperAdministrateur" ? [{ userId: "ADMINS" }] : []),
        ],
        lue: false,
      },
      data: { lue: true },
    });
    res.json({ message: "Toutes les notifications ont été marquées comme lues.", count: results.count });
  })
);

router.delete(
  "/:id",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    await prisma.userNotification.delete({ where: { id: req.params.id } });
    res.json({ message: "Notification supprimée." });
  })
);

router.delete(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { userId, userRole } = resolveUserContext(req);
    const results = await prisma.userNotification.deleteMany({
      where: {
        OR: [
          { userId },
          ...(userRole === "Administrateur" || userRole === "SuperAdministrateur" ? [{ userId: "ADMINS" }] : []),
        ],
      },
    });
    res.json({ message: "Toutes les notifications ont été effacées.", count: results.count });
  })
);

export default router;
