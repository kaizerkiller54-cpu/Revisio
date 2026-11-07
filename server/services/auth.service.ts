import { createPublicKey, randomUUID, type JsonWebKey as CryptoJsonWebKey } from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { env, isMockSupabase } from "../config/env";
import { AppError, unauthorized } from "../utils/errors";
import { supabaseAdmin, supabaseAuth } from "./supabase";

export interface JwtPayload {
  userId: string;
  role: string;
  tokenType: "access" | "refresh";
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  nom: string;
  prenom: string;
}

export interface SupabaseSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

interface MockAuthUserRecord {
  id: string;
  email: string;
  password: string;
  phone?: string | null;
}

export const MOCK_USERS_IDS = {
  superadmin: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  etudiant: "00000000-0000-4000-8000-000000000003",
};

const mockAuthUsers = new Map<string, MockAuthUserRecord>([
  [
    MOCK_USERS_IDS.superadmin,
    {
      id: MOCK_USERS_IDS.superadmin,
      email: "superadmin@isj.cm",
      password: "Password123!",
      phone: "+237699000001",
    },
  ],
  [
    MOCK_USERS_IDS.admin,
    {
      id: MOCK_USERS_IDS.admin,
      email: "admin@isj.cm",
      password: "Password123!",
      phone: "+237699000002",
    },
  ],
  [
    MOCK_USERS_IDS.etudiant,
    {
      id: MOCK_USERS_IDS.etudiant,
      email: "etudiant@isj.cm",
      password: "Password123!",
      phone: "+237699000003",
    },
  ],
]);

function issueMockSession(userId: string): SupabaseSession {
  const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
  const accessToken = jwt.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer,
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "7d" }
  );
  const refreshToken = jwt.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer,
      type: "refresh",
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "30d" }
  );
  return { userId, accessToken, refreshToken };
}

let jwksPromise: Promise<Record<string, string>> | null = null;

async function getJwksPems(): Promise<Record<string, string>> {
  if (!jwksPromise) {
    jwksPromise = (async () => {
      const res = await fetch(`${env.supabase.url}/auth/v1/.well-known/jwks.json`);
      if (!res.ok) throw new Error(`Récupération de la clé JWKS impossible (${res.status}).`);
      const data = (await res.json()) as { keys: Array<{ kid?: string }> };
      const pems: Record<string, string> = {};
      for (const key of data.keys) {
        const kid = key.kid ?? "default";
        pems[kid] = createPublicKey({ key: key as unknown as CryptoJsonWebKey, format: "jwk" }).export({
          type: "spki",
          format: "pem",
        }) as string;
      }
      return pems;
    })();
  }
  return jwksPromise;
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  try {
    const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
    const verifyClaims = (payload: { sub?: string; role?: string; aud?: string | string[] }) => {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!payload.sub || payload.role !== "authenticated" || !audiences.includes("authenticated")) {
        throw new Error("Claims de session invalides");
      }
      return { userId: payload.sub, role: payload.role, tokenType: "access" as const };
    };
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as {
      alg?: string;
      kid?: string;
    };

    if (header.alg === "HS256") {
      const payload = jwt.verify(token, env.supabase.jwtSecret, { algorithms: ["HS256"], issuer }) as {
        sub?: string;
        role?: string;
        aud?: string | string[];
      };
      return verifyClaims(payload);
    }

    const pems = await getJwksPems();
    const key = header.kid ? pems[header.kid] : Object.values(pems)[0];
    if (!key) throw new Error("clé JWKS introuvable");
    const payload = jwt.verify(token, key, { algorithms: ["ES256"], issuer }) as {
      sub?: string;
      role?: string;
      aud?: string | string[];
    };
    return verifyClaims(payload);
  } catch {
    throw new AppError(401, "Session expirée ou invalide.");
  }
}

