import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/errors";
import { mapDocument, semestreToDb, statutToDb } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { downloadRateLimiter } from "../middlewares/rateLimit";
import { logUserActivity } from "../services/activity.service";
import { logAdminAction } from "../services/audit.service";
import { deleteStorageFileByUrl, resolvePdfUrl } from "../services/supabase";

const router = Router();

const listQuerySchema = z.object({
  search: z.string().optional(),
  matiere: z.string().optional(),
  semestre: z.string().optional(),
  typeEpreuve: z.string().optional(),
  anneeAcademique: z.string().optional(),
  statut: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const createSchema = z.object({
  titre: z.string().min(2, "Le titre est requis."),
  matiere: z.string().min(2, "La matière est requise."),
  semestre: z.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z.enum(["CC", "SN", "SR"]),
  anneeAcademique: z.string().min(4, "L'année académique est requise."),
  fichierUrl: z.string().min(1, "Le fichier est requis."),
  fichierNom: z.string().min(1, "Le nom du fichier est requis."),
});

const updateSchema = z.object({
  titre: z.string().min(2).optional(),
  matiere: z.string().min(2).optional(),
  semestre: z.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z.enum(["CC", "SN", "SR"]).optional(),
  anneeAcademique: z.string().min(4).optional(),
});

async function resolveMatiere(matiereNom: string, semestre: "Semestre 1" | "Semestre 2") {
  let matiere = await prisma.matiere.findFirst({ where: { nom: matiereNom } });
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: {
        nom: matiereNom,
        code: `AUTO-${Date.now()}`,
        semestre: semestreToDb(semestre),
      },
    });
  }
  return matiere;
}

router.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { search, matiere, semestre, typeEpreuve, anneeAcademique, statut, page, pageSize } = req.query as z.infer<typeof listQuerySchema>;

    const where: Prisma.DocumentWhereInput = {};
    where.statut = statut ? statutToDb(statut) : "Publie";

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { titre: { contains: q, mode: "insensitive" } },
        { anneeAcademique: { contains: q, mode: "insensitive" } },
        { matiere: { nom: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (matiere && matiere !== "Toutes") {
      where.matiere = { nom: matiere };
    }
    if (semestre && semestre !== "Tous") {
      where.semestre = semestreToDb(semestre);
    }
    if (typeEpreuve && typeEpreuve !== "Tous") {
      where.typeEpreuve = typeEpreuve as "CC" | "SN" | "SR";
    }
    if (anneeAcademique && anneeAcademique !== "Toutes") {
      where.anneeAcademique = anneeAcademique;
    }

    const orderBy = { createdAt: "desc" as const };

    if (page && pageSize) {
      const [rows, total] = await Promise.all([
        prisma.document.findMany({ where, include: { matiere: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.document.count({ where }),
      ]);
      return res.json({ data: rows.map(mapDocument), total, page, pageSize });
    }

    const rows = await prisma.document.findMany({ where, include: { matiere: true }, orderBy });
    res.json(rows.map(mapDocument));
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!doc) {
      throw notFound("Épreuve non trouvée.");
    }
    res.json(mapDocument(doc));
  })
);

router.post(
  "/:id/download",
  authenticateJWT,
  downloadRateLimiter,
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc) {
      throw notFound("Épreuve non trouvée.");
    }
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { telechargementsCount: { increment: 1 } },
    });

    await logUserActivity({
      userId: req.user!.id,
      userNom: `${req.user!.prenom} ${req.user!.nom}`,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      actionType: "DOWNLOAD_DOCUMENT",
      description: `A téléchargé l'épreuve '${doc.titre}' (${doc.matiereId}).`,
      targetId: doc.id,
      targetTitle: doc.titre,
    });

    res.json({
      success: true,
      telechargementsCount: updated.telechargementsCount,
      fichierUrl: doc.fichierUrl,
      fichierNom: doc.fichierNom,
    });
  })
);

router.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { titre, matiere, semestre, typeEpreuve, anneeAcademique, fichierUrl, fichierNom } = req.body;
    const matiereRow = await resolveMatiere(matiere, semestre);
    const fichierStorageUrl = await resolvePdfUrl(fichierUrl, fichierNom);

    const doc = await prisma.document.create({
      data: {
        titre: titre.trim(),
        matiereId: matiereRow.id,
        semestre: semestreToDb(semestre),
        typeEpreuve,
        anneeAcademique,
        fichierUrl: fichierStorageUrl,
        fichierNom,
        statut: "Publie",
        datePublication: new Date(),
      },
    });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "CREATE_DOCUMENT",
      details: `A créé et publié l'épreuve '${doc.titre}' (${matiere} ${anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre,
    });

    res.status(201).json({ message: "Document créé et publié avec succès.", document: mapDocument({ ...doc, matiere: matiereRow }) });
  })
);

router.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouvé.");
    }
    const { titre, matiere, semestre, typeEpreuve, anneeAcademique } = req.body;

    let matiereId = existing.matiereId;
    if (matiere) {
      const matiereRow = await resolveMatiere(matiere, semestre ?? (existing.semestre === "Semestre_2" ? "Semestre 2" : "Semestre 1"));
      matiereId = matiereRow.id;
    }

    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: {
        titre: titre ?? existing.titre,
        matiereId,
        semestre: semestre ? semestreToDb(semestre) : existing.semestre,
        typeEpreuve: typeEpreuve ?? existing.typeEpreuve,
        anneeAcademique: anneeAcademique ?? existing.anneeAcademique,
      },
      include: { matiere: true },
    });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "UPDATE_DOCUMENT",
      details: `A modifié la fiche de l'épreuve '${doc.titre}' (${doc.matiere.nom} ${doc.anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre,
    });

    res.json({ message: "Informations mises à jour avec succès.", document: mapDocument(doc) });
  })
);

router.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouvé.");
    }

    await prisma.document.delete({ where: { id: existing.id } });
    await deleteStorageFileByUrl(existing.fichierUrl ?? "");

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "DELETE_DOCUMENT",
      details: `A supprimé l'épreuve publique '${existing.titre}'.`,
      targetId: existing.id,
      targetName: existing.titre,
    });

    res.json({ message: "Document supprimé avec succès." });
  })
);

export default router;
