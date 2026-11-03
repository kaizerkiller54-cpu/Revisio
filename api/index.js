// server/app.ts
import express3 from "express";

// server/routes/auth.ts
import { Router } from "express";
import { z } from "zod";
import { timingSafeEqual } from "crypto";

// server/prisma/client.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// server/config/env.ts
import path from "path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.join(process.cwd(), ".env") });
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}
var env = {
  port: Number(process.env.PORT ?? 3e3),
  databaseUrl: required("DATABASE_URL"),
  // Nombre de sauts de proxy devant l'application (0 = accès direct).
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  supabase: {
    url: required("SUPABASE_URL"),
    anonKey: required("SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    jwtSecret: required("SUPABASE_JWT_SECRET")
  }
};

// server/prisma/client.ts
var adapter = new PrismaPg({ connectionString: env.databaseUrl });
var prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn"]
});

// server/utils/asyncHandler.ts
var asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// server/utils/errors.ts
var AppError = class extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
};
var badRequest = (message, details) => new AppError(400, message, details);
var unauthorized = (message = "Non authentifi\xE9.") => new AppError(401, message);
var forbidden = (message = "Acc\xE8s refus\xE9 : privil\xE8ges insuffisants.") => new AppError(403, message);
var notFound = (message = "Ressource introuvable.") => new AppError(404, message);

// server/utils/mappers.ts
var semestreToDb = (s) => s === "Semestre 2" ? "Semestre_2" : "Semestre_1";
var semestreFromDb = (s) => s === "Semestre_2" ? "Semestre 2" : "Semestre 1";
var statutToDb = (s) => s === "Publi\xE9" ? "Publie" : s === "Refus\xE9" ? "Refuse" : "En_attente";
var statutFromDb = (s) => s === "Publie" ? "Publi\xE9" : s === "Refuse" ? "Refus\xE9" : "En attente";
var mapUser = (u) => ({
  id: u.id,
  nom: u.nom,
  prenom: u.prenom,
  email: u.email,
  telephone: u.telephone ?? null,
  role: u.role,
  dateCreation: u.createdAt.toISOString()
});
var mapDocument = (d) => ({
  id: d.id,
  titre: d.titre,
  matiere: d.matiere?.nom ?? d.matiereId,
  matiereId: d.matiereId,
  semestre: semestreFromDb(d.semestre),
  typeEpreuve: d.typeEpreuve,
  anneeAcademique: d.anneeAcademique,
  // Keep private storage paths out of API responses; serve PDFs only through
  // authenticated preview and download routes.
  fichierUrl: "",
  fichierNom: d.fichierNom,
  statut: statutFromDb(d.statut),
  visible: d.visible,
  datePublication: d.datePublication ? d.datePublication.toISOString() : void 0,
  dateAjout: d.createdAt.toISOString(),
  telechargementsCount: d.telechargementsCount,
  contributionId: d.contributionId ?? void 0
});
var mapContribution = (c) => ({
  id: c.id,
  utilisateurId: c.utilisateurId,
  utilisateurNom: c.utilisateurNom,
  utilisateurEmail: c.utilisateurEmail,
  anneeAcademique: c.anneeAcademique,
  matiere: c.matiere,
  semestre: semestreFromDb(c.semestre),
  typeEpreuve: c.typeEpreuve,
  titre: c.titre ?? void 0,
  commentaire: c.commentaire ?? void 0,
  fichierUrl: "",
  fichierNom: c.fichierNom,
  statut: statutFromDb(c.statut),
  dateEnvoi: c.dateEnvoi.toISOString()
});
var mapMatiere = (m, countDocs) => ({
  id: m.id,
  nom: m.nom,
  code: m.code,
  semestre: semestreFromDb(m.semestre),
  description: m.description ?? "",
  countDocs
});
var mapActivity = (a) => ({
  id: a.id,
  userId: a.userId,
  userNom: a.userNom,
  userEmail: a.userEmail,
  userRole: a.userRole,
  actionType: a.actionType,
  description: a.description,
  targetId: a.targetId ?? void 0,
  targetTitle: a.targetTitle ?? void 0,
  timestamp: a.timestamp.toISOString()
});
var mapNotification = (n) => ({
  id: n.id,
  userId: n.userId,
  titre: n.titre,
  message: n.message,
  type: n.type,
  lue: n.lue,
  date: n.createdAt.toISOString(),
  linkTab: n.linkTab ?? void 0
});
var mapAuditLog = (a) => ({
  id: a.id,
  adminId: a.adminId,
  adminNom: a.adminNom,
  adminEmail: a.adminEmail,
  action: a.action,
  details: a.details,
  targetId: a.targetId ?? void 0,
  targetName: a.targetName ?? void 0,
  date: a.date.toISOString()
});

// server/services/auth.service.ts
import { createPublicKey } from "crypto";
import jwt from "jsonwebtoken";

// server/services/supabase.ts
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
var supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var supabaseAuth = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var BUCKET = "epreuves";
var MAX_PDF_SIZE = 15 * 1024 * 1024;
function isPdfMagic(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}
function isSupabaseStorageUrl(url) {
  try {
    const candidate = new URL(url);
    return candidate.origin === new URL(env.supabase.url).origin && candidate.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`);
  } catch {
    return false;
  }
}
function publicStorageUrl(path5) {
  return `${env.supabase.url}/storage/v1/object/public/${BUCKET}/${path5}`;
}
function sanitizeFilename(name) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "epreuve.pdf";
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}
var bucketReady = false;
async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(500, `Impossible de v\xE9rifier le stockage des PDF : ${error.message}`);
  }
  if (error) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: `${MAX_PDF_SIZE}`,
      allowedMimeTypes: ["application/pdf"]
    });
    if (createError) {
      throw new AppError(500, `Impossible de cr\xE9er le bucket de stockage : ${createError.message}`);
    }
  } else if (!error) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET, { public: false });
    if (updateError) {
      throw new AppError(500, `Impossible de s\xE9curiser le stockage des PDF : ${updateError.message}`);
    }
  }
  bucketReady = true;
}
async function uploadPdfBuffer(buffer, originalName) {
  if (buffer.length === 0) {
    throw badRequest("Le fichier PDF est vide.");
  }
  if (buffer.length > MAX_PDF_SIZE) {
    throw badRequest("Le fichier est trop volumineux (maximum 15 Mo).");
  }
  if (!isPdfMagic(buffer)) {
    throw badRequest("Le fichier n'est pas un PDF valide (signature %PDF- absente).");
  }
  await ensureBucket();
  const path5 = `${randomUUID()}-${sanitizeFilename(originalName)}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path5, buffer, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) {
    throw new AppError(500, `\xC9chec de l'upload du fichier : ${error.message}`);
  }
  return publicStorageUrl(path5);
}
async function uploadPdfFromDataUrl(dataUrl, fileName) {
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw badRequest("Le fichier doit \xEAtre un PDF encod\xE9 en base64 (data:application/pdf;base64,...).");
  }
  if (match[1].length > Math.ceil(MAX_PDF_SIZE * 1.4) + 10) {
    throw badRequest("Le fichier est trop volumineux (maximum 15 Mo).");
  }
  const buffer = Buffer.from(match[1], "base64");
  return uploadPdfBuffer(buffer, fileName);
}
async function resolvePdfUrl(fichierUrl, fichierNom) {
  if (isSupabaseStorageUrl(fichierUrl)) return fichierUrl;
  if (/^data:application\/pdf;base64,/i.test(fichierUrl)) return uploadPdfFromDataUrl(fichierUrl, fichierNom);
  throw badRequest("URL de fichier invalide. Seul un PDF du stockage de la plateforme est accept\xE9.");
}
async function deleteStorageFileByUrl(url) {
  if (!isSupabaseStorageUrl(url)) return;
  const path5 = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path5) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path5]);
  if (error && !/not found/i.test(error.message)) {
    console.error("\xC9chec de la suppression du fichier du storage :", error.message);
  }
}

