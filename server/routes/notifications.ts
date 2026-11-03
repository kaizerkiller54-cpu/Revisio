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

function receiptKey(userId: string, notificationId: string) {
  return { userId_notificationId: { userId, notificationId } };
}

router.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(req.user!) } },
      orderBy: { createdAt: "desc" },
    });
    const receipts = await prisma.notificationReceipt.findMany({
      where: { userId: req.user!.id, notificationId: { in: rows.map((row) => row.id) } },
    });
    const receiptsByNotification = new Map(receipts.map((receipt) => [receipt.notificationId, receipt]));
    const visibleRows = rows.flatMap((row) => {
      const receipt = receiptsByNotification.get(row.id);
      if (receipt?.deletedAt) return [];
      const isShared = row.userId !== req.user!.id;
      return [mapNotification({
        ...row,
        lue: isShared ? !!receipt?.readAt : row.lue || !!receipt?.readAt,
      })];
    });
    res.json(visibleRows);
  })
);

router.put(
  "/read-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user) } },
      select: { id: true, userId: true },
    });
    const personalIds = rows.filter((row) => row.userId === user.id).map((row) => row.id);
    const sharedIds = rows.filter((row) => row.userId !== user.id).map((row) => row.id);
    const readAt = new Date();
    await prisma.$transaction([
      prisma.userNotification.updateMany({
        where: { id: { in: personalIds }, userId: user.id },
        data: { lue: true },
      }),
      ...sharedIds.map((notificationId) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, notificationId),
        create: { userId: user.id, notificationId, readAt },
        update: { readAt, deletedAt: null },
      })),
    ]);
    res.json({ message: "Toutes les notifications ont été marquées comme lues.", count: rows.length });
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
    if (notif.userId === req.user!.id) {
      const updated = await prisma.userNotification.update({
        where: { id: notif.id },
        data: { lue: true },
      });
      return res.json({ message: "Notification marquée comme lue.", notification: mapNotification(updated) });
    }
    const readAt = new Date();
    await prisma.notificationReceipt.upsert({
      where: receiptKey(req.user!.id, notif.id),
      create: { userId: req.user!.id, notificationId: notif.id, readAt },
      update: { readAt, deletedAt: null },
    });
    res.json({
      message: "Notification marquée comme lue.",
      notification: mapNotification({ ...notif, lue: true }),
    });
  })
);

router.delete(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const shared = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user), not: user.id } },
      select: { id: true },
    });
    const deletedAt = new Date();
    const results = await prisma.$transaction([
      prisma.userNotification.deleteMany({ where: { userId: user.id } }),
      ...shared.map(({ id }) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, id),
        create: { userId: user.id, notificationId: id, deletedAt },
        update: { deletedAt },
      })),
    ]);
    res.json({ message: "Toutes les notifications ont été effacées.", count: results[0].count + shared.length });
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
    if (notif.userId === req.user!.id) {
      await prisma.userNotification.delete({ where: { id: notif.id } });
    } else {
      const deletedAt = new Date();
      await prisma.notificationReceipt.upsert({
        where: receiptKey(req.user!.id, notif.id),
        create: { userId: req.user!.id, notificationId: notif.id, deletedAt },
        update: { deletedAt },
      });
    }
    res.json({ message: "Notification supprimée." });
  })
);

export default router;
