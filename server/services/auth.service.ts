import { createPublicKey, randomUUID, type JsonWebKey as CryptoJsonWebKey } from "crypto";
import jwt from "jsonwebtoken";
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
  if (isMockSupabase) {
    const normalized = email.trim().toLowerCase();
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (!found || found.password !== password) {
      throw unauthorized("E-mail ou mot de passe incorrect.");
    }
    return issueMockSession(found.id);
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) {
    throw unauthorized("E-mail ou mot de passe incorrect.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function findSupabaseUserByEmail(email: string): Promise<{ id: string } | null> {
  if (isMockSupabase) {
    const normalized = email.trim().toLowerCase();
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    return found ? { id: found.id } : null;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user ? { id: user.id } : null;
}

export async function createSupabaseUser(
  email: string,
  password: string,
  phone?: string,
  reuseExistingAuthUser = false
): Promise<string> {
  if (isMockSupabase) {
    const normalized = email.trim().toLowerCase();
    const existing = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      if (reuseExistingAuthUser) return existing.id;
      throw new AppError(409, "Cette adresse e-mail est déjà liée à un compte d'authentification.");
    }
    const id = randomUUID();
    mockAuthUsers.set(id, { id, email: normalized, password, phone: phone || null });
    return id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    phone: phone || undefined,
    phone_confirm: !!phone,
    email_confirm: true,
  });
  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      if (reuseExistingAuthUser) {
        const existing = await findSupabaseUserByEmail(email);
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

