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
    .regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caractère spécial."),
  // Public registration can never assign privileged roles.
  role: z.literal("Etudiant").optional(),
}).strict();

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
    const { nom, prenom, email, telephone, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTelephone = telephone?.trim() || null;

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Cette adresse e-mail est déjà utilisée.");
    }

    const authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? undefined);
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
        telephone: trimmedTelephone,
        role: "Etudiant",
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

    // La clé ne sert qu'à initialiser le tout premier SuperAdmin. Elle ne
    // remplace jamais le mot de passe d'un compte existant.
    if (currentMasterKey && masterKeyMatches(masterKey, currentMasterKey)) {
      const [existingProfile, existingSuperAdmin] = await Promise.all([
        prisma.user.findUnique({ where: { email: trimmedEmail } }),
        prisma.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } }),
      ]);
      if (!existingProfile && !existingSuperAdmin) {
        const result = await bootstrapFirstSuperAdmin(trimmedEmail, motDePasse);
        await logUserActivity({
          userId: result.user.id,
          userNom: `${result.user.prenom} ${result.user.nom}`,
          userEmail: result.user.email,
          userRole: result.user.role,
          actionType: "LOGIN",
          description: "A initialisé le premier compte SuperAdministrateur.",
        });
        return res.json({
          token: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          user: mapUser(result.user),
          message: "Compte SuperAdministrateur initialisé avec succès.",
        });
      }
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

const bootstrapPasswordSchema = z.string().min(12).max(128)
  .regex(/[a-zA-Z]/)
  .regex(/[0-9]/)
  .regex(/[^a-zA-Z0-9\s]/);

async function bootstrapFirstSuperAdmin(email: string, password: string) {
  if (!bootstrapPasswordSchema.safeParse(password).success) {
    throw badRequest("Le premier mot de passe SuperAdministrateur doit contenir au moins 12 caractères, une lettre, un chiffre et un caractère spécial.");
  }

  const user = await prisma.$transaction(async (tx) => {
    // Sérialise le bootstrap : deux requêtes simultanées ne peuvent pas créer
    // chacune un SuperAdministrateur initial.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(734112093)`;
    const existingSuperAdmin = await tx.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } });
    const existingProfile = await tx.user.findUnique({ where: { email } });
    if (existingSuperAdmin || existingProfile) {
      throw unauthorized("Initialisation SuperAdministrateur déjà effectuée.");
    }

    const existingAuthUser = await findSupabaseUserByEmail(email);
    if (existingAuthUser) {
      throw unauthorized("Cette adresse e-mail est déjà associée à un compte.");
    }

    const authId = await createSupabaseUser(email, password);
    return tx.user.create({
      data: {
        id: authId,
        nom: "DIRECTION",
        prenom: "Super Admin ISJ",
        email,
        role: "SuperAdministrateur",
      },
    });
  }, { maxWait: 10000, timeout: 20000 });

  const session = await signInSupabase(email, password);
  return { user, session };
}

export default router;