// server/services/auth.service.ts
var jwksPromise = null;
async function getJwksPems() {
  if (!jwksPromise) {
    jwksPromise = (async () => {
      const res = await fetch(`${env.supabase.url}/auth/v1/.well-known/jwks.json`);
      if (!res.ok) throw new Error(`R\xE9cup\xE9ration de la cl\xE9 JWKS impossible (${res.status}).`);
      const data = await res.json();
      const pems = {};
      for (const key of data.keys) {
        const kid = key.kid ?? "default";
        pems[kid] = createPublicKey({ key, format: "jwk" }).export({
          type: "spki",
          format: "pem"
        });
      }
      return pems;
    })();
  }
  return jwksPromise;
}
async function verifyAccessToken(token) {
  try {
    const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
    const verifyClaims = (payload2) => {
      const audiences = Array.isArray(payload2.aud) ? payload2.aud : [payload2.aud];
      if (!payload2.sub || payload2.role !== "authenticated" || !audiences.includes("authenticated")) {
        throw new Error("Claims de session invalides");
      }
      return { userId: payload2.sub, role: payload2.role, tokenType: "access" };
    };
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    if (header.alg === "HS256") {
      const payload2 = jwt.verify(token, env.supabase.jwtSecret, { algorithms: ["HS256"], issuer });
      return verifyClaims(payload2);
    }
    const pems = await getJwksPems();
    const key = header.kid ? pems[header.kid] : Object.values(pems)[0];
    if (!key) throw new Error("cl\xE9 JWKS introuvable");
    const payload = jwt.verify(token, key, { algorithms: ["ES256"], issuer });
    return verifyClaims(payload);
  } catch {
    throw new AppError(401, "Session expir\xE9e ou invalide.");
  }
}
async function signInSupabase(email, password) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw unauthorized("E-mail ou mot de passe incorrect.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  };
}
async function findSupabaseUserByEmail(email) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1e3 });
  if (error) return null;
  const users = data?.users ?? [];
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user ? { id: user.id } : null;
}
async function createSupabaseUser(email, password, phone, reuseExistingAuthUser = false) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    phone: phone || void 0,
    phone_confirm: !!phone,
    email_confirm: true
  });
  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      if (reuseExistingAuthUser) {
        const existing = await findSupabaseUserByEmail(email);
        if (existing) return existing.id;
      }
      throw new AppError(409, "Cette adresse e-mail est d\xE9j\xE0 li\xE9e \xE0 un compte d'authentification.");
    }
    throw new AppError(400, `Impossible de cr\xE9er le compte : ${error.message}`);
  }
  if (!data.user) throw new AppError(500, "Compte cr\xE9\xE9 mais sans identifiant retourn\xE9.");
  return data.user.id;
}
async function refreshSupabaseSession(refreshToken) {
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    throw new AppError(401, "Refresh token invalide ou expir\xE9.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  };
}
async function revokeSupabaseSession(accessToken) {
  if (!accessToken) throw new AppError(400, "Token de session manquant.");
  const res = await fetch(`${env.supabase.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: env.supabase.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new AppError(500, "R\xE9vocation de la session Supabase impossible.");
}
async function updateSupabaseEmail(userId, email) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
  if (error) throw new AppError(400, `Impossible de modifier l'e-mail : ${error.message}`);
}
async function updateSupabasePassword(userId, password) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) throw new AppError(400, `Impossible de modifier le mot de passe : ${error.message}`);
}
async function updateSupabasePhone(userId, phone) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    phone: phone || void 0,
    phone_confirm: !!phone
  });
  if (error) throw new AppError(400, `Impossible de modifier le num\xE9ro de t\xE9l\xE9phone : ${error.message}`);
}
async function deleteSupabaseUser(userId) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(400, `Impossible de supprimer le compte : ${error.message}`);
  }
}

// server/middlewares/authenticate.ts
async function authenticateJWT(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(unauthorized());
    }
    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return next(unauthorized("Compte introuvable ou supprim\xE9."));
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom
    };
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}

// server/middlewares/validate.ts
var validate = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(badRequest("Donn\xE9es invalides.", result.error.flatten()));
  }
  req[source] = result.data;
  next();
};

// server/middlewares/rateLimit.ts
import rateLimit from "express-rate-limit";
function buildLimiter(options) {
  const limiter = rateLimit(options);
  const wrapped = (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === "false") return next();
    return limiter(req, res, next);
  };
  return Object.assign(wrapped, limiter);
}
var apiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requ\xEAtes. R\xE9essayez dans quelques minutes." }
});
var authRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de connexion. R\xE9essayez dans une minute." }
});
var downloadRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de t\xE9l\xE9chargements. R\xE9essayez dans une minute." }
});
var searchRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de recherches. R\xE9essayez dans une minute." }
});
var suggestRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requ\xEAtes de suggestion. R\xE9essayez dans une minute." }
});
var refreshRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de rafra\xEEchissement. R\xE9essayez dans une minute." }
});

// server/services/activity.service.ts
async function logUserActivity(input) {
  return prisma.userActivity.create({
    data: {
      userId: input.userId,
      userNom: input.userNom,
      userEmail: input.userEmail,
      userRole: input.userRole,
      actionType: input.actionType,
      description: input.description,
      targetId: input.targetId ?? null,
      targetTitle: input.targetTitle ?? null
    }
  });
}

// server/config/superadmin.ts
import path2 from "path";
import fs from "fs";
function tryGetSuperAdminMasterKey() {
  return readSuperAdminMasterKey();
}
function readSuperAdminMasterKey() {
  const fromEnv = process.env.SUPERADMIN_MASTER_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const configPath = path2.join(process.cwd(), "superadmin.config.json");
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.superadminMasterKey) {
        return String(parsed.superadminMasterKey).trim();
      }
    }
  } catch (err) {
    console.error("Erreur lors de la lecture de superadmin.config.json:", err);
  }
  return null;
}