export async function signInSupabase(email: string, password: string): Promise<SupabaseSession> {
  const normalized = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (isMockSupabase) {
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (!found || (found.password !== password && found.password !== trimmedPassword)) {
      throw unauthorized("E-mail ou mot de passe incorrect.");
    }
    return issueMockSession(found.id);
  }

  // 1. Première tentative avec le mot de passe tel que saisi
  let { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: normalized,
    password,
  });

  // 2. Si échec et que le mot de passe contenait des espaces superflus (ex: copier/coller mobile), réessai avec trim
  if (error && password !== trimmedPassword && trimmedPassword.length > 0) {
    const retry = await supabaseAuth.auth.signInWithPassword({
      email: normalized,
      password: trimmedPassword,
    });
    if (!retry.error && retry.data.session && retry.data.user) {
      data = retry.data;
      error = null;
    }
  }

  // 3. Si l'e-mail n'est pas encore confirmé sur Supabase, auto-confirmation administrative et réessai
  if (error && /email.*not.*confirm/i.test(error.message)) {
    const existingAuthUser = await findSupabaseUserByEmail(normalized);
    if (existingAuthUser) {
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { email_confirm: true });
      const retry = await supabaseAuth.auth.signInWithPassword({
        email: normalized,
        password: trimmedPassword || password,
      });
      if (!retry.error && retry.data.session && retry.data.user) {
        data = retry.data;
        error = null;
      }
    }
  }

  if (error || !data?.session || !data?.user) {
    if (error && /rate limit|too many requests/i.test(error.message)) {
      throw new AppError(429, "Trop de tentatives de connexion auprès du service d'authentification. Veuillez patienter une minute.");
    }
    throw unauthorized("E-mail ou mot de passe incorrect.");
  }

  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function findSupabaseUserByEmail(email: string): Promise<{ id: string; email?: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  if (isMockSupabase) {
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    return found ? { id: found.id, email: found.email } : null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
  const user = users.find((u) => u.email?.toLowerCase() === normalized);
  return user ? { id: user.id, email: user.email } : null;
}

export async function createSupabaseUser(
  email: string,
  password: string,
  phone?: string,
  reuseExistingAuthUser = false,
  customId?: string
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  if (isMockSupabase) {
    const existing = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      if (reuseExistingAuthUser) return existing.id;
      throw new AppError(409, "Cette adresse e-mail est déjà liée à un compte d'authentification.");
    }
    const id = customId || randomUUID();
    mockAuthUsers.set(id, { id, email: normalized, password: trimmedPassword, phone: phone || null });
    return id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    id: customId || undefined,
    email: normalized,
    password: trimmedPassword,
    phone: phone || undefined,
    phone_confirm: !!phone,
    email_confirm: true,
  });
  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      if (reuseExistingAuthUser) {
        const existing = await findSupabaseUserByEmail(normalized);
        if (existing) return existing.id;
      }
      throw new AppError(409, "Cette adresse e-mail est déjà liée à un compte d'authentification.");
    }
    throw new AppError(400, `Impossible de créer le compte : ${error.message}`);
  }
  if (!data.user) throw new AppError(500, "Compte créé mais sans identifiant retourné.");
  return data.user.id;
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSession> {
  if (isMockSupabase) {
    try {
      const payload = jwt.verify(refreshToken, env.supabase.jwtSecret) as { sub?: string };
      if (!payload.sub || !mockAuthUsers.has(payload.sub)) {
        throw new Error("Invalid user");
      }
      return issueMockSession(payload.sub);
    } catch {
      throw new AppError(401, "Refresh token invalide ou expiré.");
    }
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    throw new AppError(401, "Refresh token invalide ou expiré.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

/**
 * Révoque une session Supabase côté serveur à partir de son access token.
 * Sans cet appel, une "déconnexion" locale laisserait la session valide
 * jusqu'à expiration du token.
 */
export async function revokeSupabaseSession(accessToken: string): Promise<void> {
  if (!accessToken) throw new AppError(400, "Token de session manquant.");
  if (isMockSupabase) return;

  const res = await fetch(`${env.supabase.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: env.supabase.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new AppError(500, "Révocation de la session Supabase impossible.");
}

export async function updateSupabaseEmail(userId: string, email: string) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.email = email.trim().toLowerCase();
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
  if (error) throw new AppError(400, `Impossible de modifier l'e-mail : ${error.message}`);
}

export async function updateSupabasePassword(userId: string, password: string) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.password = password;
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) throw new AppError(400, `Impossible de modifier le mot de passe : ${error.message}`);
}

export async function updateSupabasePhone(userId: string, phone: string | null) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.phone = phone;
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    phone: phone || undefined,
    phone_confirm: !!phone,
  });
  if (error) throw new AppError(400, `Impossible de modifier le numéro de téléphone : ${error.message}`);
}

