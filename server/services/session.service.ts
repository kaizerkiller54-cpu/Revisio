import { createHash, randomBytes, randomUUID, timingSafeEqual } from "crypto";
import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isMockSupabase } from "../config/env";
import { supabaseAdmin } from "./supabase";

export interface DeviceSessionRecord {
  sessionId: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  tokenHash: string;
  previousTokenHash?: string | null;
  rotatedAt?: string | null;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  persistent: boolean;
  revokedAt?: string | null;
}

export interface PublicDeviceSessionInfo {
  sessionId: string;
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  persistent: boolean;
  isCurrentDevice: boolean;
}

const PERSISTENT_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 jours (glissants)
const EPHEMERAL_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures si session non persistante
const ROTATION_INTERVAL_MS = 15 * 60 * 1000; // Rotation du jeton de session toutes les 15 min
const ROTATION_GRACE_MS = 60 * 1000; // Fenêtre de tolérance de 60s pour les requêtes parallèles
const MAX_SESSIONS_PER_USER = 15;

export const COOKIE_SESSION_NAME = "revisio_session";
export const COOKIE_ACCESS_NAME = "revisio_access";
export const COOKIE_DEVICE_NAME = "revisio_device_id";

const DATA_DIR = path.join(process.cwd(), ".data");
const SESSIONS_FILE = path.join(DATA_DIR, "device-sessions.json");

// Cache en mémoire indexé par userId -> Map<sessionId, DeviceSessionRecord>
const userSessionsCache = new Map<string, Map<string, DeviceSessionRecord>>();
const hydratedUsers = new Set<string>();
const revokedSessionIds = new Set<string>();
const revokedAccessTokens = new Set<string>();
// Cache temporaire du dernier jeton en clair pendant la fenêtre de grâce de 60s (pour requêtes simultanées)
const graceRotatedTokens = new Map<string, { rawToken: string; expiresAt: number }>();

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeHashEquals(hashA: string | undefined | null, hashB: string | undefined | null): boolean {
  if (!hashA || !hashB) return false;
  const bufA = Buffer.from(hashA, "utf8");
  const bufB = Buffer.from(hashB, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function loadSessionsFromDisk(): void {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw) as Record<string, DeviceSessionRecord[]>;
    for (const [userId, records] of Object.entries(parsed)) {
      if (!Array.isArray(records)) continue;
      const map = new Map<string, DeviceSessionRecord>();
      for (const r of records) {
        if (r && r.sessionId) {
          map.set(r.sessionId, r);
          if (r.revokedAt) {
            revokedSessionIds.add(r.sessionId);
          }
        }
      }
      userSessionsCache.set(userId, map);
    }
  } catch {
    // Ignore disk read errors on cold start
  }
}

loadSessionsFromDisk();

function saveSessionsToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized: Record<string, DeviceSessionRecord[]> = {};
    for (const [userId, sessionMap] of userSessionsCache.entries()) {
      serialized[userId] = Array.from(sessionMap.values());
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(serialized, null, 2), "utf8");
  } catch {
    // Ignore disk write errors on read-only serverless filesystems
  }
}

async function ensureUserSessionsHydrated(userId: string): Promise<Map<string, DeviceSessionRecord>> {
  let map = userSessionsCache.get(userId);
  if (!map) {
    map = new Map<string, DeviceSessionRecord>();
    userSessionsCache.set(userId, map);
  }

  if (hydratedUsers.has(userId) || isMockSupabase) {
    return map;
  }

  hydratedUsers.add(userId);
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      const remoteSessions = data.user.user_metadata?.device_sessions;
      if (Array.isArray(remoteSessions)) {
        for (const item of remoteSessions as DeviceSessionRecord[]) {
          if (!item || !item.sessionId) continue;
          const local = map.get(item.sessionId);
          if (!local) {
            map.set(item.sessionId, item);
            if (item.revokedAt) revokedSessionIds.add(item.sessionId);
          } else {
            // Merge: revocation or newer activity wins
            if (item.revokedAt && !local.revokedAt) {
              local.revokedAt = item.revokedAt;
              revokedSessionIds.add(item.sessionId);
            } else if (
              new Date(item.lastActiveAt).getTime() > new Date(local.lastActiveAt).getTime()
            ) {
              map.set(item.sessionId, item);
            }
          }
        }
        saveSessionsToDisk();
      }
    }
  } catch {
    // Best-effort remote hydration
  }

  return map;
}

