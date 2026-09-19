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
import { downloadRateLimiter, searchRateLimiter, suggestRateLimiter } from "../middlewares/rateLimit";
import { logUserActivity } from "../services/activity.service";
import { logAdminAction } from "../services/audit.service";
import { deleteStorageFileByUrl, isSupabaseStorageUrl, resolvePdfUrl, supabaseAdmin } from "../services/supabase";
import { stampPdfWithOwner } from "../services/pdf-watermark.service";
import { ensureSearchIndexes, searchDocuments, suggestDocuments } from "../services/search.service";

const router = Router();

const uuidParam = z.object({ id: z.string().uuid("Identifiant invalide.") });

const listQuerySchema = z.object({
  search: z.string().max(200).optional(),
  matiere: z.string().max(120).optional(),
  semestre: z.string().max(20).optional(),
  typeEpreuve: z.string().max(10).optional(),
  anneeAcademique: z.string().max(20).optional(),
  statut: z.string().max(20).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

const suggestQuerySchema = z.object({
  q: z.string().min(2).max(200),
  limit: z.coerce.number().int().positive().max(10).optional(),
});

const createSchema = z.object({
  titre: z.string().min(2, "Le titre est requis.").max(200),
  matiere: z.string().min(2, "La matière est requise.").max(120),
  semestre: z.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z.enum(["CC", "SN", "SR", "TD", "TP"]),
  anneeAcademique: z.string().min(4, "L'année académique est requise.").max(20),
  fichierUrl: z
    .string()
    .min(1, "Le fichier est requis.")
    .max(23_000_000, "Le fichier est trop volumineux (maximum 15 Mo)."),
  fichierNom: z.string().min(1, "Le nom du fichier est requis.").max(255),
});

const updateSchema = z.object({
  titre: z.string().min(2).max(200).optional(),
  matiere: z.string().min(2).max(120).optional(),
  semestre: z.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z.enum(["CC", "SN", "SR", "TD", "TP"]).optional(),
  anneeAcademique: z.string().min(4).max(20).optional(),
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
    // Le public ne voit que les documents publiés : le statut est imposé,
    // quel que soit le filtre envoyé par le client.
    const isAdmin =
      req.user !== undefined &&
      (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    where.statut = isAdmin && statut ? statutToDb(statut) : "Publie";

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
      where.typeEpreuve = typeEpreuve as "CC" | "SN" | "SR" | "TD" | "TP";
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
  "/search",
  searchRateLimiter,
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query as z.infer<typeof listQuerySchema>;
    // Le statut ne peut être filtré que par un admin : le public ne voit
    // que les documents publiés, quel que soit le filtre envoyé.
    const isAdmin =
      req.user !== undefined &&
      (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    const result = await searchDocuments({
      search: query.search,
      matiere: query.matiere,
      semestre: query.semestre,
      typeEpreuve: query.typeEpreuve,
      anneeAcademique: query.anneeAcademique,
      statut: isAdmin ? query.statut : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
    res.json(result);
  })
);

router.get(
  "/suggest",
  suggestRateLimiter,
  validate(suggestQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query as { q?: string; limit?: string };
    const suggestions = await suggestDocuments(String(q ?? ""), limit ? Number(limit) : undefined);
    res.json({ data: suggestions });
  })
);

function isAdminUser(user: { role: string } | undefined): boolean {
  return user !== undefined && (user.role === "Administrateur" || user.role === "SuperAdministrateur");
}

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

function isPdfBuffer(buffer: Buffer): boolean {
  // Certains PDF valides contiennent des octets de tête avant "%PDF-"
  // (BOM, commentaires). On tolère jusqu'à 1024 octets de préambule.
  const head = buffer.subarray(0, Math.min(buffer.length, 1024 + 5));
  return head.includes(Buffer.from("%PDF-"));
}

function buildAttachmentHeader(safeName: string): string {
  const asciiName = safeName.replace(/[^\x00-\x7F]/g, "_").replace(/["\\]/g, "_") || "epreuve.pdf";
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}

router.get(
  "/:id/download",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || (doc.statut !== "Publie" && !isAdminUser(req.user))) {
      throw notFound("Épreuve non trouvée.");
    }

    const fileName = doc.fichierNom || `${doc.titre}.pdf`;
    const safeName = fileName.replace(/[^\w.\-éèêëàâîïôûùçÉÈÊËÀÂÎÏÔÛÙÇ]+/g, "_").slice(0, 180) || "epreuve.pdf";

    let buffer: Buffer;

    if (isSupabaseStorageUrl(doc.fichierUrl)) {
      const storagePath = doc.fichierUrl.split(`/storage/v1/object/public/epreuves/`)[1];
      if (!storagePath) {
        throw notFound("Fichier épreuve introuvable.");
      }
      const { data } = await supabaseAdmin.storage.from("epreuves").download(storagePath);
      if (!data) {
        throw notFound("Fichier épreuve introuvable.");
      }
      buffer = Buffer.from(await data.arrayBuffer());
    } else if (/^https:\/\//i.test(doc.fichierUrl)) {
      const response = await fetch(doc.fichierUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok || !response.body) {
        throw notFound("Fichier épreuve introuvable.");
      }
      const declared = Number(response.headers.get("content-length") ?? 0);
      if (declared > MAX_DOWNLOAD_BYTES) {
        throw notFound("Fichier épreuve introuvable.");
      }
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Seul un PDF signé (Supabase) ou une URL https sécurisée est servi :
      // aucune URL arbitraire/SSRF pour le téléchargement public.
      throw notFound("Fichier épreuve introuvable.");
    }

    if (!isPdfBuffer(buffer) || buffer.length > MAX_DOWNLOAD_BYTES) {
      throw notFound("Fichier épreuve introuvable.");
    }

    // Traçabilité anti-diffusion : les non-admins reçoivent une copie
    // tatouée à leur identité ; les admins reçoivent le fichier brut.
    let outBuffer: Buffer = buffer;
    if (!isAdminUser(req.user)) {
      const ownerName = `${req.user!.prenom} ${req.user!.nom}`.trim() || "ISJ";
      outBuffer = Buffer.from(await stampPdfWithOwner(buffer, ownerName, req.user!.email));
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

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", buildAttachmentHeader(safeName));
    res.setHeader("Content-Length", String(outBuffer.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(outBuffer);
  })
);

router.get(
  "/:id",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!doc || doc.statut !== "Publie") {
      throw notFound("Épreuve non trouvée.");
    }
    res.json(mapDocument(doc));
  })
);

router.post(
  "/:id/download",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!doc || (doc.statut !== "Publie" && !isAdminUser(req.user))) {
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
      // L'URL brute du stockage n'est exposée qu'aux admins : les autres
      // rôles téléchargent exclusivement via GET (copie tatouée).
      ...(isAdminUser(req.user) ? { fichierUrl: doc.fichierUrl } : {}),
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
  validate(uuidParam, "params"),
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
  validate(uuidParam, "params"),
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