// server/routes/auth.ts
var router = Router();
function masterKeyMatches(candidate, expected) {
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
var registerSchema = z.object({
  nom: z.string().min(2, "Le nom est requis.").max(80, "Le nom est trop long."),
  prenom: z.string().min(2, "Le pr\xE9nom est requis.").max(80, "Le pr\xE9nom est trop long."),
  email: z.string().email("Adresse e-mail invalide.").max(200),
  telephone: z.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres apr\xE8s +237)").optional(),
  motDePasse: z.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res.").max(128).regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.").regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.").regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caract\xE8re sp\xE9cial."),
  // Public registration can never assign privileged roles.
  role: z.literal("Etudiant").optional()
}).strict();
var loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").max(200),
  motDePasse: z.string().min(1, "Le mot de passe est requis.").max(128),
  masterKey: z.string().max(256).optional()
});
var refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token requis.").max(512)
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
      throw badRequest("Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e.");
    }
    const authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? void 0);
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
        telephone: trimmedTelephone,
        role: "Etudiant"
      }
    });
    const session = await signInSupabase(trimmedEmail, motDePasse);
    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "REGISTER",
      description: `Cr\xE9ation du compte ${user.role} ${user.prenom} ${user.nom}.`
    });
    res.status(201).json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: mapUser(user),
      message: `Inscription r\xE9ussie ! Votre compte ${user.role} a \xE9t\xE9 cr\xE9\xE9.`
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
    if (currentMasterKey && masterKeyMatches(masterKey, currentMasterKey)) {
      const [existingProfile, existingSuperAdmin] = await Promise.all([
        prisma.user.findUnique({ where: { email: trimmedEmail } }),
        prisma.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } })
      ]);
      if (!existingProfile && !existingSuperAdmin) {
        const result = await bootstrapFirstSuperAdmin(trimmedEmail, motDePasse);
        await logUserActivity({
          userId: result.user.id,
          userNom: `${result.user.prenom} ${result.user.nom}`,
          userEmail: result.user.email,
          userRole: result.user.role,
          actionType: "LOGIN",
          description: "A initialis\xE9 le premier compte SuperAdministrateur."
        });
        return res.json({
          token: result.session.accessToken,
          refreshToken: result.session.refreshToken,
          user: mapUser(result.user),
          message: "Compte SuperAdministrateur initialis\xE9 avec succ\xE8s."
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
      description: "S'est connect\xE9 \xE0 la plateforme ISJ Revisio."
    });
    res.json({
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: mapUser(user),
      message: `Bienvenue ${user.prenom} ${user.nom} !`
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
      user: mapUser(user)
    });
  })
);
router.post(
  "/logout",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const header = req.headers.authorization ?? "";
    try {
      await revokeSupabaseSession(header.replace(/^Bearer\s+/i, ""));
    } catch {
    }
    await logUserActivity({
      userId: req.user.id,
      userNom: `${req.user.prenom} ${req.user.nom}`,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: "LOGOUT",
      description: "S'est d\xE9connect\xE9 de la plateforme ISJ Revisio."
    });
    res.json({ message: "D\xE9connexion r\xE9ussie." });
  })
);
router.get(
  "/me",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw new AppError(401, "Session expir\xE9e ou invalide.");
    }
    res.json({ user: mapUser(user) });
  })
);
var bootstrapPasswordSchema = z.string().min(12).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9\s]/);
async function bootstrapFirstSuperAdmin(email, password) {
  if (!bootstrapPasswordSchema.safeParse(password).success) {
    throw badRequest("Le premier mot de passe SuperAdministrateur doit contenir au moins 12 caract\xE8res, une lettre, un chiffre et un caract\xE8re sp\xE9cial.");
  }
  const user = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(734112093)`;
    const existingSuperAdmin = await tx.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } });
    const existingProfile = await tx.user.findUnique({ where: { email } });
    if (existingSuperAdmin || existingProfile) {
      throw unauthorized("Initialisation SuperAdministrateur d\xE9j\xE0 effectu\xE9e.");
    }
    const existingAuthUser = await findSupabaseUserByEmail(email);
    if (existingAuthUser) {
      throw unauthorized("Cette adresse e-mail est d\xE9j\xE0 associ\xE9e \xE0 un compte.");
    }
    const authId = await createSupabaseUser(email, password);
    return tx.user.create({
      data: {
        id: authId,
        nom: "DIRECTION",
        prenom: "Super Admin ISJ",
        email,
        role: "SuperAdministrateur"
      }
    });
  }, { maxWait: 1e4, timeout: 2e4 });
  const session = await signInSupabase(email, password);
  return { user, session };
}
var auth_default = router;

// server/routes/documents.ts
import express, { Router as Router2 } from "express";
import { z as z2 } from "zod";

// server/middlewares/authorize.ts
var requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(forbidden());
  }
  next();
};

// server/services/audit.service.ts
async function logAdminAction(input) {
  const log = await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      adminNom: input.adminNom,
      adminEmail: input.adminEmail,
      action: input.action,
      details: input.details,
      targetId: input.targetId ?? null,
      targetName: input.targetName ?? null
    }
  });
  await logUserActivity({
    userId: input.adminId,
    userNom: input.adminNom,
    userEmail: input.adminEmail,
    userRole: "Administrateur",
    actionType: input.action,
    description: input.details,
    targetId: input.targetId,
    targetTitle: input.targetName
  });
  return log;
}

// server/services/pdf-watermark.service.ts
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
var MAX_STAMPED_PDF_PAGES = 500;
async function stampPdf(pdfBytes) {
  let pdf;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new AppError(500, "Document illisible : tatouage de tra\xE7abilit\xE9 impossible.");
  }
  if (pdf.getPageCount() > MAX_STAMPED_PDF_PAGES) {
    throw new AppError(413, `Le document d\xE9passe la limite de ${MAX_STAMPED_PDF_PAGES} pages.`);
  }
  const stamp = "Revisio-ISJ";
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.min(24, Math.max(16, width * 0.04));
    const textWidth = font.widthOfTextAtSize(stamp, size);
    page.drawText(stamp, {
      x: width / 2 - textWidth / 2,
      y: height / 2 - size / 2,
      size,
      font,
      color: rgb(0.18, 0.22, 0.3),
      opacity: 0.18,
      rotate: degrees(-30)
    });
  }
  pdf.setProducer("Revisio-ISJ");
  return pdf.save();
}

// server/services/search.service.ts
var ftsReady = false;
var stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function buildTsQuery(search) {
  const tokens = stripAccents(search.toLowerCase()).split(/[^a-z0-9]+/).filter((t) => t.length > 0).map((t) => `${t}:*`);
  if (tokens.length === 0) return null;
  return tokens.join(" & ");
}
function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
function mapRow(row) {
  return {
    id: row.id,
    titre: row.titre,
    matiere: row.matiereNom,
    matiereId: row.matiereId,
    semestre: semestreFromDb(row.semestre),
    typeEpreuve: row.typeEpreuve,
    anneeAcademique: row.anneeAcademique,
    fichierUrl: "",
    fichierNom: row.fichierNom,
    statut: statutFromDb(row.statut),
    datePublication: row.datePublication ? row.datePublication.toISOString() : void 0,
    dateAjout: row.createdAt.toISOString(),
    telechargementsCount: row.telechargementsCount,
    contributionId: row.contributionId ?? void 0
  };
}
async function searchDocuments(params = {}) {
  const statutDb = params.statut === void 0 || params.statut === "Publi\xE9" ? "Publie" : params.statut === "Refus\xE9" ? "Refuse" : params.statut === "En attente" ? "En_attente" : "Publie";
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 50) : 12;
  const offset = (page - 1) * pageSize;
  const search = (params.search ?? "").trim();
  const hasSearch = search.length > 0;
  const tsQuery = hasSearch && ftsReady ? buildTsQuery(search) : null;
  if (hasSearch && ftsReady && tsQuery === null) {
    return { data: [], total: 0, page, pageSize };
  }
  const likeTerm = hasSearch ? `%${escapeLike(search.toLowerCase())}%` : null;
  const where = [`d."statut" = $1`, `d."visible" = TRUE`];
  const values = [statutDb];
  let idx = 2;
  let searchParam = 0;
  if (params.matiere && params.matiere !== "Toutes") {
    where.push(`m."nom" = $${idx}`);
    values.push(params.matiere);
    idx++;
  }
  if (params.semestre && params.semestre !== "Tous") {
    where.push(`d."semestre" = $${idx}`);
    values.push(params.semestre === "Semestre 2" ? "Semestre_2" : "Semestre_1");
    idx++;
  }
  if (params.typeEpreuve && params.typeEpreuve !== "Tous") {
    where.push(`d."typeEpreuve" = $${idx}`);
    values.push(params.typeEpreuve);
    idx++;
  }
  if (params.anneeAcademique && params.anneeAcademique !== "Toutes") {
    where.push(`d."anneeAcademique" = $${idx}`);
    values.push(params.anneeAcademique);
    idx++;
  }
  if (hasSearch && ftsReady) {
    searchParam = idx;
    where.push(`(
      to_tsvector('simple', public.unaccent_text(d."titre")) @@ to_tsquery('simple', $${searchParam})
      OR to_tsvector('simple', public.unaccent_text(m."nom")) @@ to_tsquery('simple', $${searchParam})
      OR to_tsvector('simple', public.unaccent_text(d."anneeAcademique")) @@ to_tsquery('simple', $${searchParam})
    )`);
    values.push(tsQuery);
    idx++;
  } else if (hasSearch) {
    searchParam = idx;
    where.push(`(
      LOWER(d."titre") LIKE $${searchParam}
      OR LOWER(m."nom") LIKE $${searchParam}
      OR LOWER(d."anneeAcademique") LIKE $${searchParam}
    )`);
    values.push(likeTerm);
    idx++;
  }
  const whereSql = where.join("\n  AND ");
  const select = `
    SELECT
      d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
      d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
      d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
      m."nom" AS "matiereNom"
    FROM "documents" d
    JOIN "matieres" m ON m."id" = d."matiereId"
    WHERE ${whereSql}
  `;
  const orderBy = hasSearch && ftsReady ? `ORDER BY
          ts_rank_cd(to_tsvector('simple', public.unaccent_text(d."titre")), to_tsquery('simple', $${searchParam}))
            + ts_rank_cd(to_tsvector('simple', public.unaccent_text(m."nom")), to_tsquery('simple', $${searchParam}))
          DESC, d."createdAt" DESC` : `ORDER BY d."createdAt" DESC`;
  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `${select} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      ...values,
      pageSize,
      offset
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM "documents" d JOIN "matieres" m ON m."id" = d."matiereId" WHERE ${whereSql}`,
      ...values
    )
  ]);
  return {
    data: rows.map(mapRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize
  };
}
async function suggestDocuments(q, limit = 6) {
  const query = (q ?? "").trim();
  if (query.length < 2) return [];
  const likeTerm = `%${escapeLike(query.toLowerCase())}%`;
  if (ftsReady) {
    const tsQuery = buildTsQuery(query);
    if (tsQuery === null) return [];
    const rows2 = await prisma.$queryRawUnsafe(
      `
        SELECT
          d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
          d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
          d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
          m."nom" AS "matiereNom",
          ts_rank_cd(to_tsvector('simple', public.unaccent_text(d."titre")), to_tsquery('simple', $1))
            + ts_rank_cd(to_tsvector('simple', public.unaccent_text(m."nom")), to_tsquery('simple', $1)) AS score
        FROM "documents" d
        JOIN "matieres" m ON m."id" = d."matiereId"
        WHERE d."statut" = 'Publie'
          AND d."visible" = TRUE
          AND (
            to_tsvector('simple', public.unaccent_text(d."titre")) @@ to_tsquery('simple', $1)
            OR to_tsvector('simple', public.unaccent_text(m."nom")) @@ to_tsquery('simple', $1)
          )
        ORDER BY score DESC, d."createdAt" DESC
        LIMIT $2
      `,
      tsQuery,
      limit
    );
    return rows2.map((r) => ({
      id: r.id,
      titre: r.titre,
      matiere: r.matiereNom,
      typeEpreuve: r.typeEpreuve,
      semestre: semestreFromDb(r.semestre),
      anneeAcademique: r.anneeAcademique,
      fichierUrl: "",
      score: r.score
    }));
  }
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT
        d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
        d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
        d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
        m."nom" AS "matiereNom"
      FROM "documents" d
      JOIN "matieres" m ON m."id" = d."matiereId"
      WHERE d."statut" = 'Publie'
        AND d."visible" = TRUE
        AND (
          LOWER(d."titre") LIKE $1
          OR LOWER(m."nom") LIKE $1
          OR LOWER(d."anneeAcademique") LIKE $1
        )
      ORDER BY d."createdAt" DESC
      LIMIT $2
    `,
    likeTerm,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    matiere: r.matiereNom,
    typeEpreuve: r.typeEpreuve,
    semestre: semestreFromDb(r.semestre),
    anneeAcademique: r.anneeAcademique,
    fichierUrl: "",
    score: 0
  }));
}