async function persistUserSessionsToRemote(userId: string): Promise<void> {
  saveSessionsToDisk();
  if (isMockSupabase) return;

  const map = userSessionsCache.get(userId);
  if (!map) return;

  const now = Date.now();
  // Conserve les sessions actives + les sessions révoquées récemment (7 jours) pour la traçabilité
  const pruned = Array.from(map.values())
    .filter((s) => {
      const exp = new Date(s.expiresAt).getTime();
      if (s.revokedAt) {
        const rev = new Date(s.revokedAt).getTime();
        return now - rev < 7 * 24 * 60 * 60 * 1000;
      }
      return exp > now;
    })
    .sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime())
    .slice(0, MAX_SESSIONS_PER_USER);

  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user) return;
    const currentMeta = data.user.user_metadata || {};
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMeta,
        device_sessions: pruned,
      },
    });
  } catch {
    // Non-blocking remote persistence
  }
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header) return out;
  const pairs = header.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function parseDeviceName(userAgentRaw?: string): string {
  const ua = (userAgentRaw || "").trim();
  if (!ua) return "Navigateur Web";

  let browser = "Navigateur";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";

  let os = "Appareil";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return `${browser} sur ${os}`;
}

export function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

export function resolveDeviceId(req: Request, explicitDeviceId?: string): string {
  const cookies = parseCookies(req);
  const headerDeviceId =
    typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"].trim() : "";
  const candidate =
    (explicitDeviceId && explicitDeviceId.trim()) ||
    headerDeviceId ||
    cookies[COOKIE_DEVICE_NAME] ||
    "";

  if (candidate && /^[a-zA-Z0-9_-]{8,128}$/.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}

export function issueSessionBoundAccessToken(
  userId: string,
  sessionId: string,
  deviceId: string
): string {
  const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
  return jwt.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer,
      sid: sessionId,
      did: deviceId,
      jti: randomUUID(),
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}

function buildRawDeviceSessionToken(userId: string, sessionId: string, secret: string): string {
  return `${userId}.${sessionId}.${secret}`;
}

function parseRawDeviceSessionToken(rawToken?: string | null): {
  userId: string;
  sessionId: string;
  secret: string;
} | null {
  if (!rawToken || typeof rawToken !== "string") return null;
  const parts = rawToken.trim().split(".");
  if (parts.length !== 3) return null;
  const [userId, sessionId, secret] = parts;
  if (!userId || !sessionId || !secret || secret.length < 16) return null;
  return { userId, sessionId, secret };
}

function isHttpsOrIframeContext(req: Request): boolean {
  const proto = req.headers["x-forwarded-proto"];
  if (req.secure) return true;
  if (typeof proto === "string" && proto.toLowerCase().includes("https")) return true;
  const origin = req.headers.origin || req.headers.referer || "";
  if (origin.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAgeSeconds?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "None" | "Lax" | "Strict";
    path?: string;
  }
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (typeof options.maxAgeSeconds === "number") {
    parts.push(`Max-Age=${Math.floor(options.maxAgeSeconds)}`);
    const expires = new Date(Date.now() + options.maxAgeSeconds * 1000).toUTCString();
    parts.push(`Expires=${expires}`);
  }
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  return parts.join("; ");
}

export function attachSessionCookiesAndHeaders(
  req: Request,
  res: Response,
  params: {
    accessToken: string;
    deviceSessionToken: string;
    deviceId: string;
    sessionId: string;
    persistent?: boolean;
  }
): void {
  const secure = isHttpsOrIframeContext(req);
  const sameSite: "None" | "Lax" = secure ? "None" : "Lax";
  const persistent = params.persistent !== false;
  const ttlSeconds = persistent
    ? Math.floor(PERSISTENT_TTL_MS / 1000)
    : Math.floor(EPHEMERAL_TTL_MS / 1000);

  const cookiesToSet = [
    serializeCookie(COOKIE_SESSION_NAME, params.deviceSessionToken, {
      maxAgeSeconds: persistent ? ttlSeconds : undefined,
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    }),
    serializeCookie(COOKIE_ACCESS_NAME, params.accessToken, {
      maxAgeSeconds: persistent ? ttlSeconds : undefined,
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    }),
    serializeCookie(COOKIE_DEVICE_NAME, params.deviceId, {
      maxAgeSeconds: 365 * 24 * 60 * 60,
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    }),
  ];

  res.setHeader("Set-Cookie", cookiesToSet);
  res.setHeader("X-Renewed-Access-Token", params.accessToken);
  res.setHeader("X-Rotated-Device-Session", params.deviceSessionToken);
  res.setHeader("X-Device-Id", params.deviceId);
  res.setHeader("X-Session-Id", params.sessionId);
}

export function clearSessionCookies(req: Request, res: Response): void {
  const secure = isHttpsOrIframeContext(req);
  const sameSite: "None" | "Lax" = secure ? "None" : "Lax";

  const expiredCookies = [
    serializeCookie(COOKIE_SESSION_NAME, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    }),
    serializeCookie(COOKIE_ACCESS_NAME, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
    }),
  ];

  res.setHeader("Set-Cookie", expiredCookies);
  res.setHeader("X-Session-Revoked", "true");
}

