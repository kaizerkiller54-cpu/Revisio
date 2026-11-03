import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { badRequest, forbidden, notFound } from "../utils/errors";
import { mapUser } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import {
  createSupabaseUser,
  deleteSupabaseUser,
  signInSupabase,
  updateSupabaseEmail,
  updateSupabasePassword,
  updateSupabasePhone,
} from "../services/auth.service";
import { logAdminAction } from "../services/audit.service";
import { createNotification } from "../services/notification.service";

const router = Router();

const uuidParam = z.object({ id: z.string().uuid("Identifiant invalide.") });

const profileSchema = z.object({
  nom: z.string().min(2).max(80).optional(),
  prenom: z.string().min(2).max(80).optional(),
  email: z.string().email().max(200).optional(),
  telephone: z.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres après +237)").optional().nullable(),
  currentMotDePasse: z.string().min(1).max(128).optional(),
  nouveauMotDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128)
    .regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
    .regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caractère spécial.").optional(),
});

const createUserSchema = z.object({
  nom: z.string().min(2).max(80),
  prenom: z.string().min(2).max(80),
  email: z.string().email().max(200),
  role: z.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]).optional(),
  telephone: z.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres après +237)").optional().nullable(),
  motDePasse: z.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9\s]/).optional(),
});

const updateRoleSchema = z.object({
  role: z.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]),
});

// PUT /api/users/profile — update own profile
router.put(
  "/profile",
  authenticateJWT,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw notFound("Utilisateur non trouvé.");
    }
    const { nom, prenom, email, telephone, nouveauMotDePasse, currentMotDePasse } = req.body;

    let newEmail = user.email;
    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        throw badRequest("Cette adresse e-mail est déjà utilisée par un autre compte.");
      }
      newEmail = email.trim().toLowerCase();
    }

    const newTelephone = telephone !== undefined ? (telephone?.trim() || null) : user.telephone;

    const requiresReauthentication = newEmail !== user.email || !!nouveauMotDePasse;
    if (requiresReauthentication) {
      if (!currentMotDePasse) {
        throw badRequest("Confirmez votre mot de passe actuel pour modifier l'e-mail ou le mot de passe.");
      }
      await signInSupabase(user.email, currentMotDePasse);
    }

    if (newEmail !== user.email) {
      await updateSupabaseEmail(user.id, newEmail);
    }
    if (newTelephone !== user.telephone) {
      await updateSupabasePhone(user.id, newTelephone);
    }
    if (nouveauMotDePasse) {
      await updateSupabasePassword(user.id, nouveauMotDePasse.trim());
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: nom?.trim().toUpperCase() ?? user.nom,
        prenom: prenom?.trim() ?? user.prenom,
        email: newEmail,
        telephone: newTelephone,
      },
    });

    res.json({ user: mapUser(updated), message: "Vos informations de profil ont été mises à jour avec succès !" });
  })
);

// GET /api/users — superadmin only
router.get(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(mapUser));
  })
);

// POST /api/users — superadmin creates a user/admin
router.post(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, role, telephone, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Un utilisateur avec cet e-mail existe déjà.");
    }
    const assignedRole = role ?? "Administrateur";
    const trimmedTelephone = telephone?.trim() || null;
    // Pas de mot de passe par défaut codé en dur : un mot de passe fort
    // aléatoire est généré et renvoyé une seule fois à l'administrateur.
    const temporaryPassword = motDePasse?.trim() || `${randomBytes(18).toString("base64url")}aA1!`;
    const authId = await createSupabaseUser(trimmedEmail, temporaryPassword, trimmedTelephone ?? undefined);
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
        telephone: trimmedTelephone,
        role: assignedRole,
      },
    });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "CREATE_USER",
      details: `A créé le compte '${user.prenom} ${user.nom}' (${user.email}) attribué au rôle '${user.role}'.`,
      targetId: user.id,
      targetName: `${user.prenom} ${user.nom}`,
    });

    res.status(201).json({
      message: motDePasse
        ? "Utilisateur créé avec succès."
        : "Utilisateur créé avec succès. Un mot de passe temporaire aléatoire lui a été attribué.",
      user: mapUser(user),
      ...(motDePasse ? {} : { temporaryPassword }),
    });
  })
);

// PUT /api/users/:id/role — superadmin elevates role
router.put(
  "/:id/role",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam, "params"),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouvé.");
    }
    if (target.id === req.user!.id) {
      throw forbidden("Vous ne pouvez pas modifier votre propre rôle.");
    }
    const { role } = req.body;
    const oldRole = target.role;
    const updated = await prisma.user.update({ where: { id: target.id }, data: { role } });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "CHANGE_USER_ROLE",
      details: `A modifié le rôle de ${updated.prenom} ${updated.nom} (${updated.email}) de '${oldRole}' à '${role}'.`,
      targetId: updated.id,
      targetName: `${updated.prenom} ${updated.nom}`,
    });

    await createNotification(
      updated.id,
      "Élévation / Modification de Rôle",
      `Félicitations ! Vos privilèges système sur la plateforme ISJ Revisio ont été mis à jour au statut '${role}'.`,
      role === "Administrateur" || role === "SuperAdministrateur" ? "success" : "info",
      role === "Administrateur" ? "admin-dashboard" : role === "SuperAdministrateur" ? "super-admin-audit" : undefined
    );

    res.json({ message: "Le rôle a été mis à jour avec succès.", user: mapUser(updated) });
  })
);

// DELETE /api/users/:id — superadmin deletes account
router.delete(
  "/:id",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouvé.");
    }
    if (target.id === req.user!.id) {
      throw forbidden("Vous ne pouvez pas supprimer votre propre compte.");
    }
    await deleteSupabaseUser(target.id);
    await prisma.user.delete({ where: { id: target.id } });

    await logAdminAction({
      adminId: req.user!.id,
      adminNom: `${req.user!.prenom} ${req.user!.nom}`,
      adminEmail: req.user!.email,
      action: "DELETE_USER",
      details: `A supprimé le compte '${target.prenom} ${target.nom}' (${target.email}, rôle ${target.role}).`,
      targetId: target.id,
      targetName: `${target.prenom} ${target.nom}`,
    });

    res.json({ message: "Compte supprimé avec succès." });
  })
);

export default router;