// server/routes/documents.ts
var router2 = Router2();
var uuidParam = z2.object({ id: z2.string().uuid("Identifiant invalide.") });
var listQuerySchema = z2.object({
  search: z2.string().max(200).optional(),
  matiere: z2.string().max(120).optional(),
  semestre: z2.string().max(20).optional(),
  typeEpreuve: z2.string().max(10).optional(),
  anneeAcademique: z2.string().max(20).optional(),
  statut: z2.string().max(20).optional(),
  page: z2.coerce.number().int().positive().optional(),
  pageSize: z2.coerce.number().int().positive().max(100).optional()
}).refine((query) => query.page === void 0 === (query.pageSize === void 0), {
  message: "page et pageSize doivent \xEAtre fournis ensemble."
});
var suggestQuerySchema = z2.object({
  q: z2.string().min(2).max(200),
  limit: z2.coerce.number().int().positive().max(10).optional()
});
var visibilitySchema = z2.object({ visible: z2.boolean() });
var createSchema = z2.object({
  titre: z2.string().min(2, "Le titre est requis.").max(200),
  matiere: z2.string().min(2, "La mati\xE8re est requise.").max(120),
  semestre: z2.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z2.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]),
  anneeAcademique: z2.string().min(4, "L'ann\xE9e acad\xE9mique est requise.").max(20),
  fichierUrl: z2.string().min(1, "Le fichier est requis.").max(23e6, "Le fichier est trop volumineux (maximum 15 Mo)."),
  fichierNom: z2.string().min(1, "Le nom du fichier est requis.").max(255)
});
var updateSchema = z2.object({
  titre: z2.string().min(2).max(200).optional(),
  matiere: z2.string().min(2).max(120).optional(),
  semestre: z2.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z2.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]).optional(),
  anneeAcademique: z2.string().min(4).max(20).optional()
});
async function resolveMatiere(matiereNom, semestre) {
  const trimmed = matiereNom.trim();
  let matiere = await prisma.matiere.findFirst({ where: { nom: trimmed } });
  if (!matiere) {
    matiere = await prisma.matiere.findFirst({
      where: { nom: { equals: trimmed, mode: "insensitive" } }
    });
  }
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: {
        nom: trimmed,
        code: `AUTO-${Date.now()}`,
        semestre: semestreToDb(semestre)
      }
    });
  }
  return matiere;
}
router2.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { search, matiere, semestre, typeEpreuve, anneeAcademique, statut, page, pageSize } = req.query;
    const where = { visible: true };
    const isAdmin = req.user !== void 0 && (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    where.statut = isAdmin && statut ? statutToDb(statut) : "Publie";
    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { titre: { contains: q, mode: "insensitive" } },
        { anneeAcademique: { contains: q, mode: "insensitive" } },
        { matiere: { nom: { contains: q, mode: "insensitive" } } }
      ];
    }
    if (matiere && matiere !== "Toutes") {
      where.matiere = { nom: matiere };
    }
    if (semestre && semestre !== "Tous") {
      where.semestre = semestreToDb(semestre);
    }
    if (typeEpreuve && typeEpreuve !== "Tous") {
      where.typeEpreuve = typeEpreuve;
    }
    if (anneeAcademique && anneeAcademique !== "Toutes") {
      where.anneeAcademique = anneeAcademique;
    }
    const orderBy = { createdAt: "desc" };
    if (page && pageSize) {
      const [rows2, total] = await Promise.all([
        prisma.document.findMany({ where, include: { matiere: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.document.count({ where })
      ]);
      return res.json({ data: rows2.map(mapDocument), total, page, pageSize });
    }
    const rows = await prisma.document.findMany({ where, include: { matiere: true }, orderBy, take: 500 });
    res.json(rows.map(mapDocument));
  })
);
router2.get(
  "/search",
  searchRateLimiter,
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query;
    const isAdmin = req.user !== void 0 && (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    const result = await searchDocuments({
      search: query.search,
      matiere: query.matiere,
      semestre: query.semestre,
      typeEpreuve: query.typeEpreuve,
      anneeAcademique: query.anneeAcademique,
      statut: isAdmin ? query.statut : void 0,
      page: query.page,
      pageSize: query.pageSize
    });
    res.json(result);
  })
);
router2.get(
  "/suggest",
  suggestRateLimiter,
  validate(suggestQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const suggestions = await suggestDocuments(String(q ?? ""), limit ? Number(limit) : void 0);
    res.json({ data: suggestions });
  })
);
router2.get(
  "/hidden",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.document.findMany({
      where: { visible: false },
      include: { matiere: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(rows.map(mapDocument));
  })
);
var MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
async function loadDocumentPdf(url) {
  if (isSupabaseStorageUrl(url)) {
    const storagePath = url.split(`/storage/v1/object/public/epreuves/`)[1];
    if (!storagePath) throw notFound("Fichier \xE9preuve introuvable.");
    const { data } = await supabaseAdmin.storage.from("epreuves").download(storagePath);
    if (!data) throw notFound("Fichier \xE9preuve introuvable.");
    return Buffer.from(await data.arrayBuffer());
  }
  throw notFound("Fichier \xE9preuve introuvable.");
}
function isPdfBuffer(buffer) {
  const head = buffer.subarray(0, Math.min(buffer.length, 1024 + 5));
  return head.includes(Buffer.from("%PDF-"));
}
function buildAttachmentHeader(safeName) {
  const asciiName = safeName.replace(/[^\x00-\x7F]/g, "_").replace(/["\\]/g, "_") || "epreuve.pdf";
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
router2.get(
  "/:id/preview",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    const canPreviewHidden = req.user?.role === "SuperAdministrateur";
    if (!doc || (!doc.visible || doc.statut !== "Publie") && !canPreviewHidden) throw notFound("\xC9preuve non trouv\xE9e.");
    const buffer = await loadDocumentPdf(doc.fichierUrl);
    if (!isPdfBuffer(buffer) || buffer.length > MAX_DOWNLOAD_BYTES) throw notFound("Fichier \xE9preuve introuvable.");
    const stamped = Buffer.from(await stampPdf(buffer));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", String(stamped.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(stamped);
  })
);
router2.get(
  "/:id/download",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    const canDownloadHidden = req.user?.role === "SuperAdministrateur";
    if (!doc || (!doc.visible || doc.statut !== "Publie") && !canDownloadHidden) {
      throw notFound("\xC9preuve non trouv\xE9e.");
    }
    const fileName = doc.fichierNom || `${doc.titre}.pdf`;
    const safeName = fileName.replace(/[^\w.\-éèêëàâîïôûùçÉÈÊËÀÂÎÏÔÛÙÇ]+/g, "_").slice(0, 180) || "epreuve.pdf";
    const buffer = await loadDocumentPdf(doc.fichierUrl);
    if (!isPdfBuffer(buffer) || buffer.length > MAX_DOWNLOAD_BYTES) {
      throw notFound("Fichier \xE9preuve introuvable.");
    }
    const outBuffer = Buffer.from(await stampPdf(buffer));
    const updated = await prisma.document.update({
      where: { id: doc.id },
      data: { telechargementsCount: { increment: 1 } }
    });
    await logUserActivity({
      userId: req.user.id,
      userNom: `${req.user.prenom} ${req.user.nom}`,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: "DOWNLOAD_DOCUMENT",
      description: `A t\xE9l\xE9charg\xE9 l'\xE9preuve '${doc.titre}' (${doc.matiereId}).`,
      targetId: doc.id,
      targetTitle: doc.titre
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", buildAttachmentHeader(safeName));
    res.setHeader("Content-Length", String(outBuffer.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(outBuffer);
  })
);
router2.get(
  "/:id",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!doc || doc.statut !== "Publie" || !doc.visible) {
      throw notFound("\xC9preuve non trouv\xE9e.");
    }
    res.json(mapDocument(doc));
  })
);
router2.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  express.json({ limit: "22mb" }),
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
        visible: anneeAcademique !== "2026-2027",
        datePublication: /* @__PURE__ */ new Date()
      }
    });
    if (doc.visible) {
      await prisma.userNotification.create({
        data: {
          userId: "ALL",
          titre: "Nouvelle \xE9preuve disponible",
          message: `${doc.titre} \u2014 ${matiereRow.nom}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
          type: "info",
          linkTab: "exams"
        }
      });
    }
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CREATE_DOCUMENT",
      details: doc.visible ? `A cr\xE9\xE9 et publi\xE9 l'\xE9preuve '${doc.titre}' (${matiere} ${anneeAcademique}).` : `A ajout\xE9 l'\xE9preuve '${doc.titre}' (${matiere} ${anneeAcademique}), masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.status(201).json({
      message: doc.visible ? "Document cr\xE9\xE9 et publi\xE9 avec succ\xE8s." : "\xC9preuve ajout\xE9e et masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.",
      document: mapDocument({ ...doc, matiere: matiereRow })
    });
  })
);
router2.put(
  "/:id/visibility",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam, "params"),
  validate(visibilitySchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!existing) throw notFound("\xC9preuve introuvable.");
    const { visible } = req.body;
    if (visible && existing.statut === "Refuse") throw badRequest("Une \xE9preuve refus\xE9e ne peut pas \xEAtre rendue visible.");
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: {
        visible,
        ...visible && existing.statut !== "Publie" ? { statut: "Publie", datePublication: /* @__PURE__ */ new Date() } : {}
      },
      include: { matiere: true }
    });
    if (visible && !existing.visible) {
      await prisma.userNotification.create({
        data: {
          userId: "ALL",
          titre: "Nouvelle \xE9preuve disponible",
          message: `${doc.titre} \u2014 ${doc.matiere.nom}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
          type: "info",
          linkTab: "exams"
        }
      });
    }
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "UPDATE_DOCUMENT",
      details: `${visible ? "A d\xE9masqu\xE9" : "A masqu\xE9"} l'\xE9preuve '${doc.titre}' (${doc.matiere.nom} ${doc.anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.json({
      message: visible ? "\xC9preuve publi\xE9e et d\xE9sormais visible." : "\xC9preuve masqu\xE9e pour les utilisateurs.",
      document: mapDocument(doc)
    });
  })
);
router2.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam, "params"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouv\xE9.");
    }
    if (!existing.visible && req.user.role !== "SuperAdministrateur") {
      throw forbidden("Seul un super administrateur peut modifier une \xE9preuve masqu\xE9e.");
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
        ...anneeAcademique === "2026-2027" && existing.anneeAcademique !== "2026-2027" && existing.visible ? { visible: false } : {}
      },
      include: { matiere: true }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "UPDATE_DOCUMENT",
      details: `A modifi\xE9 la fiche de l'\xE9preuve '${doc.titre}' (${doc.matiere.nom} ${doc.anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.json({ message: "Informations mises \xE0 jour avec succ\xE8s.", document: mapDocument(doc) });
  })
);
router2.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouv\xE9.");
    }
    if (!existing.visible && req.user.role !== "SuperAdministrateur") {
      throw forbidden("Seul un super administrateur peut supprimer une \xE9preuve masqu\xE9e.");
    }
    await prisma.document.delete({ where: { id: existing.id } });
    await deleteStorageFileByUrl(existing.fichierUrl ?? "");
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "DELETE_DOCUMENT",
      details: `A supprim\xE9 l'\xE9preuve publique '${existing.titre}'.`,
      targetId: existing.id,
      targetName: existing.titre
    });
    res.json({ message: "Document supprim\xE9 avec succ\xE8s." });
  })
);
var documents_default = router2;

