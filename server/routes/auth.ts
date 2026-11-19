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
  deleteSupabaseUser,
  findSupabaseUserByEmail,
  normalizePhoneNumber,
  refreshSupabaseSession,
  requestPasswordResetCode,
  requestPasswordResetSmsCode,
  revokeSupabaseSession,
  signInSupabase,
  updateSupabasePassword,
  verifyAccessToken,
  verifyPasswordResetCodeOnly,
  verifyResetCodeAndUpdatePassword,
} from "../services/auth.service";
import {
  attachSessionCookiesAndHeaders,
  clearSessionCookies,
  createOrReplaceDeviceSession,
  extractAccessTokenFromRequest,
  extractDeviceSessionTokenFromRequest,
  listActiveUserDeviceSessions,
  resolveDeviceId,
  revokeAllUserSessions,
  revokeCurrentDeviceSession,
  revokeDeviceSessionById,
  verifyAndRotateDeviceSessionToken,
} from "../services/session.service";
import { tryGetSuperAdminMasterKey } from "../config/superadmin";

const router = Router();

function masterKeyMatches(candidate: string | undefined, expected: string | null | undefined): boolean {
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const optionalCameroonPhoneSchema = z.preprocess((val) => {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "+237" || trimmed === "237") return undefined;
  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized || normalized.replace(/\D/g, "").length < 8) return undefined;
  return normalized;
}, z.string().regex(/^\+[0-9]{8,15}$/, "Numéro de téléphone invalide : saisissez les 9 chiffres après +237 (ex : 655123456).").optional());

const cleanEmailSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  return val.replace(/[\u200B-\u200D\uFEFF\s]/g, "").toLowerCase();
}, z.string().email("Adresse e-mail invalide.").max(200));

const registerSchema = z.object({
  nom: z.string().trim().min(1, "Veuillez renseigner votre nom.").max(80, "Le nom est trop long."),
  prenom: z.string().trim().min(1, "Veuillez renseigner votre prénom.").max(80, "Le prénom est trop long."),
  email: cleanEmailSchema,
  telephone: optionalCameroonPhoneSchema,
  motDePasse: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères.").max(128),
  // Public registration can never assign privileged roles.
  role: z.string().optional(),
  deviceId: z.string().max(128).optional(),
  rememberMe: z.boolean().optional(),
  masterKey: z.string().max(256).optional(),
}).passthrough();

const loginSchema = z.object({
  email: cleanEmailSchema,
  motDePasse: z.string().min(1, "Le mot de passe est requis.").max(128),
  masterKey: z.string().max(256).optional(),
  deviceId: z.string().max(128).optional(),
  rememberMe: z.boolean().optional(),
}).passthrough();