export async function deleteSupabaseUser(userId: string) {
  if (isMockSupabase) {
    mockAuthUsers.delete(userId);
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(400, `Impossible de supprimer le compte : ${error.message}`);
  }
}

interface PendingResetCode {
  userId: string;
  email: string;
  phone?: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

const pendingResetCodes = new Map<string, PendingResetCode>();

/**
 * Normalise un numéro de téléphone (ex: "650897459", "237650897459", "+237 650 89 74 59")
 * au format international E.164 (ex: "+237650897459").
 */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  const onlyDigits = digits.replace(/\D/g, "");
  if (!onlyDigits) return "";
  if (onlyDigits.length === 9 && /^[26]/.test(onlyDigits)) {
    return `+237${onlyDigits}`;
  }
  if (onlyDigits.startsWith("237") && onlyDigits.length === 12) {
    return `+${onlyDigits}`;
  }
  return digits.startsWith("+") ? digits : `+${onlyDigits}`;
}

function buildDirectResetEmailHtml(code: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px;">Réinitialisation de votre mot de passe • Revisio ISJ</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        Voici votre code de vérification à usage unique. Saisissez directement ce code sur la page de connexion Revisio pour définir votre nouveau mot de passe :
      </p>
      <div style="text-align: center; margin: 24px 0; padding: 18px; background-color: #1e293b; border: 2px solid #f59e0b; border-radius: 12px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #fbbf24;">${code}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 20px;">
        Ce code est valide pendant 15 minutes. Aucun lien externe n'est requis : restez sur la page de connexion Revisio et entrez simplement ce code.
      </p>
    </div>
  `;
}

async function sendDirectCodeEmail(to: string, code: string): Promise<boolean> {
  const subject = `${code} est votre code de vérification Revisio ISJ`;
  const html = buildDirectResetEmailHtml(code);
  const text = `Votre code de vérification Revisio ISJ est : ${code} (valide 15 minutes). Saisissez ce code directement sur la page de connexion.`;

  // 1. Envoi direct via SMTP (Nodemailer) si configuré dans .env
  if (env.smtp.user && env.smtp.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      });
      await transporter.sendMail({
        from: env.smtp.from || env.smtp.user,
        to,
        subject,
        text,
        html,
      });
      return true;
    } catch (err: any) {
      console.warn(`Erreur d'envoi SMTP direct (${err?.message || err}).`);
    }
  }

  // 2. Envoi direct via API Resend si RESEND_API_KEY est configuré dans .env
  if (env.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.smtp.from || "Revisio ISJ <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
          text,
        }),
      });
      if (res.ok) return true;
    } catch (err: any) {
      console.warn(`Erreur d'envoi Resend direct (${err?.message || err}).`);
    }
  }

  return false;
}

async function sendDirectSmsCode(toPhone: string, code: string): Promise<boolean> {
  if (env.twilio.accountSid && env.twilio.authToken && env.twilio.phoneNumber) {
    try {
      const credentials = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: toPhone,
        From: env.twilio.phoneNumber,
        Body: `Revisio ISJ : Votre code de réinitialisation de mot de passe est ${code} (valide 15 min).`,
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: body.toString(),
        }
      );
      if (res.ok) return true;
      const errData = await res.json().catch(() => ({}));
      console.warn(`Erreur d'envoi SMS Twilio (${res.status}: ${errData?.message || ""}).`);
    } catch (err: any) {
      console.warn(`Erreur d'envoi SMS Twilio direct (${err?.message || err}).`);
    }
  }
  return false;
}