// server/routes/contributions.ts
import express2, { Router as Router3 } from "express";
import { z as z3 } from "zod";

// server/config/upload.ts
import multer from "multer";
import path3 from "path";
import fs2 from "fs";
import os from "os";
var uploadsDir = process.env.VERCEL ? path3.join(os.tmpdir(), "uploads") : path3.join(process.cwd(), "uploads");
try {
  if (!fs2.existsSync(uploadsDir)) {
    fs2.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
}
var storage = multer.memoryStorage();
var uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new AppError(400, "Seuls les fichiers PDF (application/pdf) sont accept\xE9s."));
      return;
    }
    cb(null, true);
  }
});

// server/services/notification.service.ts
async function createNotification(userId, titre, message, type = "info", linkTab) {
  return prisma.userNotification.create({
    data: { userId, titre, message, type, linkTab: linkTab ?? null }
  });
}

// server/routes/contributions.ts
var router3 = Router3();
var uuidParam2 = z3.object({ id: z3.string().uuid("Identifiant invalide.") });
var MAX_PREVIEW_BYTES = 25 * 1024 * 1024;
var submitSchema = z3.object({
  anneeAcademique: z3.string().max(20).optional(),
  matiere: z3.string().max(120).optional(),
  semestre: z3.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z3.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]).optional(),
  titre: z3.string().max(200).optional(),
  commentaire: z3.string().max(2e3).optional(),
  fichierUrl: z3.string().max(23e6, "Le fichier est trop volumineux (maximum 15 Mo).").optional(),
  fichierNom: z3.string().max(255).optional()
});
var approveSchema = z3.object({
  titre: z3.string().min(2, "Le titre est requis.").max(200),
  matiere: z3.string().min(2, "La mati\xE8re est requise.").max(120),
  semestre: z3.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z3.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]),
  anneeAcademique: z3.string().min(4, "L'ann\xE9e acad\xE9mique est requise.").max(20)
});
router3.get(
  "/:id/preview",
  authenticateJWT,
  validate(uuidParam2, "params"),
  asyncHandler(async (req, res) => {
    const contribution = await prisma.contribution.findUnique({
      where: { id: req.params.id },
      include: { document: true }
    });
    if (!contribution || contribution.utilisateurId !== req.user.id && !["Administrateur", "SuperAdministrateur"].includes(req.user.role)) {
      throw notFound("Contribution introuvable.");
    }
    if (contribution.document?.visible === false && req.user.role !== "SuperAdministrateur") {
      throw notFound("\xC9preuve masqu\xE9e.");
    }
    if (!isSupabaseStorageUrl(contribution.fichierUrl)) throw notFound("Fichier introuvable.");
    const storagePath = contribution.fichierUrl.split("/storage/v1/object/public/epreuves/")[1];
    if (!storagePath) throw notFound("Fichier introuvable.");
    const { data } = await supabaseAdmin.storage.from("epreuves").download(storagePath);
    if (!data) throw notFound("Fichier introuvable.");
    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length > MAX_PREVIEW_BYTES || !buffer.subarray(0, 1029).includes(Buffer.from("%PDF-"))) {
      throw notFound("Fichier introuvable.");
    }
    const stamped = Buffer.from(await stampPdf(buffer));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", String(stamped.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(stamped);
  })
);
router3.get(
  "/my",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.contribution.findMany({
      where: { utilisateurId: req.user.id },
      orderBy: { dateEnvoi: "desc" }
    });
    res.json(rows.map(mapContribution));
  })
);
router3.post(
  "/",
  authenticateJWT,
  express2.json({ limit: "22mb" }),
  uploadPdf.single("fichier"),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const user = req.user;
    let fichierUrl = body.fichierUrl;
    let fichierNom = body.fichierNom || "Epreuve_Soumise.pdf";
    if (req.file) {
      fichierUrl = await uploadPdfBuffer(req.file.buffer, req.file.originalname);
      fichierNom = req.file.originalname;
    } else if (fichierUrl) {
      fichierUrl = await resolvePdfUrl(fichierUrl, fichierNom);
    }
    if (!fichierUrl) {
      throw badRequest("Veuillez joindre un fichier PDF de l'\xE9preuve.");
    }
    const contribution = await prisma.contribution.create({
      data: {
        utilisateurId: user.id,
        utilisateurNom: `${user.prenom} ${user.nom}`,
        utilisateurEmail: user.email,
        anneeAcademique: body.anneeAcademique || "2025-2026",
        matiere: body.matiere || "Analyse 1",
        semestre: body.semestre ? semestreToDb(body.semestre) : "Semestre_1",
        typeEpreuve: body.typeEpreuve || "SN",
        titre: body.titre || null,
        commentaire: body.commentaire?.trim() || null,
        fichierUrl,
        fichierNom,
        statut: "En_attente"
      }
    });
    await logUserActivity(
      {
        userId: user.id,
        userNom: contribution.utilisateurNom,
        userEmail: contribution.utilisateurEmail,
        userRole: user.role,
        actionType: "SUBMIT_CONTRIBUTION",
        description: `A soumis l'\xE9preuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere} ${contribution.anneeAcademique}) pour mod\xE9ration.`,
        targetId: contribution.id,
        targetTitle: contribution.titre || contribution.fichierNom
      }
    );
    await createNotification(
      user.id,
      "Sujet transmis avec succ\xE8s",
      `Votre \xE9preuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere}) a bien \xE9t\xE9 re\xE7ue et est en cours de mod\xE9ration.`,
      "info"
    );
    await createNotification(
      "ADMINS",
      "Nouvelle \xE9preuve en attente de mod\xE9ration",
      `${contribution.utilisateurNom} a d\xE9pos\xE9 l'\xE9preuve '${contribution.titre || contribution.fichierNom}' pour la mati\xE8re ${contribution.matiere}.`,
      "warning",
      "admin-documents"
    );
    res.status(201).json({
      message: "Votre \xE9preuve a \xE9t\xE9 transmise avec succ\xE8s ! Elle est en cours de validation par l'administration.",
      contribution: mapContribution(contribution)
    });
  })
);
router3.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { statut } = req.query;
    const where = statut ? { statut: statutToDb(statut) } : {};
    const rows = await prisma.contribution.findMany({
      where,
      orderBy: { dateEnvoi: "desc" }
    });
    res.json(rows.map(mapContribution));
  })
);
var approveHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }
  if (contribution.statut !== "En_attente") {
    throw badRequest("Cette contribution a d\xE9j\xE0 \xE9t\xE9 trait\xE9e.");
  }
  const semestre = semestreToDb(body.semestre);
  let matiere = await prisma.matiere.findFirst({ where: { nom: body.matiere } });
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: { nom: body.matiere, code: `AUTO-${Date.now()}`, semestre }
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
        visible: body.anneeAcademique !== "2026-2027",
        datePublication: /* @__PURE__ */ new Date(),
        contributionId: contribution.id
      },
      include: { matiere: true }
    })
  ]);
  if (doc.visible) {
    await prisma.userNotification.create({
      data: {
        userId: "ALL",
        titre: "Nouvelle \xE9preuve disponible",
        message: `${doc.titre} \u2014 ${body.matiere}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
        type: "info",
        linkTab: "exams"
      }
    });
  }
  await logAdminAction({
    adminId: req.user.id,
    adminNom: `${req.user.prenom} ${req.user.nom}`,
    adminEmail: req.user.email,
    action: "APPROVE_CONTRIBUTION",
    details: doc.visible ? `A approuv\xE9 et publi\xE9 l'\xE9preuve '${doc.titre}' (${body.matiere} - ${body.typeEpreuve} ${body.anneeAcademique}) soumise par ${contribution.utilisateurNom}.` : `A valid\xE9 l'\xE9preuve '${doc.titre}' (${body.matiere} - ${body.typeEpreuve} ${body.anneeAcademique}) soumise par ${contribution.utilisateurNom}; elle reste masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.`,
    targetId: doc.id,
    targetName: doc.titre
  });
  await createNotification(
    contribution.utilisateurId,
    doc.visible ? "\xC9preuve approuv\xE9e et publi\xE9e" : "\xC9preuve valid\xE9e \u2014 publication \xE0 venir",
    doc.visible ? `F\xE9licitations ! Votre sujet '${doc.titre}' pour ${body.matiere} a \xE9t\xE9 valid\xE9 par l'administration et est d\xE9sormais disponible en ligne.` : `F\xE9licitations ! Votre sujet '${doc.titre}' pour ${body.matiere} a \xE9t\xE9 valid\xE9. Il sera visible apr\xE8s publication par un super administrateur.`,
    "success",
    "exams"
  );
  res.json({
    message: doc.visible ? "Document approuv\xE9 et publi\xE9 avec succ\xE8s sur la plateforme !" : "\xC9preuve 2026-2027 approuv\xE9e et masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.",
    document: mapDocument(doc),
    contribution: mapContribution(updated)
  });
});
var rejectHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }
  if (contribution.statut !== "En_attente") {
    throw badRequest("Cette contribution a d\xE9j\xE0 \xE9t\xE9 trait\xE9e.");
  }
  const updated = await prisma.contribution.update({
    where: { id },
    data: { statut: "Refuse" }
  });
  await deleteStorageFileByUrl(contribution.fichierUrl ?? "");
  await logAdminAction({
    adminId: req.user.id,
    adminNom: `${req.user.prenom} ${req.user.nom}`,
    adminEmail: req.user.email,
    action: "REJECT_CONTRIBUTION",
    details: `A refus\xE9 la contribution '${contribution.titre || contribution.fichierNom}' soumise par ${contribution.utilisateurNom}.`,
    targetId: contribution.id,
    targetName: contribution.fichierNom
  });
  await createNotification(
    contribution.utilisateurId,
    "Soumission non retenue",
    `Votre soumission '${contribution.titre || contribution.fichierNom}' pour ${contribution.matiere} n'a pas \xE9t\xE9 valid\xE9e par l'administration.`,
    "error"
  );
  res.json({ message: "Contribution refus\xE9e.", contribution: mapContribution(updated) });
});
router3.put("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), validate(approveSchema), approveHandler);
router3.post("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), validate(approveSchema), approveHandler);
router3.put("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), rejectHandler);
router3.post("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), rejectHandler);
var contributions_default = router3;

// server/routes/matieres.ts
import { Router as Router4 } from "express";
import { z as z4 } from "zod";
var router4 = Router4();
var uuidParam3 = z4.object({ id: z4.string().uuid("Identifiant invalide.") });
var createSchema2 = z4.object({
  nom: z4.string().min(2, "Le nom de la mati\xE8re est requis.").max(120),
  code: z4.string().min(2, "Le code est requis.").max(20),
  semestre: z4.enum(["Semestre 1", "Semestre 2"]),
  description: z4.string().max(500).optional()
});
var updateSchema2 = createSchema2.partial();
router4.get(
  "/",
  asyncHandler(async (_req, res) => {
    const matieres = await prisma.matiere.findMany({ orderBy: [{ semestre: "asc" }, { nom: "asc" }] });
    const docsByMatiere = await prisma.document.groupBy({
      by: ["matiereId"],
      where: { statut: "Publie", visible: true },
      _count: { _all: true }
    });
    const countMap = new Map(docsByMatiere.map((d) => [d.matiereId, d._count._all]));
    res.json(matieres.map((m) => mapMatiere(m, countMap.get(m.id) ?? 0)));
  })
);
router4.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema2),
  asyncHandler(async (req, res) => {
    const { nom, code, semestre, description } = req.body;
    const existing = await prisma.matiere.findUnique({ where: { code: code.trim() } });
    if (existing) {
      throw badRequest("Un code de mati\xE8re existe d\xE9j\xE0.");
    }
    const matiere = await prisma.matiere.create({
      data: { nom: nom.trim(), code: code.trim(), semestre: semestreToDb(semestre), description: description?.trim() || null }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "ADD_MATIERE",
      details: `A ajout\xE9 la mati\xE8re '${matiere.nom}' (${matiere.code}).`,
      targetId: matiere.id,
      targetName: matiere.nom
    });
    res.status(201).json({ message: "Mati\xE8re cr\xE9\xE9e avec succ\xE8s.", matiere: mapMatiere(matiere, 0) });
  })
);
router4.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam3, "params"),
  validate(updateSchema2),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Mati\xE8re introuvable.");
    }
    const { nom, code, semestre, description } = req.body;
    const matiere = await prisma.matiere.update({
      where: { id: existing.id },
      data: {
        nom: nom?.trim() ?? existing.nom,
        code: code?.trim() ?? existing.code,
        semestre: semestre ? semestreToDb(semestre) : existing.semestre,
        description: description !== void 0 ? description.trim() || null : existing.description
      }
    });
    res.json({ message: "Mati\xE8re mise \xE0 jour avec succ\xE8s.", matiere: mapMatiere(matiere, 0) });
  })
);
router4.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam3, "params"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Mati\xE8re introuvable.");
    }
    await prisma.matiere.delete({ where: { id: existing.id } });
    res.json({ message: "Mati\xE8re supprim\xE9e avec succ\xE8s." });
  })
);
var matieres_default = router4;

