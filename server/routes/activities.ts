import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { mapActivity } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { logUserActivity } from "../services/activity.service";

const router = Router();

const uuidParam = z.object({ id: z.string().uuid("Identifiant invalide.") });

const ALLOWED_ACTION_TYPES = [
  "REGISTER",
  "LOGIN",
  "DOWNLOAD_DOCUMENT",
  "SUBMIT_CONTRIBUTION",
  "APPROVE_CONTRIBUTION",
  "REJECT_CONTRIBUTION",
  "CREATE_DOCUMENT",
  "DELETE_DOCUMENT",
  "ADD_MATIERE",
  "UPDATE_DOCUMENT",
  "DELETE_USER",
  "CREATE_USER",
  "CHANGE_USER_ROLE",
];

const listQuerySchema = z.object({
  actionType: z.string().max(50).optional(),
  actionTypes: z.string().max(300).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const createSchema = z.object({
  actionType: z.enum(ALLOWED_ACTION_TYPES as [string, ...string[]]),
  description: z.string().min(1, "La description est requise.").max(500, "La description est trop longue."),
  targetId: z.string().uuid().optional(),
  targetTitle: z.string().max(200).optional(),
});

router.get(
  "/",
  authenticateJWT,
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { actionType, actionTypes, search, page = 1, pageSize = 50 } = req.query as z.infer<typeof listQuerySchema>;
    const user = req.user!;
    const where: Prisma.UserActivityWhereInput = {};

    // SuperAdmin voit tout, les autres ne voient que leurs propres activités
    if (user.role !== "SuperAdministrateur") {
      where.userId = user.id;
    }

    if (actionTypes) {
      const types = actionTypes.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length) {
        where.actionType = { in: types };
      }
    } else if (actionType && actionType !== "all") {
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

    const [rows, total, groupAgg] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userActivity.count({ where }),
      prisma.userActivity.groupBy({
        by: ["actionType"],
        where: user.role !== "SuperAdministrateur" ? { userId: user.id } : {},
        _count: { _all: true },
      }),
    ]);

    const countByType: Record<string, number> = {};
    for (const g of groupAgg) {
      countByType[g.actionType] = g._count._all;
    }

    const counts = Object.fromEntries(
      Object.entries(CATEGORY_ACTION_TYPES).map(([key, types]) => [
        key,
        types.reduce((sum, t) => sum + (countByType[t] ?? 0), 0),
      ])
    );

    res.json({
      data: rows.map(mapActivity),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts,
    });
  })
);

const CATEGORY_ACTION_TYPES: Record<string, string[]> = {
  download: ["DOWNLOAD_DOCUMENT"],
  submit: ["SUBMIT_CONTRIBUTION"],
  moderation: ["APPROVE_CONTRIBUTION", "REJECT_CONTRIBUTION", "CREATE_DOCUMENT", "DELETE_DOCUMENT"],
};

router.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
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