/**
 * Crée ou met à jour la session persistante propre à l'appareil lors d'une connexion ou d'une inscription.
 * Chaque appareil (deviceId) possède sa propre session indépendante.
 */
export async function createOrReplaceDeviceSession(
  req: Request,
  userId: string,
  options?: {
    deviceId?: string;
    persistent?: boolean;
  }
): Promise<{
  sessionId: string;
  deviceId: string;
  deviceName: string;
  accessToken: string;
  deviceSessionToken: string;
  expiresAt: string;
  persistent: boolean;
}> {
  const deviceId = resolveDeviceId(req, options?.deviceId);
  const persistent = options?.persistent !== false;
  const userAgent = String(req.headers["user-agent"] || "");
  const deviceName = parseDeviceName(userAgent);
  const ipAddress = extractClientIp(req);

  const sessionMap = await ensureUserSessionsHydrated(userId);

  // Évite les sessions dupliquées sur le même appareil : révoque/remplace toute ancienne session du même deviceId
  for (const [existingSid, existingRecord] of sessionMap.entries()) {
    if (existingRecord.deviceId === deviceId) {
      sessionMap.delete(existingSid);
      revokedSessionIds.add(existingSid);
    }
  }

  const sessionId = randomUUID();
  const rawSecret = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawSecret);
  const nowIso = new Date().toISOString();
  const ttlMs = persistent ? PERSISTENT_TTL_MS : EPHEMERAL_TTL_MS;
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();

  const record: DeviceSessionRecord = {
    sessionId,
    userId,
    deviceId,
    deviceName,
    userAgent: userAgent.slice(0, 256),
    ipAddress,
    tokenHash,
    previousTokenHash: null,
    rotatedAt: nowIso,
    createdAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt: expiresAtIso,
    persistent,
    revokedAt: null,
  };

  sessionMap.set(sessionId, record);

  // Limite le nombre total de sessions par utilisateur en nettoyant les plus anciennes
  if (sessionMap.size > MAX_SESSIONS_PER_USER) {
    const sorted = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
    for (const old of sorted.slice(MAX_SESSIONS_PER_USER)) {
      sessionMap.delete(old.sessionId);
    }
  }

  // Persiste sur disque et synchronise en tâche de fond avec Supabase
  void persistUserSessionsToRemote(userId);

  const deviceSessionToken = buildRawDeviceSessionToken(userId, sessionId, rawSecret);
  const accessToken = issueSessionBoundAccessToken(userId, sessionId, deviceId);

  return {
    sessionId,
    deviceId,
    deviceName,
    accessToken,
    deviceSessionToken,
    expiresAt: expiresAtIso,
    persistent,
  };
}

/**
 * Vérifie et renouvelle (Token Rotation) une session d'appareil persistante.
 */