export async function requestPasswordResetCode(email: string, userId: string): Promise<{ sentByEmail: boolean }> {
  const normalized = email.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  pendingResetCodes.set(normalized, {
    userId,
    email: normalized,
    code,
    expiresAt,
    attempts: 0,
  });

  // Priorité 1 : Envoi direct du code par e-mail (si SMTP ou Resend est configuré)
  const sentDirectly = await sendDirectCodeEmail(normalized, code);
  if (sentDirectly) {
    return { sentByEmail: true };
  }

  // Priorité 2 : Envoi via le modèle par défaut "Reauthentication" de Supabase Auth
  // Ce modèle par défaut sur Supabase envoie directement "Enter the code: XXXXXX"
  // dans l'e-mail SANS aucun lien de redirection et SANS nécessiter de serveur SMTP personnalisé.
  if (!isMockSupabase) {
    try {
      const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
      const tempToken = jwt.sign(
        {
          sub: userId,
          role: "authenticated",
          aud: "authenticated",
          iss: issuer,
        },
        env.supabase.jwtSecret,
        { algorithm: "HS256", expiresIn: "15m" }
      );

      const reauthRes = await fetch(`${env.supabase.url}/auth/v1/reauthenticate`, {
        method: "GET",
        headers: {
          apikey: env.supabase.anonKey,
          Authorization: `Bearer ${tempToken}`,
        },
      });

      if (reauthRes.ok) {
        return { sentByEmail: true };
      }

      const errData = await reauthRes.json().catch(() => ({}));
      console.warn(
        `Envoi Supabase reauthenticate limité (${reauthRes.status}: ${errData?.msg || errData?.message || ""}).`
      );
    } catch (err: any) {
      console.warn(`Erreur lors de l'appel reauthenticate Supabase (${err?.message || err}).`);
    }
  }

  console.log(`🔑 [Revisio] Code de réinitialisation pour ${normalized} : ${code} (valide 15 min)`);
  return { sentByEmail: false };
}

export async function requestPasswordResetSmsCode(
  phone: string,
  userId: string,
  userEmail: string
): Promise<{ sentBySms: boolean }> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedEmail = userEmail.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  const record: PendingResetCode = {
    userId,
    email: normalizedEmail,
    phone: normalizedPhone,
    code,
    expiresAt,
    attempts: 0,
  };

  pendingResetCodes.set(normalizedEmail, record);
  pendingResetCodes.set(normalizedPhone, record);

  // Priorité 1 : Envoi direct du SMS via Twilio REST API si configuré
  const sentViaTwilio = await sendDirectSmsCode(normalizedPhone, code);
  if (sentViaTwilio) {
    return { sentBySms: true };
  }

  // Priorité 2 : Envoi d'un code OTP par SMS via Supabase Phone Auth (si un fournisseur SMS est activé dans Supabase)
  if (!isMockSupabase) {
    try {
      await supabaseAdmin.auth.admin
        .updateUserById(userId, {
          phone: normalizedPhone,
          phone_confirm: true,
        })
        .catch(() => undefined);

      const { error: smsOtpError } = await supabaseAuth.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false },
      });

      if (!smsOtpError) {
        return { sentBySms: true };
      }
      console.warn(`Envoi SMS Supabase Phone Auth non disponible (${smsOtpError.message}).`);
    } catch (err: any) {
      console.warn(`Erreur envoi SMS Supabase (${err?.message || err}).`);
    }
  }

  console.log(`📱 [Revisio SMS] Tentative d'envoi SMS pour ${normalizedPhone} (${normalizedEmail}) - aucun fournisseur SMS actif.`);
  return { sentBySms: false };
}

