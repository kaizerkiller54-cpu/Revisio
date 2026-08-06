import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest } from "../utils/errors";
import { mapActivity } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { validate } from "../middlewares/validate";
import { logUserActivity } from "../services/activity.service";

const router = Router();

const listQuerySchema = z.object({
  userId: z.string().optional(),
  actionType: z.string().optional(),
  search: z.string().optional(),
});

const createSchema = z.object({
  actionType: z.string().min(1, "Le type d'action est requis."),
  description: z.string().min(1, "La description est requise."),
  targetId: z.string().optional(),
  targetTitle: z.string().optional(),
});

router.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { userId, actionType, search } = req.query as z.infer<typeof listQuerySchema>;
    const where: Prisma.UserActivityWhereInput = {};

    if (userId && userId !== "all") {
      where.OR = [{ userId }, { userEmail: { equals: userId.toLowerCase(), mode: "insensitive" } }];
    }
    if (actionType && actionType !== "all") {
      where.actionType = actionType;
    }
    if (search) {
      const q = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { userNom: { contains: q, mode: "insensitive" } },
            { userEmail: { contains: q, mode: "insensitive" } },
            { actionType: { contains: q, mode: "insensitive" } },
            { targetTitle: { contains: q, mode: "insensitive" } },
          ],
        },
      ];
    }

    const rows = await prisma.userActivity.findMany({ where, orderBy: { timestamp: "desc" } });
    res.json(rows.map(mapActivity));
  })
);

router.post(
  "/",
  authenticateJWT,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { actionType, description, targetId, targetTitle } = req.body;
    const user = req.user!;
    const act = await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType,
      description,
      targetId,
      targetTitle,
    });
    res.status(201).json(mapActivity(act));
  })
);

export default router;
