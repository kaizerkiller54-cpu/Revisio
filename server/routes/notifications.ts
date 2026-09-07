import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { notFound } from "../utils/errors";
import { mapNotification } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { validate } from "../middlewares/validate";

const router = Router();

const uuidParam = z.object({ id: z.string().uuid("Identifiant invalide.") });

function visibleIds(user: { id: string; role: string }): string[] {
  if (user.role === "Administrateur" || user.role === "SuperAdministrateur") {
    return [user.id, "ALL", "ADMINS"];
  }
  return [user.id, "ALL"];
}

router.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(req.user!) } },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows.map(mapNotification));
  })
);

router.put(
  "/read-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const results = await prisma.userNotification.updateMany({
      where: { userId: { in: visibleIds(req.user!) }, lue: false },
      data: { lue: true },
    });
    res.json({ message: "Toutes les notifications ont été marquées comme lues.", count: results.count });
  })
);

router.put(
  "/:id/read",
  authenticateJWT,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user!).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    const updated = await prisma.userNotification.update({ where: { id: notif.id }, data: { lue: true } });
    res.json({ message: "Notification marquée comme lue.", notification: mapNotification(updated) });
  })
);

router.delete(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const results = await prisma.userNotification.deleteMany({
      where: { userId: { in: visibleIds(req.user!) } },
    });
    res.json({ message: "Toutes les notifications ont été effacées.", count: results.count });
  })
);

router.delete(
  "/:id",
  authenticateJWT,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user!).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    await prisma.userNotification.delete({ where: { id: notif.id } });
    res.json({ message: "Notification supprimée." });
  })
);

export default router;