export async function verifyAndRotateDeviceSessionToken(
  req: Request,
  rawDeviceSessionToken: string,
  forceRotate = false
): Promise<{
  userId: string;
  sessionId: string;
  deviceId: string;
  accessToken: string;
  deviceSessionToken: string;
  rotated: boolean;
  persistent: boolean;
} | null> {
  const parsed = parseRawDeviceSessionToken(rawDeviceSessionToken);
  if (!parsed) return null;

  const { userId, sessionId, secret } = parsed;
  if (revokedSessionIds.has(sessionId)) return null;

  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record || record.revokedAt) {
    revokedSessionIds.add(sessionId);
    return null;
  }

  const now = Date.now();
  if (new Date(record.expiresAt).getTime() <= now) {
    sessionMap.delete(sessionId);
    void persistUserSessionsToRemote(userId);
    return null;
  }

  const candidateHash = sha256Hex(secret);
  const matchesCurrent = safeHashEquals(candidateHash, record.tokenHash);
  const rotatedAtMs = record.rotatedAt ? new Date(record.rotatedAt).getTime() : 0;
  const withinGrace =
    Boolean(record.previousTokenHash) &&
    now - rotatedAtMs <= ROTATION_GRACE_MS &&
    safeHashEquals(candidateHash, record.previousTokenHash);

  if (!matchesCurrent && !withinGrace) {
    // Détection d'utilisation d'un jeton obsolète hors fenêtre de grâce : révocation de sécurité de cette session
    record.revokedAt = new Date().toISOString();
    revokedSessionIds.add(sessionId);
    void persistUserSessionsToRemote(userId);
    return null;
  }

  // Si on est dans la fenêtre de grâce (requête concurrente avec l'ancien jeton tout juste tourné)
  if (withinGrace && !matchesCurrent) {
    const cachedGrace = graceRotatedTokens.get(sessionId);
    if (cachedGrace && cachedGrace.expiresAt > now) {
      const accessToken = issueSessionBoundAccessToken(userId, sessionId, record.deviceId);
      return {
        userId,
        sessionId,
        deviceId: record.deviceId,
        accessToken,
        deviceSessionToken: cachedGrace.rawToken,
        rotated: true,
        persistent: record.persistent,
      };
    }
  }

  const shouldRotate =
    forceRotate || now - rotatedAtMs >= ROTATION_INTERVAL_MS;

  const ttlMs = record.persistent ? PERSISTENT_TTL_MS : EPHEMERAL_TTL_MS;
  record.lastActiveAt = new Date(now).toISOString();
  record.expiresAt = new Date(now + ttlMs).toISOString();
  record.ipAddress = extractClientIp(req);

  let activeRawToken = rawDeviceSessionToken;
  let rotated = false;

  if (shouldRotate) {
    const newSecret = randomBytes(32).toString("base64url");
    record.previousTokenHash = record.tokenHash;
    record.tokenHash = sha256Hex(newSecret);
    record.rotatedAt = new Date(now).toISOString();
    activeRawToken = buildRawDeviceSessionToken(userId, sessionId, newSecret);
    graceRotatedTokens.set(sessionId, {
      rawToken: activeRawToken,
      expiresAt: now + ROTATION_GRACE_MS,
    });
    rotated = true;
  }

  void persistUserSessionsToRemote(userId);

  const accessToken = issueSessionBoundAccessToken(userId, sessionId, record.deviceId);
  return {
    userId,
    sessionId,
    deviceId: record.deviceId,
    accessToken,
    deviceSessionToken: activeRawToken,
    rotated,
    persistent: record.persistent,
  };
}

/**
 * Extrait le jeton de session d'appareil depuis les cookies HttpOnly ou les en-têtes de requête.
 */
export function extractDeviceSessionTokenFromRequest(req: Request): string | null {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_SESSION_NAME]) {
    return cookies[COOKIE_SESSION_NAME];
  }
  const headerToken = req.headers["x-device-session"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }
  return null;
}

/**
 * Extrait le jeton d'accès depuis l'en-tête Authorization ou le cookie HttpOnly.
 */
export function extractAccessTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  const cookies = parseCookies(req);
  if (cookies[COOKIE_ACCESS_NAME]) {
    return cookies[COOKIE_ACCESS_NAME];
  }
  return null;
}

/**
 * Vérifie qu'une session (sessionId) ou un accessToken n'a pas été révoqué côté serveur.
 */
export async function isSessionActiveOnServer(
  userId: string,
  sessionId?: string,
  rawAccessToken?: string
): Promise<boolean> {
  if (rawAccessToken && revokedAccessTokens.has(sha256Hex(rawAccessToken))) {
    return false;
  }
  if (!sessionId) {
    return true;
  }
  if (revokedSessionIds.has(sessionId)) {
    return false;
  }
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record) {
    // Si la session a été créée par ce système mais a été supprimée/expirée
    return false;
  }
  if (record.revokedAt) {
    revokedSessionIds.add(sessionId);
    return false;
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}