const refreshSchema = z.object({
  refreshToken: z.string().max(1024).optional(),
  deviceSessionToken: z.string().max(1024).optional(),
  deviceId: z.string().max(128).optional(),
}).passthrough();

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
      .min(6, "Le mot de passe doit contenir au moins 6 caractères.")
      .max(128),
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
    const { nom, prenom, email, telephone, motDePasse, deviceId, rememberMe } = req.body;
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
    } else if (!existing && existingAuth) {
      // Un compte Auth existait sans profil dans public.users (ex: inscription précédente interrompue)
      authId = existingAuth.id;
      await updateSupabasePassword(authId, motDePasse.trim()).catch(() => undefined);
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
    } else {
      authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? undefined);
      try {
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
      } catch (dbErr) {
        await deleteSupabaseUser(authId).catch(() => undefined);
        throw dbErr;
      }
    }

    await signInSupabase(trimmedEmail, motDePasse).catch(() => null);

    const deviceSession = await createOrReplaceDeviceSession(req, user.id, {
      deviceId,
      persistent: rememberMe !== false,
    });

    attachSessionCookiesAndHeaders(req, res, {
      accessToken: deviceSession.accessToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      persistent: deviceSession.persistent,
    });

    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "REGISTER",
      description: `Création du compte ${user.role} ${user.prenom} ${user.nom} (${deviceSession.deviceName}).`,
    });

    res.status(201).json({
      token: deviceSession.accessToken,
      refreshToken: deviceSession.deviceSessionToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      expiresAt: deviceSession.expiresAt,
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
    const { email, motDePasse, masterKey, deviceId, rememberMe } = req.body;
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
        const deviceSession = await createOrReplaceDeviceSession(req, result.user.id, {
          deviceId,
          persistent: rememberMe !== false,
        });
        attachSessionCookiesAndHeaders(req, res, {
          accessToken: deviceSession.accessToken,
          deviceSessionToken: deviceSession.deviceSessionToken,
          deviceId: deviceSession.deviceId,
          sessionId: deviceSession.sessionId,
          persistent: deviceSession.persistent,
        });
        await logUserActivity({
          userId: result.user.id,
          userNom: `${result.user.prenom} ${result.user.nom}`,
          userEmail: result.user.email,
          userRole: result.user.role,
          actionType: "LOGIN",
          description: `A initialisé le premier compte SuperAdministrateur (${deviceSession.deviceName}).`,
        });
        return res.json({
          token: deviceSession.accessToken,
          refreshToken: deviceSession.deviceSessionToken,
          deviceSessionToken: deviceSession.deviceSessionToken,
          deviceId: deviceSession.deviceId,
          sessionId: deviceSession.sessionId,
          expiresAt: deviceSession.expiresAt,
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

    const deviceSession = await createOrReplaceDeviceSession(req, user.id, {
      deviceId,
      persistent: rememberMe !== false,
    });

    attachSessionCookiesAndHeaders(req, res, {
      accessToken: deviceSession.accessToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      persistent: deviceSession.persistent,
    });

    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "LOGIN",
      description: `S'est connecté à la plateforme ISJ Revisio (${deviceSession.deviceName}).`,
    });

    res.json({
      token: deviceSession.accessToken,
      refreshToken: deviceSession.deviceSessionToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      expiresAt: deviceSession.expiresAt,
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
    const candidateToken =
      req.body?.deviceSessionToken ||
      req.body?.refreshToken ||
      extractDeviceSessionTokenFromRequest(req);

    if (!candidateToken) {
      clearSessionCookies(req, res);
      throw unauthorized("Aucun jeton de session persistant trouvé sur cet appareil.");
    }

    // 1. Renouvellement et rotation via notre gestionnaire de sessions par appareil
    const rotated = await verifyAndRotateDeviceSessionToken(req, candidateToken, true);
    if (rotated) {
      const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
      if (!user) {
        clearSessionCookies(req, res);
        throw unauthorized("Compte introuvable.");
      }

      attachSessionCookiesAndHeaders(req, res, {
        accessToken: rotated.accessToken,
        deviceSessionToken: rotated.deviceSessionToken,
        deviceId: rotated.deviceId,
        sessionId: rotated.sessionId,
        persistent: rotated.persistent,
      });

      return res.json({
        token: rotated.accessToken,
        refreshToken: rotated.deviceSessionToken,
        deviceSessionToken: rotated.deviceSessionToken,
        deviceId: rotated.deviceId,
        sessionId: rotated.sessionId,
        user: mapUser(user),
      });
    }

    // 2. Fallback de compatibilité si un ancien refreshToken Supabase était transmis
    try {
      const supaSession = await refreshSupabaseSession(candidateToken);
      const user = await prisma.user.findUnique({ where: { id: supaSession.userId } });
      if (!user) {
        clearSessionCookies(req, res);
        throw unauthorized("Compte introuvable.");
      }
      const upgraded = await createOrReplaceDeviceSession(req, user.id, {
        deviceId: req.body?.deviceId,
        persistent: true,
      });
      attachSessionCookiesAndHeaders(req, res, {
        accessToken: upgraded.accessToken,
        deviceSessionToken: upgraded.deviceSessionToken,
        deviceId: upgraded.deviceId,
        sessionId: upgraded.sessionId,
        persistent: upgraded.persistent,
      });
      return res.json({
        token: upgraded.accessToken,
        refreshToken: upgraded.deviceSessionToken,
        deviceSessionToken: upgraded.deviceSessionToken,
        deviceId: upgraded.deviceId,
        sessionId: upgraded.sessionId,
        user: mapUser(user),
      });
    } catch {
      clearSessionCookies(req, res);
      throw unauthorized("Session expirée ou révoquée. Veuillez vous reconnecter.");
    }
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    // Identifie l'utilisateur (même si son accessToken court terme a déjà expiré)
    let userId: string | undefined;
    let sessionId: string | undefined;

    const rawAccess = extractAccessTokenFromRequest(req);
    if (rawAccess) {
      try {
        const verified = await verifyAccessToken(rawAccess);
        userId = verified.userId;
        sessionId = verified.sessionId;
      } catch {
        // Ignore access token expiration during logout
      }
      try {
        await revokeSupabaseSession(rawAccess);
      } catch {
        // Best-effort
      }
    }

    // Révoque strictement la session de l'appareil actuel côté serveur
    await revokeCurrentDeviceSession(req, userId, sessionId);
    // Supprime les cookies d'authentification HttpOnly sur cet appareil
    clearSessionCookies(req, res);

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
      if (user) {
        await logUserActivity({
          userId: user.id,
          userNom: `${user.prenom} ${user.nom}`,
          userEmail: user.email,
          userRole: user.role,
          actionType: "LOGOUT",
          description: "S'est déconnecté de la plateforme ISJ Revisio sur cet appareil.",
        }).catch(() => undefined);
      }
    }

    res.json({ message: "Déconnexion réussie sur cet appareil." });
  })
);