// server/routes/users.ts
import { Router as Router5 } from "express";
import { z as z5 } from "zod";
import { randomBytes } from "crypto";
var router5 = Router5();
var uuidParam4 = z5.object({ id: z5.string().uuid("Identifiant invalide.") });
var profileSchema = z5.object({
  nom: z5.string().min(2).max(80).optional(),
  prenom: z5.string().min(2).max(80).optional(),
  email: z5.string().email().max(200).optional(),
  telephone: z5.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres apr\xE8s +237)").optional().nullable(),
  currentMotDePasse: z5.string().min(1).max(128).optional(),
  nouveauMotDePasse: z5.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res.").max(128).regex(/[a-zA-Z]/, "Le mot de passe doit contenir une lettre.").regex(/[0-9]/, "Le mot de passe doit contenir un chiffre.").regex(/[^a-zA-Z0-9\s]/, "Le mot de passe doit contenir un caract\xE8re sp\xE9cial.").optional()
});
var createUserSchema = z5.object({
  nom: z5.string().min(2).max(80),
  prenom: z5.string().min(2).max(80),
  email: z5.string().email().max(200),
  role: z5.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]).optional(),
  telephone: z5.string().regex(/^\+237[0-9]{9}$/, "Format invalide : +237XXXXXXXXX (9 chiffres apr\xE8s +237)").optional().nullable(),
  motDePasse: z5.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9\s]/).optional()
});
var updateRoleSchema = z5.object({
  role: z5.enum(["Etudiant", "Administrateur", "SuperAdministrateur"])
});
router5.put(
  "/profile",
  authenticateJWT,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    const { nom, prenom, email, telephone, nouveauMotDePasse, currentMotDePasse } = req.body;
    let newEmail = user.email;
    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        throw badRequest("Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e par un autre compte.");
      }
      newEmail = email.trim().toLowerCase();
    }
    const newTelephone = telephone !== void 0 ? telephone?.trim() || null : user.telephone;
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
        telephone: newTelephone
      }
    });
    res.json({ user: mapUser(updated), message: "Vos informations de profil ont \xE9t\xE9 mises \xE0 jour avec succ\xE8s !" });
  })
);
router5.get(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(mapUser));
  })
);
router5.post(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, role, telephone, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Un utilisateur avec cet e-mail existe d\xE9j\xE0.");
    }
    const assignedRole = role ?? "Administrateur";
    const trimmedTelephone = telephone?.trim() || null;
    const temporaryPassword = motDePasse?.trim() || `${randomBytes(18).toString("base64url")}aA1!`;
    const authId = await createSupabaseUser(trimmedEmail, temporaryPassword, trimmedTelephone ?? void 0);
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
        telephone: trimmedTelephone,
        role: assignedRole
      }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CREATE_USER",
      details: `A cr\xE9\xE9 le compte '${user.prenom} ${user.nom}' (${user.email}) attribu\xE9 au r\xF4le '${user.role}'.`,
      targetId: user.id,
      targetName: `${user.prenom} ${user.nom}`
    });
    res.status(201).json({
      message: motDePasse ? "Utilisateur cr\xE9\xE9 avec succ\xE8s." : "Utilisateur cr\xE9\xE9 avec succ\xE8s. Un mot de passe temporaire al\xE9atoire lui a \xE9t\xE9 attribu\xE9.",
      user: mapUser(user),
      ...motDePasse ? {} : { temporaryPassword }
    });
  })
);
router5.put(
  "/:id/role",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam4, "params"),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    if (target.id === req.user.id) {
      throw forbidden("Vous ne pouvez pas modifier votre propre r\xF4le.");
    }
    const { role } = req.body;
    const oldRole = target.role;
    const updated = await prisma.user.update({ where: { id: target.id }, data: { role } });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CHANGE_USER_ROLE",
      details: `A modifi\xE9 le r\xF4le de ${updated.prenom} ${updated.nom} (${updated.email}) de '${oldRole}' \xE0 '${role}'.`,
      targetId: updated.id,
      targetName: `${updated.prenom} ${updated.nom}`
    });
    await createNotification(
      updated.id,
      "\xC9l\xE9vation / Modification de R\xF4le",
      `F\xE9licitations ! Vos privil\xE8ges syst\xE8me sur la plateforme ISJ Revisio ont \xE9t\xE9 mis \xE0 jour au statut '${role}'.`,
      role === "Administrateur" || role === "SuperAdministrateur" ? "success" : "info",
      role === "Administrateur" ? "admin-dashboard" : role === "SuperAdministrateur" ? "super-admin-audit" : void 0
    );
    res.json({ message: "Le r\xF4le a \xE9t\xE9 mis \xE0 jour avec succ\xE8s.", user: mapUser(updated) });
  })
);
router5.delete(
  "/:id",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam4, "params"),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    if (target.id === req.user.id) {
      throw forbidden("Vous ne pouvez pas supprimer votre propre compte.");
    }
    await deleteSupabaseUser(target.id);
    await prisma.user.delete({ where: { id: target.id } });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "DELETE_USER",
      details: `A supprim\xE9 le compte '${target.prenom} ${target.nom}' (${target.email}, r\xF4le ${target.role}).`,
      targetId: target.id,
      targetName: `${target.prenom} ${target.nom}`
    });
    res.json({ message: "Compte supprim\xE9 avec succ\xE8s." });
  })
);
var users_default = router5;