export async function verifyPasswordResetCodeOnly(
  email: string,
  code: string,
  phone?: string | null
): Promise<{ userId: string; resetToken: string }> {
  const normalized = email.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const cleanCode = code.trim().replace(/\s+/g, "");

  const issueResetToken = (uid: string) =>
    jwt.sign(
      {
        sub: uid,
        email: normalized,
        phone: normalizedPhone || undefined,
        purpose: "password_reset_verified",
      },
      env.supabase.jwtSecret,
      { algorithm: "HS256", expiresIn: "10m" }
    );

  // 1. Vérification de la demande en cours et du code local (6 chiffres) par e-mail ou téléphone
  const localEntry =
    pendingResetCodes.get(normalized) ??
    (normalizedPhone ? pendingResetCodes.get(normalizedPhone) : undefined);

  if (localEntry) {
    if (Date.now() > localEntry.expiresAt) {
      pendingResetCodes.delete(normalized);
      if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
      throw new AppError(400, "Ce code de réinitialisation a expiré. Veuillez demander un nouveau code.");
    }
    localEntry.attempts += 1;
    if (localEntry.attempts > 5) {
      pendingResetCodes.delete(normalized);
      if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
      throw new AppError(429, "Trop de tentatives incorrectes. Veuillez demander un nouveau code.");
    }
    if (localEntry.code === cleanCode) {
      return { userId: localEntry.userId, resetToken: issueResetToken(localEntry.userId) };
    }
  }

  if (!isMockSupabase) {
    // 2. Si un numéro de téléphone est fourni, vérifier le code OTP SMS natif Supabase
    if (normalizedPhone) {
      for (const phoneVariant of [normalizedPhone, normalizedPhone.replace(/^\+/, "")]) {
        const { data, error } = await supabaseAuth.auth.verifyOtp({
          phone: phoneVariant,
          token: cleanCode,
          type: "sms",
        });
        if (!error && data?.user?.id) {
          return { userId: data.user.id, resetToken: issueResetToken(data.user.id) };
        }
      }
    }

    // 3. Vérification du code OTP natif Supabase Auth (recovery ou email)
    for (const otpType of ["recovery", "email"] as const) {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        email: normalized,
        token: cleanCode,
        type: otpType,
      });
      if (!error && data?.user?.id) {
        return { userId: data.user.id, resetToken: issueResetToken(data.user.id) };
      }
    }

    // 4. Vérification du code "Reauthentication" (nonce) envoyé par GET /auth/v1/reauthenticate
    const targetUserId = localEntry?.userId ?? (await findSupabaseUserByEmail(normalized))?.id;
    if (targetUserId && /^\d{6,8}$/.test(cleanCode)) {
      const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
      const tempToken = jwt.sign(
        {
          sub: targetUserId,
          role: "authenticated",
          aud: "authenticated",
          iss: issuer,
        },
        env.supabase.jwtSecret,
        { algorithm: "HS256", expiresIn: "15m" }
      );

      // Valide le nonce auprès de Supabase GoTrue (avec Secure password change actif)
      const tempVerificationPassword = ` Verify#${randomUUID()}9aA!`;
      const updateRes = await fetch(`${env.supabase.url}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: env.supabase.anonKey,
          Authorization: `Bearer ${tempToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: tempVerificationPassword,
          nonce: cleanCode,
        }),
      });

      if (updateRes.ok) {
        return { userId: targetUserId, resetToken: issueResetToken(targetUserId) };
      }
    }
  }

  throw new AppError(400, "Code de vérification invalide ou expiré.");
}

export async function verifyResetCodeAndUpdatePassword(
  email: string,
  codeOrResetToken: string,
  newPassword: string,
  phone?: string | null
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const trimmedToken = codeOrResetToken.trim();

  // 1. Si le code a déjà été vérifié à l'étape précédente via un resetToken signé
  if (trimmedToken.includes(".")) {
    try {
      const payload = jwt.verify(trimmedToken, env.supabase.jwtSecret, {
        algorithms: ["HS256"],
      }) as { sub?: string; email?: string; purpose?: string };

      if (
        payload.purpose === "password_reset_verified" &&
        payload.sub &&
        payload.email?.toLowerCase() === normalized
      ) {
        pendingResetCodes.delete(normalized);
        if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
        await updateSupabasePassword(payload.sub, newPassword);
        return payload.sub;
      }
    } catch {
      throw new AppError(400, "La session de réinitialisation a expiré. Veuillez recommencer.");
    }
  }

  // 2. Fallback : vérification directe du code et mise à jour du mot de passe
  const verified = await verifyPasswordResetCodeOnly(normalized, trimmedToken, normalizedPhone);
  pendingResetCodes.delete(normalized);
  if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
  await updateSupabasePassword(verified.userId, newPassword);
  return verified.userId;
}