router.get(
  "/me",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      clearSessionCookies(req, res);
      throw new AppError(401, "Session expirée ou invalide.");
    }

    // Si l'utilisateur possédait une session valide sans cookie/jeton d'appareil enregistré, on en provisionne un
    const existingDeviceSession = extractDeviceSessionTokenFromRequest(req);
    let activeAccessToken = extractAccessTokenFromRequest(req) || undefined;
    let activeDeviceSessionToken = existingDeviceSession || undefined;
    let activeDeviceId = req.tokenPayload?.deviceId || resolveDeviceId(req);
    let activeSessionId = req.tokenPayload?.sessionId;

    if (!existingDeviceSession && !req.tokenPayload?.sessionId) {
      const created = await createOrReplaceDeviceSession(req, user.id, {
        deviceId: activeDeviceId,
        persistent: true,
      });
      attachSessionCookiesAndHeaders(req, res, {
        accessToken: created.accessToken,
        deviceSessionToken: created.deviceSessionToken,
        deviceId: created.deviceId,
        sessionId: created.sessionId,
        persistent: created.persistent,
      });
      activeAccessToken = created.accessToken;
      activeDeviceSessionToken = created.deviceSessionToken;
      activeDeviceId = created.deviceId;
      activeSessionId = created.sessionId;
    }

    // Si authenticateJWT a renouvelé le jeton en cours de requête, récupérer les en-têtes
    const renewedAccess = res.getHeader("X-Renewed-Access-Token");
    const rotatedSession = res.getHeader("X-Rotated-Device-Session");

    res.json({
      user: mapUser(user),
      token: typeof renewedAccess === "string" ? renewedAccess : activeAccessToken,
      deviceSessionToken:
        typeof rotatedSession === "string" ? rotatedSession : activeDeviceSessionToken,
      deviceId: activeDeviceId,
      sessionId: activeSessionId,
    });
  })
);

router.get(
  "/sessions",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const currentSessionId = req.tokenPayload?.sessionId;
    const currentDeviceId = req.tokenPayload?.deviceId || resolveDeviceId(req);
    const sessions = await listActiveUserDeviceSessions(
      req.user!.id,
      currentSessionId,
      currentDeviceId
    );
    res.json({ sessions });
  })
);

router.delete(
  "/sessions/:sessionId",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const targetSessionId = String(req.params.sessionId || "").trim();
    if (!targetSessionId) {
      throw badRequest("Identifiant de session manquant.");
    }
    await revokeDeviceSessionById(req.user!.id, targetSessionId);
    const isCurrent = req.tokenPayload?.sessionId === targetSessionId;
    if (isCurrent) {
      clearSessionCookies(req, res);
    }
    res.json({
      revokedSessionId: targetSessionId,
      revokedCurrentDevice: isCurrent,
      message: isCurrent
        ? "Session de cet appareil révoquée."
        : "L'appareil sélectionné a été déconnecté à distance.",
    });
  })
);

router.post(
  "/logout-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const keepCurrent = req.body?.keepCurrentDevice !== false;
    const currentSessionId = keepCurrent ? req.tokenPayload?.sessionId : undefined;
    const revokedCount = await revokeAllUserSessions(req.user!.id, currentSessionId);
    if (!keepCurrent) {
      clearSessionCookies(req, res);
    }
    res.json({
      revokedCount,
      message: keepCurrent
        ? `${revokedCount} autre(s) appareil(s) déconnecté(s) avec succès.`
        : "Toutes vos sessions ont été déconnectées.",
    });
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