// server/routes/activities.ts
import { Router as Router6 } from "express";
import { z as z6 } from "zod";
var router6 = Router6();
var uuidParam5 = z6.object({ id: z6.string().uuid("Identifiant invalide.") });
var ALLOWED_ACTION_TYPES = [
  "REGISTER",
  "LOGIN",
  "DOWNLOAD_DOCUMENT",
  "SUBMIT_CONTRIBUTION",
  "APPROVE_CONTRIBUTION",
  "REJECT_CONTRIBUTION",
  "CREATE_DOCUMENT",
  "DELETE_DOCUMENT",
  "ADD_MATIERE",
  "UPDATE_DOCUMENT",
  "DELETE_USER",
  "CREATE_USER",
  "CHANGE_USER_ROLE"
];
var listQuerySchema2 = z6.object({
  actionType: z6.string().max(50).optional(),
  actionTypes: z6.string().max(300).optional(),
  search: z6.string().max(200).optional(),
  page: z6.coerce.number().int().positive().optional(),
  pageSize: z6.coerce.number().int().positive().max(100).optional()
});
var createSchema3 = z6.object({
  actionType: z6.enum(ALLOWED_ACTION_TYPES),
  description: z6.string().min(1, "La description est requise.").max(500, "La description est trop longue."),
  targetId: z6.string().uuid().optional(),
  targetTitle: z6.string().max(200).optional()
});
router6.get(
  "/",
  authenticateJWT,
  validate(listQuerySchema2, "query"),
  asyncHandler(async (req, res) => {
    const { actionType, actionTypes, search, page = 1, pageSize = 50 } = req.query;
    const user = req.user;
    const where = {};
    if (user.role !== "SuperAdministrateur") {
      where.userId = user.id;
    }
    if (actionTypes) {
      const types = actionTypes.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length) {
        where.actionType = { in: types };
      }
    } else if (actionType && actionType !== "all") {
      where.actionType = actionType;
    }
    if (search) {
      const q = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { userNom: { contains: q, mode: "insensitive" } },
            { userEmail: { contains: q, mode: "insensitive" } },
            { actionType: { contains: q, mode: "insensitive" } },
            { targetTitle: { contains: q, mode: "insensitive" } }
          ]
        }
      ];
    }
    const [rows, total, groupAgg] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.userActivity.count({ where }),
      prisma.userActivity.groupBy({
        by: ["actionType"],
        where: user.role !== "SuperAdministrateur" ? { userId: user.id } : {},
        _count: { _all: true }
      })
    ]);
    const countByType = {};
    for (const g of groupAgg) {
      countByType[g.actionType] = g._count._all;
    }
    const counts = Object.fromEntries(
      Object.entries(CATEGORY_ACTION_TYPES).map(([key, types]) => [
        key,
        types.reduce((sum, t) => sum + (countByType[t] ?? 0), 0)
      ])
    );
    res.json({
      data: rows.map(mapActivity),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts
    });
  })
);
var CATEGORY_ACTION_TYPES = {
  download: ["DOWNLOAD_DOCUMENT"],
  submit: ["SUBMIT_CONTRIBUTION"],
  moderation: ["APPROVE_CONTRIBUTION", "REJECT_CONTRIBUTION", "CREATE_DOCUMENT", "DELETE_DOCUMENT"]
};
router6.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema3),
  asyncHandler(async (req, res) => {
    const { actionType, description, targetId, targetTitle } = req.body;
    const user = req.user;
    const act = await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType,
      description,
      targetId,
      targetTitle
    });
    res.status(201).json(mapActivity(act));
  })
);
var activities_default = router6;

// server/routes/notifications.ts
import { Router as Router7 } from "express";
import { z as z7 } from "zod";
var router7 = Router7();
var uuidParam6 = z7.object({ id: z7.string().uuid("Identifiant invalide.") });
function visibleIds(user) {
  if (user.role === "Administrateur" || user.role === "SuperAdministrateur") {
    return [user.id, "ALL", "ADMINS"];
  }
  return [user.id, "ALL"];
}
function receiptKey(userId, notificationId) {
  return { userId_notificationId: { userId, notificationId } };
}
router7.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(req.user) } },
      orderBy: { createdAt: "desc" }
    });
    const receipts = await prisma.notificationReceipt.findMany({
      where: { userId: req.user.id, notificationId: { in: rows.map((row) => row.id) } }
    });
    const receiptsByNotification = new Map(receipts.map((receipt) => [receipt.notificationId, receipt]));
    const visibleRows = rows.flatMap((row) => {
      const receipt = receiptsByNotification.get(row.id);
      if (receipt?.deletedAt) return [];
      const isShared = row.userId !== req.user.id;
      return [mapNotification({
        ...row,
        lue: isShared ? !!receipt?.readAt : row.lue || !!receipt?.readAt
      })];
    });
    res.json(visibleRows);
  })
);
router7.put(
  "/read-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user) } },
      select: { id: true, userId: true }
    });
    const personalIds = rows.filter((row) => row.userId === user.id).map((row) => row.id);
    const sharedIds = rows.filter((row) => row.userId !== user.id).map((row) => row.id);
    const readAt = /* @__PURE__ */ new Date();
    await prisma.$transaction([
      prisma.userNotification.updateMany({
        where: { id: { in: personalIds }, userId: user.id },
        data: { lue: true }
      }),
      ...sharedIds.map((notificationId) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, notificationId),
        create: { userId: user.id, notificationId, readAt },
        update: { readAt, deletedAt: null }
      }))
    ]);
    res.json({ message: "Toutes les notifications ont \xE9t\xE9 marqu\xE9es comme lues.", count: rows.length });
  })
);
router7.put(
  "/:id/read",
  authenticateJWT,
  validate(uuidParam6, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    if (notif.userId === req.user.id) {
      const updated = await prisma.userNotification.update({
        where: { id: notif.id },
        data: { lue: true }
      });
      return res.json({ message: "Notification marqu\xE9e comme lue.", notification: mapNotification(updated) });
    }
    const readAt = /* @__PURE__ */ new Date();
    await prisma.notificationReceipt.upsert({
      where: receiptKey(req.user.id, notif.id),
      create: { userId: req.user.id, notificationId: notif.id, readAt },
      update: { readAt, deletedAt: null }
    });
    res.json({
      message: "Notification marqu\xE9e comme lue.",
      notification: mapNotification({ ...notif, lue: true })
    });
  })
);
router7.delete(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const shared = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user), not: user.id } },
      select: { id: true }
    });
    const deletedAt = /* @__PURE__ */ new Date();
    const results = await prisma.$transaction([
      prisma.userNotification.deleteMany({ where: { userId: user.id } }),
      ...shared.map(({ id }) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, id),
        create: { userId: user.id, notificationId: id, deletedAt },
        update: { deletedAt }
      }))
    ]);
    res.json({ message: "Toutes les notifications ont \xE9t\xE9 effac\xE9es.", count: results[0].count + shared.length });
  })
);
router7.delete(
  "/:id",
  authenticateJWT,
  validate(uuidParam6, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    if (notif.userId === req.user.id) {
      await prisma.userNotification.delete({ where: { id: notif.id } });
    } else {
      const deletedAt = /* @__PURE__ */ new Date();
      await prisma.notificationReceipt.upsert({
        where: receiptKey(req.user.id, notif.id),
        create: { userId: req.user.id, notificationId: notif.id, deletedAt },
        update: { deletedAt }
      });
    }
    res.json({ message: "Notification supprim\xE9e." });
  })
);
var notifications_default = router7;

