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
  normalizePhoneNumber,
  refreshSupabaseSession,
  requestPasswordResetCode,
  requestPasswordResetSmsCode,
  revokeSupabaseSession,
  signInSupabase,
  verifyPasswordResetCodeOnly,
  verifyResetCodeAndUpdatePassword,
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
  nom: z.string().trim().min(2, "Le nom est requis.").max(80, "Le nom est trop long."),
  prenom: z.string().trim().min(2, "Le prénom est requis.").max(80, "Le prénom est trop long."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
  telephone: z.string().trim().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres après +237)").optional(),
  motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères.").max(128)
    .regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.")
    .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
    .regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caractère spécial."),
  // Public registration can never assign privileged roles.
  role: z.literal("Etudiant").optional(),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(200),
  motDePasse: z.string().min(1, "Le mot de passe est requis.").max(128),
  masterKey: z.string().max(256).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis.").max(512),
});

const forgotPasswordSchema = z
  .object({
    email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
    telephone: z.string().min(8, "Numéro de téléphone invalide.").max(30).optional(),
  })
  .refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
    message: "Veuillez renseigner votre adresse e-mail ou votre numéro de téléphone.",
  });

const verifyResetCodeSchema = z
  .object({
    email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
    telephone: z.string().min(8, "Numéro de téléphone invalide.").max(30).optional(),
    code: z.string().min(6, "Le code doit contenir au moins 6 chiffres.").max(12),
  })
  .refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
    message: "Veuillez renseigner votre adresse e-mail ou votre numéro de téléphone.",
  });

const resetPasswordSchema = z
  .object({
    email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
    telephone: z.string().min(8, "Numéro de téléphone invalide.").max(30).optional(),
    code: z.string().min(6, "Jeton ou code de vérification requis.").max(1024),
    nouveauMotDePasse: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
      .max(128)
      .regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.")
      .regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.")
      .regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caractère spécial."),
  })
  .refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
    message: "Veuillez renseigner votre adresse e-mail ou votre numéro de téléphone.",
  });

async function findUserByEmailOrPhone(email?: string, telephone?: string) {
  if (telephone && telephone.trim()) {
    const normalizedTarget = normalizePhoneNumber(telephone.trim());
    if (!normalizedTarget || normalizedTarget.length < 9) {
      throw badRequest("Format du numéro de téléphone invalide (ex: +2376XXXXXXXX).");
    }

    const usersWithPhone = await prisma.user.findMany({
      where: { telephone: { not: null } },
    });
    const matched = usersWithPhone.find(
      (u) => u.telephone && normalizePhoneNumber(u.telephone) === normalizedTarget
    );
    if (!matched) {
      throw badRequest("Aucun compte n'est associé à ce numéro de téléphone.");
    }
    return { user: matched, normalizedPhone: normalizedTarget, viaSms: true };
  }

  const trimmedEmail = (email ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user) {
    throw badRequest("Aucun compte n'est associé à cette adresse e-mail.");
  }
  return {
    user,
    normalizedPhone: user.telephone ? normalizePhoneNumber(user.telephone) : undefined,
    viaSms: false,
  };
}

router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone } = req.body as { email?: string; telephone?: string };
    const { user, normalizedPhone, viaSms } = await findUserByEmailOrPhone(email, telephone);

    if (viaSms && normalizedPhone) {
      const { sentBySms } = await requestPasswordResetSmsCode(
        normalizedPhone,
        user.id,
        user.email
      );

      if (!sentBySms) {
        throw badRequest(
          "L'envoi par SMS n'est pas encore actif : aucun fournisseur SMS n'est configuré dans votre projet Supabase (Authentication > Providers > Phone) ou via Twilio. Pour recevoir votre code directement sur votre messagerie, veuillez choisir l'option 'Par E-mail'."
        );
      }

      return res.json({
        message: `Un code de réinitialisation par SMS a été envoyé au numéro ${normalizedPhone}.`,
        telephone: normalizedPhone,
      });
    }

    await requestPasswordResetCode(user.email, user.id);

    res.json({
      message: `Un code de vérification a été envoyé à l'adresse ${user.email}.`,
    });
  })
);

