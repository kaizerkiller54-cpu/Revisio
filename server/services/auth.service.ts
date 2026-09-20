import { createPublicKey, type JsonWebKey as CryptoJsonWebKey } from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
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
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString()) as {
      alg?: string;
      kid?: string;
    };

    if (header.alg === "HS256") {
      const payload = jwt.verify(token, env.supabase.jwtSecret, { algorithms: ["HS256"] }) as {
        sub?: string;
        role?: string;
      };
      if (!payload.sub) throw new Error("sub manquant");
      return { userId: payload.sub, role: payload.role ?? "authenticated", tokenType: "access" };
    }

    const pems = await getJwksPems();
    const key = header.kid ? pems[header.kid] : Object.values(pems)[0];
    if (!key) throw new Error("clé JWKS introuvable");
    const payload = jwt.verify(token, key, { algorithms: ["ES256"] }) as { sub?: string; role?: string };
    if (!payload.sub) throw new Error("sub manquant");
    return { userId: payload.sub, role: payload.role ?? "authenticated", tokenType: "access" };
  } catch {
    throw new AppError(401, "Session expirée ou invalide.");
  }
}

export async function signInSupabase(email: string, password: string): Promise<SupabaseSession> {
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
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const users = (data?.users ?? []) as Array<{ id: string; email?: string | null }>;
  const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user ? { id: user.id } : null;
}

export async function createSupabaseUser(email: string, password: string, phone?: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    phone: phone || undefined,
    phone_confirm: !!phone,
    email_confirm: true,
  });
  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      const existing = await findSupabaseUserByEmail(email);
      if (existing) return existing.id;
    }
    throw new AppError(400, `Impossible de créer le compte : ${error.message}`);
  }
  if (!data.user) throw new AppError(500, "Compte créé mais sans identifiant retourné.");
  return data.user.id;
}

export async function refreshSupabaseSession(refreshToken: string): Promise<SupabaseSession> {
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
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
  if (error) throw new AppError(400, `Impossible de modifier l'e-mail : ${error.message}`);
}

export async function updateSupabasePassword(userId: string, password: string) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) throw new AppError(400, `Impossible de modifier le mot de passe : ${error.message}`);
}

export async function updateSupabasePhone(userId: string, phone: string | null) {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    phone: phone || undefined,
    phone_confirm: !!phone,
  });
  if (error) throw new AppError(400, `Impossible de modifier le numéro de téléphone : ${error.message}`);
}

export async function deleteSupabaseUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(400, `Impossible de supprimer le compte : ${error.message}`);
  }
}
