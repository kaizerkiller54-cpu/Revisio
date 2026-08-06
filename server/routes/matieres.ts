import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/errors";
import { mapMatiere, semestreToDb } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { logAdminAction } from "../services/audit.service";

const router = Router();

const createSchema = z.object({
  nom: z.string().min(2, "Le nom de la matière est requis."),
  code: z.string().min(2, "Le code est requis."),
  semestre: z.enum(["Semestre 1", "Semestre 2"]),
  description: z.string().optional(),
});

const updateSchema = createSchema.partial();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const matieres = await prisma.matiere.findMany({ orderBy: [{ semestre: "asc" }, { nom: "asc" }] });
    const docsByMatiere = await prisma.document.groupBy({
      by: ["matiereId"],
      where: { statut: "Publie" },
      _count: { _all: true },
    });
    const countMap = new Map(docsByMatiere.map((d) => [d.matiereId, d._count._all]));

    res.json(matieres.map((m) => mapMatiere(m, countMap.get(m.id) ?? 0)));
  })
);

router.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { nom, code, semestre, description } = req.body;
    const existing = await prisma.matiere.findUnique({ where: { code: code.trim() } });
    if (existing) {
      throw badRequest("Un code de matière existe déjà.");
    }
    const matiere = await prisma.matiere.create({
      data: { nom: nom.trim(), code: code.trim(), semestre: semestreToDb(semestre), description: description?.trim() || null },
    });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "ADD_MATIERE",
      details: `A ajouté la matière '${matiere.nom}' (${matiere.code}).`,
      targetId: matiere.id,
      targetName: matiere.nom,
    });

    res.status(201).json({ message: "Matière créée avec succès.", matiere: mapMatiere(matiere, 0) });
  })
);

router.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Matière introuvable.");
    }
    const { nom, code, semestre, description } = req.body;
    const matiere = await prisma.matiere.update({
      where: { id: existing.id },
      data: {
        nom: nom?.trim() ?? existing.nom,
        code: code?.trim() ?? existing.code,
        semestre: semestre ? semestreToDb(semestre) : existing.semestre,
        description: description !== undefined ? (description.trim() || null) : existing.description,
      },
    });
    res.json({ message: "Matière mise à jour avec succès.", matiere: mapMatiere(matiere, 0) });
  })
);

router.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Matière introuvable.");
    }
    await prisma.matiere.delete({ where: { id: existing.id } });
    res.json({ message: "Matière supprimée avec succès." });
  })
);

export default router;