// server/routes/stats.ts
import { Router as Router8 } from "express";
var router8 = Router8();
async function computeStats() {
  const [totalUsers, totalDocuments, documentsPublies, documentsEnAttente, totalContributions, totalAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.document.count({ where: { statut: "Publie", visible: true } }),
    prisma.contribution.count({ where: { statut: "En_attente" } }),
    prisma.contribution.count(),
    prisma.auditLog.count()
  ]);
  return {
    totalUsers,
    totalDocuments,
    documentsPublies,
    documentsEnAttente,
    totalContributions,
    totalAuditLogs
  };
}
router8.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
router8.get(
  "/stats",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
router8.get(
  "/dashboard",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
var stats_default = router8;

// server/routes/admin.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get(
  "/audit-logs",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { adminId, action, search } = req.query;
    const where = {};
    if (adminId && adminId !== "all") {
      where.OR = [{ adminId }, { adminEmail: { equals: adminId.toLowerCase(), mode: "insensitive" } }];
    }
    if (action && action !== "all") {
      where.action = action;
    }
    if (search) {
      const q = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { details: { contains: q, mode: "insensitive" } },
            { adminNom: { contains: q, mode: "insensitive" } },
            { adminEmail: { contains: q, mode: "insensitive" } },
            { targetName: { contains: q, mode: "insensitive" } }
          ]
        }
      ];
    }
    const rows = await prisma.auditLog.findMany({ where, orderBy: { date: "desc" } });
    res.json(rows.map(mapAuditLog));
  })
);
var admin_default = router9;

// server/routes/contact.ts
import { Router as Router10 } from "express";
import { z as z8 } from "zod";
import { randomUUID as randomUUID2 } from "crypto";

// server/services/feedback.service.ts
import { promises as fs3 } from "fs";
import path4 from "path";
import os2 from "os";
var DATA_DIR = process.env.VERCEL ? path4.join(os2.tmpdir(), "data") : path4.join(process.cwd(), "data");
var FILE = path4.join(DATA_DIR, "contact-messages.json");
var writeQueue = Promise.resolve();
async function readRecords() {
  try {
    const raw = await fs3.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
async function appendFeedback(record) {
  writeQueue = writeQueue.then(async () => {
    const rows = await readRecords();
    rows.push(record);
    await fs3.mkdir(DATA_DIR, { recursive: true });
    await fs3.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  });
  return writeQueue;
}
async function feedbackFileExists() {
  try {
    await fs3.access(FILE);
    return true;
  } catch {
    return false;
  }
}
function getFeedbackFilePath() {
  return FILE;
}

// server/routes/contact.ts
var router10 = Router10();
var contactSchema = z8.object({
  nom: z8.string().min(1, "Le nom est requis.").max(100, "Le nom est trop long."),
  email: z8.string().email("Adresse e-mail invalide.").max(200),
  sujet: z8.string().max(150, "Le sujet est trop long.").optional(),
  message: z8.string().min(1, "Le message est requis.").max(2e3, "Le message est trop long."),
  categorie: z8.string().max(50, "La cat\xE9gorie est trop longue.").optional()
});
router10.post(
  "/",
  authRateLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { nom, email, sujet, message, categorie } = req.body;
    await appendFeedback({
      id: randomUUID2(),
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      categorie: String(categorie ?? "").trim() || "G\xE9n\xE9ral",
      sujet: String(sujet ?? "").trim(),
      message: String(message).trim(),
      date: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ message: "Message envoy\xE9 avec succ\xE8s. L'\xE9quipe ISJ vous r\xE9pondra rapidement." });
  })
);
router10.get(
  "/feedback",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const file = getFeedbackFilePath();
    if (!await feedbackFileExists()) {
      return res.status(404).json({ message: "Aucun retour utilisateur pour le moment." });
    }
    res.download(file, `retours-utilisateurs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
  })
);
var contact_default = router10;

// server/middlewares/errorHandler.ts
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }
  if (err && typeof err === "object") {
    const e = err;
    if (e.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Corps de requ\xEAte invalide (JSON malform\xE9)." });
    }
    if (e.type === "entity.too.large") {
      return res.status(413).json({ message: "Corps de requ\xEAte trop volumineux." });
    }
    if (e.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Fichier trop volumineux (maximum 15 Mo)." });
    }
    if (e.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Champ de fichier invalide." });
    }
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Ressource introuvable." });
    }
    if (e.code === "P2023") {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Conflit : une ressource identique existe d\xE9j\xE0." });
    }
  }
  console.error("Erreur serveur:", err);
  return res.status(500).json({ message: "Erreur interne du serveur." });
}

// server/middlewares/security.ts
import helmet from "helmet";
function cspDirectives(isProduction) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...isProduction ? [] : ["'unsafe-inline'"]],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'", ...isProduction ? [] : ["ws:", "wss:"]],
    frameSrc: ["'self'", "https:", "blob:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"]
  };
  if (isProduction) {
    directives.upgradeInsecureRequests = [];
  }
  return directives;
}
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives(process.env.NODE_ENV === "production")
    },
    // Cross-Origin-Embedder-Policy require-corp bloquerait l'affichage des PDF
    // hébergés sur un autre domaine (Supabase). Désactivé volontairement.
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 15552e3, includeSubDomains: true } : false
  });
}
function apiNotFound(_req, res, _next) {
  res.status(404).json({ message: "Ressource introuvable." });
}

// server/app.ts
function createApp() {
  const app2 = express3();
  app2.disable("x-powered-by");
  app2.use((req, _res, next) => {
    if (req.url && !req.url.startsWith("/api")) {
      req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
    }
    next();
  });
  if (env.trustProxy > 0) {
    app2.set("trust proxy", env.trustProxy);
  }
  app2.use(securityHeaders());
  const standardJsonParser = express3.json({ limit: "1mb" });
  app2.use((req, res, next) => {
    const isLargePdfJsonUpload = req.method === "POST" && /^\/api\/(documents|contributions)\/?$/.test(req.path);
    if (isLargePdfJsonUpload) return next();
    return standardJsonParser(req, res, next);
  });
  app2.use("/api", apiLimiter);
  app2.use("/api", (_req, _res, next) => {
    ensureBucket().then(() => next()).catch(next);
  });
  app2.use("/api/contact", contact_default);
  app2.use("/api/auth", auth_default);
  app2.use("/api/documents", documents_default);
  app2.use("/api/contributions", contributions_default);
  app2.use("/api/matieres", matieres_default);
  app2.use("/api/subjects", matieres_default);
  app2.use("/api/users", users_default);
  app2.use("/api/admin/users", users_default);
  app2.use("/api/admin", admin_default);
  app2.use("/api/admin", stats_default);
  app2.use("/api/stats", stats_default);
  app2.use("/api/activities", activities_default);
  app2.use("/api/notifications", notifications_default);
  app2.use("/api", apiNotFound);
  app2.use(errorHandler);
  return app2;
}

// server/api.ts
var app = createApp();
var api_default = app;
export {
  api_default as default
};