router.post(
  "/verify-reset-code",
  authRateLimiter,
  validate(verifyResetCodeSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone, code } = req.body as {
      email?: string;
      telephone?: string;
      code: string;
    };
    const { user, normalizedPhone } = await findUserByEmailOrPhone(email, telephone);

    const { resetToken } = await verifyPasswordResetCodeOnly(
      user.email,
      code,
      normalizedPhone
    );

    res.json({
      valid: true,
      resetToken,
      email: user.email,
      telephone: normalizedPhone,
      message:
        "Code vérifié avec succès ! Veuillez maintenant définir et confirmer votre nouveau mot de passe.",
    });
  })
);

router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone, code, nouveauMotDePasse } = req.body as {
      email?: string;
      telephone?: string;
      code: string;
      nouveauMotDePasse: string;
    };
    const { user, normalizedPhone, viaSms } = await findUserByEmailOrPhone(email, telephone);

    await verifyResetCodeAndUpdatePassword(
      user.email,
      code,
      nouveauMotDePasse,
      normalizedPhone
    );

    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "LOGIN",
      description: viaSms
        ? "A réinitialisé son mot de passe via code SMS."
        : "A réinitialisé son mot de passe via code e-mail.",
    });

    res.json({
      message:
        "Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.",
    });
  })
);

router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, telephone, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTelephone = telephone?.trim() || null;

    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    const existingAuth = await findSupabaseUserByEmail(trimmedEmail);

    if (existing && existingAuth) {
      throw badRequest("Cette adresse e-mail est déjà utilisée. Veuillez vous connecter avec votre mot de passe.");
    }

    let authId: string;
    let user: any;

    if (existing && !existingAuth) {
      // L'étudiant est déjà inscrit dans la base locale (ex: import académique), on active son compte
      authId = await createSupabaseUser(
        trimmedEmail,
        motDePasse,
        trimmedTelephone ?? existing.telephone ?? undefined,
        true,
        existing.id
      );
      user = await prisma.user.update({
        where: { email: trimmedEmail },
        data: {
          nom: nom ? nom.trim().toUpperCase() : existing.nom,
          prenom: prenom ? prenom.trim() : existing.prenom,
          telephone: trimmedTelephone || existing.telephone,
        },
      });
    } else {
      authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? undefined);
      user = await prisma.user.create({
        data: {
          id: authId,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          email: trimmedEmail,
          telephone: trimmedTelephone,
          role: "Etudiant",
        },
      });
    }

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
      message: `Inscription réussie ! Votre compte ${user.role} a été activé avec succès.`,
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
    const trimmedPassword = motDePasse.trim();
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

    let session: any;
    try {
      session = await signInSupabase(trimmedEmail, motDePasse);
    } catch (authError: any) {
      // En cas d'échec, vérifions l'état précis du compte pour renvoyer un diagnostic exact
      const existingDbUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });

      if (existingDbUser) {
        const authUser = await findSupabaseUserByEmail(trimmedEmail);
        if (!authUser) {
          // L'étudiant est présent dans l'annuaire académique ISJ mais n'avait pas encore de session Auth
          try {
            await createSupabaseUser(
              trimmedEmail,
              trimmedPassword,
              existingDbUser.telephone ?? undefined,
              true,
              existingDbUser.id
            );
            session = await signInSupabase(trimmedEmail, trimmedPassword);
          } catch (provisionErr) {
            console.error("Auto-provisioning Supabase Auth error:", provisionErr);
            throw unauthorized("Mot de passe incorrect ou compte en cours de synchronisation. Veuillez vérifier votre saisie ou contacter l'administration.");
          }
        } else {
          // Le compte existe bien dans Supabase Auth, le mot de passe est réellement incorrect
          throw unauthorized("Mot de passe incorrect. Veuillez vérifier votre saisie.");
        }
      } else {
        // Aucun compte avec cette adresse e-mail
        throw unauthorized("Aucun compte n'est associé à cette adresse e-mail. Vérifiez votre saisie ou créez votre compte.");
      }
    }

    // Récupération et synchronisation du profil utilisateur
    let user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      // Fallback par adresse e-mail si l'identifiant Auth et l'identifiant DB différaient
      user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (user && user.id !== session.userId) {
        try {
          user = await prisma.user.update({
            where: { email: trimmedEmail },
            data: { id: session.userId },
          });
        } catch {
          // Utilise le profil existant
        }
      }
    }

    // Auto-réparation si le profil utilisateur dans la table `users` n'avait pas encore été créé
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: session.userId,
          nom: "ÉTUDIANT",
          prenom: "Étudiant ISJ",
          email: trimmedEmail,
          role: "Etudiant",
        },
      });
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