/**
 * Révoque uniquement la session de l'appareil actuel côté serveur (lorsque l'utilisateur clique sur « Se déconnecter »).
 * Les autres appareils restent connectés.
 */
export async function revokeCurrentDeviceSession(
  req: Request,
  userId?: string,
  sessionIdFromToken?: string
): Promise<void> {
  const rawAccess = extractAccessTokenFromRequest(req);
  if (rawAccess) {
    revokedAccessTokens.add(sha256Hex(rawAccess));
  }

  const rawDeviceSession = extractDeviceSessionTokenFromRequest(req);
  const parsed = parseRawDeviceSessionToken(rawDeviceSession);
  const targetUserId = userId || parsed?.userId;
  const targetSessionId = sessionIdFromToken || parsed?.sessionId;
  const targetDeviceId =
    typeof req.headers["x-device-id"] === "string"
      ? req.headers["x-device-id"].trim()
      : parseCookies(req)[COOKIE_DEVICE_NAME];

  if (targetSessionId) {
    revokedSessionIds.add(targetSessionId);
    graceRotatedTokens.delete(targetSessionId);
  }

  if (!targetUserId) return;

  const sessionMap = await ensureUserSessionsHydrated(targetUserId);
  const nowIso = new Date().toISOString();

  if (targetSessionId && sessionMap.has(targetSessionId)) {
    const rec = sessionMap.get(targetSessionId)!;
    rec.revokedAt = nowIso;
    revokedSessionIds.add(targetSessionId);
  } else if (targetDeviceId) {
    for (const rec of sessionMap.values()) {
      if (rec.deviceId === targetDeviceId && !rec.revokedAt) {
        rec.revokedAt = nowIso;
        revokedSessionIds.add(rec.sessionId);
      }
    }
  }

  await persistUserSessionsToRemote(targetUserId);
}

/**
 * Révoque une session spécifique d'un appareil par son sessionId.
 */
export async function revokeDeviceSessionById(
  userId: string,
  sessionId: string
): Promise<boolean> {
  revokedSessionIds.add(sessionId);
  graceRotatedTokens.delete(sessionId);
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record) return false;
  record.revokedAt = new Date().toISOString();
  await persistUserSessionsToRemote(userId);
  return true;
}

/**
 * Révoque toutes les sessions de l'utilisateur (ou toutes sauf l'appareil actuel).
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string
): Promise<number> {
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const nowIso = new Date().toISOString();
  let count = 0;

  for (const record of sessionMap.values()) {
    if (exceptSessionId && record.sessionId === exceptSessionId) continue;
    if (!record.revokedAt) {
      record.revokedAt = nowIso;
      revokedSessionIds.add(record.sessionId);
      graceRotatedTokens.delete(record.sessionId);
      count += 1;
    }
  }

  await persistUserSessionsToRemote(userId);
  return count;
}

/**
 * Liste toutes les sessions actives (non révoquées et non expirées) pour un utilisateur.
 */
export async function listActiveUserDeviceSessions(
  userId: string,
  currentSessionId?: string,
  currentDeviceId?: string
): Promise<PublicDeviceSessionInfo[]> {
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const now = Date.now();
  const active: PublicDeviceSessionInfo[] = [];

  for (const record of sessionMap.values()) {
    if (record.revokedAt || revokedSessionIds.has(record.sessionId)) continue;
    if (new Date(record.expiresAt).getTime() <= now) continue;

    const isCurrentDevice = Boolean(
      (currentSessionId && record.sessionId === currentSessionId) ||
        (!currentSessionId && currentDeviceId && record.deviceId === currentDeviceId)
    );

    active.push({
      sessionId: record.sessionId,
      deviceId: record.deviceId,
      deviceName: record.deviceName,
      ipAddress: record.ipAddress,
      createdAt: record.createdAt,
      lastActiveAt: record.lastActiveAt,
      expiresAt: record.expiresAt,
      persistent: record.persistent,
      isCurrentDevice,
    });
  }

  return active.sort((a, b) => {
    if (a.isCurrentDevice !== b.isCurrentDevice) return a.isCurrentDevice ? -1 : 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
}
