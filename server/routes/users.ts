import { Router } from "express";
import { z } from "zod";
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
  updateSupabaseEmail,
  updateSupabasePassword,
} from "../services/auth.service";
import { logAdminAction } from "../services/audit.service";
import { createNotification } from "../services/notification.service";

const router = Router();

const profileSchema = z.object({
  nom: z.string().min(2).optional(),
  prenom: z.string().min(2).optional(),
  email: z.string().email().optional(),
  nouveauMotDePasse: z.string().min(4).optional(),
});

const createUserSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]).optional(),
  motDePasse: z.string().min(4).optional(),
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
    const { nom, prenom, email, nouveauMotDePasse } = req.body;

    let newEmail = user.email;
    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        throw badRequest("Cette adresse e-mail est déjà utilisée par un autre compte.");
      }
      newEmail = email.trim().toLowerCase();
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: nom?.trim().toUpperCase() ?? user.nom,
        prenom: prenom?.trim() ?? user.prenom,
        email: newEmail,
      },
    });

    if (newEmail !== user.email) {
      await updateSupabaseEmail(user.id, newEmail);
    }
    if (nouveauMotDePasse) {
      await updateSupabasePassword(user.id, nouveauMotDePasse.trim());
    }

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
    const { nom, prenom, email, role, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Un utilisateur avec cet e-mail existe déjà.");
    }
    const assignedRole = role ?? "Administrateur";
    const authId = await createSupabaseUser(trimmedEmail, motDePasse ?? "ISJ2026!");
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
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

    res.status(201).json({ message: "Utilisateur créé avec succès.", user: mapUser(user) });
  })
);

// PUT /api/users/:id/role — superadmin elevates role
router.put(
  "/:id/role",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
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
