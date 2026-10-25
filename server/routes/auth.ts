import { Router } from "express";
import { z } from "zod";
import { timingSafeEqual } from "crypto";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError, badRequest, unauthorized } from "../utils/errors";
import { mapUser } from "../utils/mappers";
import { authenticateJWT } from "../middlewares/authenticate";
import { validate } from "../middlewares/validate";
import { authRateLimiter, refreshRateLimiter } from "../middlewares/rateLimit";
import { logUserActivity } from "../services/activity.service";
import {
  createSupabaseUser,
  findSupabaseUserByEmail,
  refreshSupabaseSession,
  revokeSupabaseSession,
  signInSupabase,
  type SupabaseSession,
  updateSupabasePassword,
} from "../services/auth.service";
import { tryGetSuperAdminMasterKey } from "../config/superadmin";

const router = Router();

function masterKeyMatches(candidate: string | undefined, expected: string | null | undefined): boolean {
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const registerSchema = z.object({
  nom: z.string().min(2, "Le nom est requis.").max(80, "Le nom est trop long."),
  prenom: z.string().min(2, "Le prénom est requis.").max(80, "Le prénom est trop long."),
  email: z.string().email("Adresse e-mail invalide.").max(200),
  telephone: z.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres après +237)").optional(),
  motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128)
    .regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
    .regex(/[^a-zA-Z0-9]/, "Le mot de passe doit contenir un caractère spécial."),
  role: z.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]).optional(),
  masterKey: z.string().max(256).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").max(200),
  motDePasse: z.string().min(1, "Le mot de passe est requis.").max(128),
  masterKey: z.string().max(256).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis.").max(512),
});

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, telephone, motDePasse, role, masterKey } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTelephone = telephone?.trim() || null;

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Cette adresse e-mail est déjà utilisée.");
    }

    let assignedRole: "Etudiant" | "Administrateur" | "SuperAdministrateur" = "Etudiant";
    if (role === "Administrateur" || role === "SuperAdministrateur") {
      const currentMasterKey = tryGetSuperAdminMasterKey();
      if (!masterKeyMatches(masterKey, currentMasterKey)) {
        throw forbiddenRole();
      }
      assignedRole = role;
    }

    const authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? undefined);
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

    const session = await signInSupabase(trimmedEmail, motDePasse);

    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "REGISTER",
      description: `Création du compte ${user.role} ${user.prenom} ${user.nom}.`,
    });

    res.status(201).json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: mapUser(user),
      message: `Inscription réussie ! Votre compte ${user.role} a été créé.`,
    });
  })
);

router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, motDePasse, masterKey } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const currentMasterKey = tryGetSuperAdminMasterKey();

    // Bootstrap / connexion SuperAdmin via master key
    if (currentMasterKey && (masterKeyMatches(masterKey, currentMasterKey) || masterKeyMatches(motDePasse, currentMasterKey))) {
      const result = await ensureSuperAdminSession(trimmedEmail, motDePasse);
      await logUserActivity({
        userId: result.user.id,
        userNom: `${result.user.prenom} ${result.user.nom}`,
        userEmail: result.user.email,
        userRole: result.user.role,
        actionType: "LOGIN",
        description: "S'est connecté à la plateforme ISJ Revisio.",
      });
      return res.json({
        token: result.session.accessToken,
        refreshToken: result.session.refreshToken,
        user: mapUser(result.user),
        message: "Connexion réussie en tant que SuperAdministrateur !",
      });
    }

    const session = await signInSupabase(trimmedEmail, motDePasse);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw unauthorized("E-mail ou mot de passe incorrect.");
    }

    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "LOGIN",
      description: "S'est connecté à la plateforme ISJ Revisio.",
    });

    res.json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: mapUser(user),
      message: `Bienvenue ${user.prenom} ${user.nom} !`,
    });
  })
);

router.post(
  "/refresh",
  refreshRateLimiter,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const session = await refreshSupabaseSession(req.body.refreshToken);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      throw unauthorized("Compte introuvable.");
    }
    res.json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: mapUser(user),
    });
  })
);

router.post(
  "/logout",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    // Révoque la session Supabase côté serveur (best-effort), puis trace
    // la déconnexion dans le journal d'activité de l'utilisateur.
    const header = req.headers.authorization ?? "";
    try {
      await revokeSupabaseSession(header.replace(/^Bearer\s+/i, ""));
    } catch {
      // La déconnexion locale ne doit jamais échouer à cause de Supabase.
    }
    await logUserActivity({
      userId: req.user!.id,
      userNom: `${req.user!.prenom} ${req.user!.nom}`,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      actionType: "LOGOUT",
      description: "S'est déconnecté de la plateforme ISJ Revisio.",
    });
    res.json({ message: "Déconnexion réussie." });
  })
);

router.get(
  "/me",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      throw new AppError(401, "Session expirée ou invalide.");
    }
    res.json({ user: mapUser(user) });
  })
);

async function ensureSuperAdminSession(email: string, password: string) {
  let session: SupabaseSession | null = null;
  try {
    session = await signInSupabase(email, password);
  } catch {
    session = null;
  }

  if (!session) {
    const existingAuth = await findSupabaseUserByEmail(email);
    if (existingAuth) {
      await updateSupabasePassword(existingAuth.id, password);
    } else {
      await createSupabaseUser(email, password);
    }
    session = await signInSupabase(email, password);
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: session.userId,
        nom: "DIRECTION",
        prenom: "Super Admin ISJ",
        email,
        role: "SuperAdministrateur",
      },
    });
  } else if (user.role !== "SuperAdministrateur") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: "SuperAdministrateur" },
    });
  }

  if (!user) throw new AppError(500, "Impossible de créer le profil SuperAdministrateur.");
  return { user, session };
}

function forbiddenRole() {
  return new AppError(
    403,
    "Clé d'autorisation invalide. La clé d'habilitation est requise pour créer ce compte."
  );
}

export default router;
