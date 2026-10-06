import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, notFound } from "../utils/errors";
import { mapContribution, mapDocument, semestreToDb, statutToDb } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import { uploadPdf } from "../config/upload";
import { deleteStorageFileByUrl, resolvePdfUrl, uploadPdfBuffer } from "../services/supabase";
import { logUserActivity } from "../services/activity.service";
import { logAdminAction } from "../services/audit.service";
import { createNotification } from "../services/notification.service";

const router = Router();

const uuidParam = z.object({ id: z.string().uuid("Identifiant invalide.") });

const submitSchema = z.object({
  anneeAcademique: z.string().max(20).optional(),
  matiere: z.string().max(120).optional(),
  semestre: z.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]).optional(),
  titre: z.string().max(200).optional(),
  commentaire: z.string().max(2000).optional(),
  fichierUrl: z
    .string()
    .max(23_000_000, "Le fichier est trop volumineux (maximum 15 Mo).")
    .optional(),
  fichierNom: z.string().max(255).optional(),
});

const approveSchema = z.object({
  titre: z.string().min(2, "Le titre est requis.").max(200),
  matiere: z.string().min(2, "La matière est requise.").max(120),
  semestre: z.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]),
  anneeAcademique: z.string().min(4, "L'année académique est requise.").max(20),
});

router.get(
  "/my",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.contribution.findMany({
      where: { utilisateurId: req.user!.id },
      orderBy: { dateEnvoi: "desc" },
    });
    res.json(rows.map(mapContribution));
  })
);

router.post(
  "/",
  authenticateJWT,
  uploadPdf.single("fichier"),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, string>;
    const user = req.user!;

    let fichierUrl = body.fichierUrl;
    let fichierNom = body.fichierNom || "Epreuve_Soumise.pdf";
    if (req.file) {
      fichierUrl = await uploadPdfBuffer(req.file.buffer, req.file.originalname);
      fichierNom = req.file.originalname;
    } else if (fichierUrl) {
      fichierUrl = await resolvePdfUrl(fichierUrl, fichierNom);
    }
    if (!fichierUrl) {
      throw badRequest("Veuillez joindre un fichier PDF de l'épreuve.");
    }

    const contribution = await prisma.contribution.create({
      data: {
        utilisateurId: user.id,
        utilisateurNom: `${user.prenom} ${user.nom}`,
        utilisateurEmail: user.email,
        anneeAcademique: body.anneeAcademique || "2025-2026",
        matiere: body.matiere || "Analyse 1",
        semestre: body.semestre ? semestreToDb(body.semestre) : "Semestre_1",
        typeEpreuve: (body.typeEpreuve as "CC" | "SN" | "SR" | "TD" | "TP" | "Cours") || "SN",
        titre: body.titre || null,
        commentaire: body.commentaire?.trim() || null,
        fichierUrl,
        fichierNom,
        statut: "En_attente",
      },
    });

    await logUserActivity(
      {
        userId: user.id,
        userNom: contribution.utilisateurNom,
        userEmail: contribution.utilisateurEmail,
        userRole: user.role,
        actionType: "SUBMIT_CONTRIBUTION",
        description: `A soumis l'épreuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere} ${contribution.anneeAcademique}) pour modération.`,
        targetId: contribution.id,
        targetTitle: contribution.titre || contribution.fichierNom,
      },
    );

    await createNotification(
      user.id,
      "Sujet transmis avec succès",
      `Votre épreuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere}) a bien été reçue et est en cours de modération.`,
      "info"
    );
    await createNotification(
      "ADMINS",
      "Nouvelle épreuve en attente de modération",
      `${contribution.utilisateurNom} a déposé l'épreuve '${contribution.titre || contribution.fichierNom}' pour la matière ${contribution.matiere}.`,
      "warning",
      "admin-documents"
    );

    res.status(201).json({
      message: "Votre épreuve a été transmise avec succès ! Elle est en cours de validation par l'administration.",
      contribution: mapContribution(contribution),
    });
  })
);

router.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { statut } = req.query;
    const where = statut ? { statut: statutToDb(statut as string) } : {};
    const rows = await prisma.contribution.findMany({
      where,
      orderBy: { dateEnvoi: "desc" },
    });
    res.json(rows.map(mapContribution));
  })
);

const approveHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body as z.infer<typeof approveSchema>;

  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }

  const semestre = semestreToDb(body.semestre);

  let matiere = await prisma.matiere.findFirst({ where: { nom: body.matiere } });
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: { nom: body.matiere, code: `AUTO-${Date.now()}`, semestre },
    });
  }

  const [updated, doc] = await prisma.$transaction([
    prisma.contribution.update({ where: { id }, data: { statut: "Publie" } }),
    prisma.document.create({
      data: {
        titre: body.titre.trim(),
        matiereId: matiere.id,
        semestre,
        typeEpreuve: body.typeEpreuve,
        anneeAcademique: body.anneeAcademique,
        fichierUrl: contribution.fichierUrl,
        fichierNom: contribution.fichierNom,
        statut: "Publie",
        datePublication: new Date(),
        contributionId: contribution.id,
      },
      include: { matiere: true },
    }),
  ]);

  await logAdminAction({
    adminId: req.user!.id,
    adminNom: `${req.user!.prenom} ${req.user!.nom}`,
    adminEmail: req.user!.email,
    action: "APPROVE_CONTRIBUTION",
    details: `A approuvé et publié l'épreuve '${doc.titre}' (${body.matiere} - ${body.typeEpreuve} ${body.anneeAcademique}) soumise par ${contribution.utilisateurNom}.`,
    targetId: doc.id,
    targetName: doc.titre,
  });

  await createNotification(
    contribution.utilisateurId,
    "Épreuve Approuvée & Publiée !",
    `Félicitations ! Votre sujet '${doc.titre}' pour ${body.matiere} a été validé par l'administration et est désormais disponible en ligne.`,
    "success",
    "exams"
  );

  res.json({
    message: "Document approuvé et publié avec succès sur la plateforme !",
    document: mapDocument(doc),
    contribution: mapContribution(updated),
  });
});

const rejectHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }

  const updated = await prisma.contribution.update({
    where: { id },
    data: { statut: "Refuse" },
  });
  await deleteStorageFileByUrl(contribution.statut === "Publie" ? "" : contribution.fichierUrl ?? "");

  await logAdminAction({
    adminId: req.user!.id,
    adminNom: `${req.user!.prenom} ${req.user!.nom}`,
    adminEmail: req.user!.email,
    action: "REJECT_CONTRIBUTION",
    details: `A refusé la contribution '${contribution.titre || contribution.fichierNom}' soumise par ${contribution.utilisateurNom}.`,
    targetId: contribution.id,
    targetName: contribution.fichierNom,
  });

  await createNotification(
    contribution.utilisateurId,
    "Soumission non retenue",
    `Votre soumission '${contribution.titre || contribution.fichierNom}' pour ${contribution.matiere} n'a pas été validée par l'administration.`,
    "error"
  );

  res.json({ message: "Contribution refusée.", contribution: mapContribution(updated) });
});

router.put("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam, "params"), validate(approveSchema), approveHandler);
router.post("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam, "params"), validate(approveSchema), approveHandler);
router.put("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam, "params"), rejectHandler);
router.post("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam, "params"), rejectHandler);

export default router;
