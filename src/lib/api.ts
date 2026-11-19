import {
  User,
  UserRole,
  DocumentModel,
  ContributionModel,
  MatiereModel,
  DashboardStats,
  EpreuveType,
  Semestre,
  DocumentStatut,
  AuditLog,
  UserActivity,
  UserNotification
} from "../types";

const AUTH_TOKEN_KEY = "isj_auth_token";
const DEVICE_SESSION_KEY = "isj_device_session";
const REFRESH_TOKEN_KEY = "isj_refresh_token";
const DEVICE_ID_KEY = "isj_device_id";
const SESSION_ID_KEY = "isj_session_id";
const PERSISTENT_PREF_KEY = "isj_remember_device";

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId || deviceId.length < 8) {
      deviceId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return "web-device-default";
  }
}

export function getStoredAccessToken(): string | null {
  try {
    return (
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      sessionStorage.getItem(AUTH_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

export function getStoredDeviceSessionToken(): string | null {
  try {
    return (
      localStorage.getItem(DEVICE_SESSION_KEY) ||
      sessionStorage.getItem(DEVICE_SESSION_KEY) ||
      localStorage.getItem(REFRESH_TOKEN_KEY) ||
      sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
      null
    );
  } catch {
    return null;
  }
}

export function hasStoredSessionCandidate(): boolean {
  return Boolean(getStoredAccessToken() || getStoredDeviceSessionToken());
}

export function saveClientAuthSession(params: {
  token?: string;
  deviceSessionToken?: string;
  refreshToken?: string;
  deviceId?: string;
  sessionId?: string;
  rememberMe?: boolean;
}): void {
  try {
    const remember =
      params.rememberMe !== undefined
        ? params.rememberMe
        : localStorage.getItem(PERSISTENT_PREF_KEY) !== "false";

    localStorage.setItem(PERSISTENT_PREF_KEY, remember ? "true" : "false");
    const primaryStore = remember ? localStorage : sessionStorage;
    const secondaryStore = remember ? sessionStorage : localStorage;

    if (params.deviceId) {
      localStorage.setItem(DEVICE_ID_KEY, params.deviceId);
    }
    if (params.sessionId) {
      primaryStore.setItem(SESSION_ID_KEY, params.sessionId);
    }
    if (params.token) {
      primaryStore.setItem(AUTH_TOKEN_KEY, params.token);
      secondaryStore.removeItem(AUTH_TOKEN_KEY);
    }
    const sessionToken = params.deviceSessionToken || params.refreshToken;
    if (sessionToken) {
      primaryStore.setItem(DEVICE_SESSION_KEY, sessionToken);
      primaryStore.setItem(REFRESH_TOKEN_KEY, sessionToken);
      secondaryStore.removeItem(DEVICE_SESSION_KEY);
      secondaryStore.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearClientAuthSession(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(DEVICE_SESSION_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(DEVICE_SESSION_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_ID_KEY);
  } catch {
    // Ignore storage errors
  }
}

function syncRotatedTokensFromHeaders(res: Response): void {
  try {
    const revoked = res.headers.get("X-Session-Revoked");
    if (revoked === "true") {
      clearClientAuthSession();
      return;
    }
    const renewedAccess = res.headers.get("X-Renewed-Access-Token");
    const rotatedSession = res.headers.get("X-Rotated-Device-Session");
    const deviceId = res.headers.get("X-Device-Id");
    const sessionId = res.headers.get("X-Session-Id");

    if (renewedAccess || rotatedSession || deviceId || sessionId) {
      saveClientAuthSession({
        token: renewedAccess || undefined,
        deviceSessionToken: rotatedSession || undefined,
        deviceId: deviceId || undefined,
        sessionId: sessionId || undefined,
      });
    }
  } catch {
    // Ignore header inspection errors
  }
}

export const getAuthHeader = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "X-Device-Id": getOrCreateDeviceId(),
  };
  const token = getStoredAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const deviceSession = getStoredDeviceSessionToken();
  if (deviceSession) {
    headers["X-Device-Session"] = deviceSession;
  }
  return headers;
};

async function parseJsonResponse<T = any>(
  res: Response,
  defaultErrorMessage = "Erreur de communication avec le serveur"
): Promise<T> {
  syncRotatedTokensFromHeaders(res);

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const rawText = await res.text().catch(() => "");
    const cleanText = rawText.replace(/<[^>]*>?/gm, "").trim();
    if (!res.ok) {
      throw new Error(cleanText || `${defaultErrorMessage} (Code HTTP ${res.status})`);
    }
    if (cleanText) {
      throw new Error(`Réponse inattendue du serveur (${res.status}). Veuillez réessayer.`);
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || `${defaultErrorMessage} (Code HTTP ${res.status})`);
  }

  if (data === null || data === undefined) {
    throw new Error("Réponse serveur vide. Veuillez recharger la page et réessayer.");
  }

  return data as T;
}

export async function loginApi(
  email: string,
  motDePasse: string,
  masterKey?: string,
  rememberMe = true
) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      motDePasse,
      masterKey,
      deviceId,
      rememberMe,
    }),
  });
  const data = await parseJsonResponse<{
    token: string;
    refreshToken?: string;
    deviceSessionToken?: string;
    deviceId?: string;
    sessionId?: string;
    user: User;
    message?: string;
  }>(res, "Échec de connexion.");
  if (!data || typeof data !== "object" || !data.user || !data.token) {
    throw new Error(data?.message || "Données de connexion incomplètes reçues du serveur.");
  }
  saveClientAuthSession({
    token: data.token,
    deviceSessionToken: data.deviceSessionToken || data.refreshToken,
    deviceId: data.deviceId || deviceId,
    sessionId: data.sessionId,
    rememberMe,
  });
  return data;
}

export async function forgotPasswordApi(payload: {
  email?: string;
  telephone?: string;
}): Promise<{ message: string; telephone?: string }> {
  const res = await fetch("/api/auth/forgot-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res, "Impossible d'envoyer le code de vérification.");
}

export async function resetPasswordApi(payload: {
  email?: string;
  telephone?: string;
  code: string;
  nouveauMotDePasse: string;
}): Promise<{ message: string }> {
  const res = await fetch("/api/auth/reset-password", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res, "Impossible de réinitialiser le mot de passe.");
}

export async function verifyResetCodeApi(payload: {
  email?: string;
  telephone?: string;
  code: string;
}): Promise<{
  valid: boolean;
  resetToken: string;
  email?: string;
  telephone?: string;
  message: string;
}> {
  const res = await fetch("/api/auth/verify-reset-code", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res, "Code de vérification invalide ou expiré.");
}

export async function registerApi(
  nom: string,
  prenom: string,
  email: string,
  motDePasse: string,
  role: string,
  masterKey?: string,
  telephone?: string,
  rememberMe = true
) {
  const deviceId = getOrCreateDeviceId();
  const res = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Device-Id": deviceId,
    },
    body: JSON.stringify({
      nom,
      prenom,
      email,
      motDePasse,
      role,
      masterKey,
      telephone,
      deviceId,
      rememberMe,
    }),
  });
  const data = await parseJsonResponse<{
    token: string;
    refreshToken?: string;
    deviceSessionToken?: string;
    deviceId?: string;
    sessionId?: string;
    user: User;
    message?: string;
  }>(res, "Échec de l'inscription.");
  if (!data || typeof data !== "object" || !data.user || !data.token) {
    throw new Error(data?.message || "Compte créé mais session invalide reçues du serveur.");
  }
  saveClientAuthSession({
    token: data.token,
    deviceSessionToken: data.deviceSessionToken || data.refreshToken,
    deviceId: data.deviceId || deviceId,
    sessionId: data.sessionId,
    rememberMe,
  });
  return data;
}

export async function refreshSessionApi(): Promise<User | null> {
  try {
    const deviceSessionToken = getStoredDeviceSessionToken();
    const deviceId = getOrCreateDeviceId();
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        deviceSessionToken: deviceSessionToken || undefined,
        refreshToken: deviceSessionToken || undefined,
        deviceId,
      }),
    });
    syncRotatedTokensFromHeaders(res);
    if (!res.ok) {
      if (res.status === 401) {
        clearClientAuthSession();
      }
      return null;
    }
    const data = await parseJsonResponse<{
      token: string;
      refreshToken?: string;
      deviceSessionToken?: string;
      deviceId?: string;
      sessionId?: string;
      user: User;
    }>(res, "Session expirée");

    if (data?.user && data?.token) {
      saveClientAuthSession({
        token: data.token,
        deviceSessionToken: data.deviceSessionToken || data.refreshToken,
        deviceId: data.deviceId || deviceId,
        sessionId: data.sessionId,
      });
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getMeApi(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    syncRotatedTokensFromHeaders(res);

    if (res.ok) {
      const data = await parseJsonResponse<{
        user: User;
        token?: string;
        deviceSessionToken?: string;
        deviceId?: string;
        sessionId?: string;
      }>(res, "Erreur session");
      if (data?.token || data?.deviceSessionToken) {
        saveClientAuthSession({
          token: data.token,
          deviceSessionToken: data.deviceSessionToken,
          deviceId: data.deviceId,
          sessionId: data.sessionId,
        });
      }
      return data?.user ? (data.user as User) : null;
    }

    // Si /api/auth/me renvoie 401 mais qu'un jeton de session persistant est disponible, tenter une rotation explicite
    if (res.status === 401 && getStoredDeviceSessionToken()) {
      const refreshedUser = await refreshSessionApi();
      if (refreshedUser) return refreshedUser;
    }

    if (res.status === 401) {
      clearClientAuthSession();
    }
    return null;
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
  } catch {
    // La déconnexion locale prime : un échec réseau ne doit jamais bloquer l'utilisateur.
  } finally {
    clearClientAuthSession();
  }
}

export interface ActiveDeviceSessionInfo {
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

export async function getActiveDeviceSessionsApi(): Promise<ActiveDeviceSessionInfo[]> {
  try {
    const res = await fetch("/api/auth/sessions", {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await parseJsonResponse<{ sessions: ActiveDeviceSessionInfo[] }>(
      res,
      "Impossible de charger les sessions."
    );
    return Array.isArray(data?.sessions) ? data.sessions : [];
  } catch {
    return [];
  }
}

export async function revokeDeviceSessionApi(sessionId: string): Promise<{
  revokedSessionId: string;
  revokedCurrentDevice: boolean;
  message: string;
}> {
  const res = await fetch(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de déconnecter cet appareil.");
}

export async function logoutAllDevicesApi(keepCurrentDevice = true): Promise<{
  revokedCount: number;
  message: string;
}> {
  const res = await fetch("/api/auth/logout-all", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ keepCurrentDevice }),
  });
  return parseJsonResponse(res, "Impossible de déconnecter les autres appareils.");
}

export async function updateUserProfileApi(data: {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  nouveauMotDePasse?: string;
  currentMotDePasse?: string;
}) {
  const res = await fetch("/api/users/profile", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res, "Impossible de mettre à jour le profil.");
}

export async function sendContactMessageApi(contactData: {
  nom: string;
  email: string;
  sujet: string;
  message: string;
  categorie?: string;
}) {
  const res = await fetch("/api/contact", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contactData),
  });
  return parseJsonResponse(res, "Impossible d'envoyer le message.");
}

export async function downloadFeedbackApi(): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const res = await fetch("/api/contact/feedback", {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    syncRotatedTokensFromHeaders(res);
    if (!res.ok) return null;
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename="?([^";]+)"?/i.exec(disposition);
    return { blob, filename: match?.[1] ?? "retours-utilisateurs.json" };
  } catch {
    return null;
  }
}

export async function getSubjectsApi(): Promise<MatiereModel[]> {
  const res = await fetch("/api/subjects", { credentials: "include" });
  return parseJsonResponse<MatiereModel[]>(res, "Impossible de charger les matières.");
}

export async function getDocumentsApi(params?: {
  search?: string;
  matiere?: string;
  semestre?: string;
  typeEpreuve?: string;
  anneeAcademique?: string;
  statut?: string;
}): Promise<DocumentModel[]> {
  const url = new URL("/api/documents", window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== "Tous" && value !== "Toutes") {
        url.searchParams.append(key, value);
      }
    });
  }
  const res = await fetch(url.toString(), { credentials: "include" });
  return parseJsonResponse<DocumentModel[]>(res, "Impossible de charger les épreuves.");
}

export async function getHiddenDocumentsApi(): Promise<DocumentModel[]> {
  const res = await fetch("/api/documents/hidden", {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<DocumentModel[]>(res, "Impossible de charger les épreuves masquées.");
}

export async function setDocumentVisibilityApi(id: string, visible: boolean) {
  const res = await fetch(`/api/documents/${id}/visibility`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
    body: JSON.stringify({ visible }),
  });
  return parseJsonResponse(res, "Impossible de modifier la visibilité de cette épreuve.");
}

export interface DocumentSearchPage {
  data: DocumentModel[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchSuggestion {
  id: string;
  titre: string;
  matiere: string;
  typeEpreuve: string;
  semestre: string;
  anneeAcademique: string;
  fichierUrl: string;
  score: number;
}

const buildDocumentSearchUrl = (params: {
  search?: string;
  matiere?: string;
  semestre?: string;
  typeEpreuve?: string;
  anneeAcademique?: string;
  statut?: string;
  page?: number;
  pageSize?: number;
}) => {
  const url = new URL("/api/documents/search", window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== "Tous" && value !== "Toutes") {
        url.searchParams.append(key, String(value));
      }
    });
  }
  return url;
};

export async function searchDocumentsApi(params: {
  search?: string;
  matiere?: string;
  semestre?: string;
  typeEpreuve?: string;
  anneeAcademique?: string;
  statut?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DocumentSearchPage> {
  const url = buildDocumentSearchUrl(params);
  const res = await fetch(url.toString(), { credentials: "include" });
  return parseJsonResponse<DocumentSearchPage>(res, "Impossible d'effectuer la recherche.");
}

export async function suggestDocumentsApi(q: string, limit = 6): Promise<SearchSuggestion[]> {
  const url = new URL("/api/documents/suggest", window.location.origin);
  url.searchParams.append("q", q);
  url.searchParams.append("limit", String(limit));
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) return [];
  const data = await parseJsonResponse<{ data: SearchSuggestion[] }>(res, "").catch(() => null);
  return data?.data ?? [];
}

export async function downloadDocumentFileApi(id: string): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const res = await fetch(`/api/documents/${id}/download`, {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    syncRotatedTokensFromHeaders(res);
    if (!res.ok) return null;
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = /filename\*=UTF-8''([^;]+)/i.exec(disposition) ?? /filename="?([^";]+)"?/i.exec(disposition);
    return { blob, filename: match ? decodeURIComponent(match[1]) : "epreuve.pdf" };
  } catch {
    return null;
  }
}

export async function getDocumentByIdApi(id: string): Promise<DocumentModel> {
  const res = await fetch(`/api/documents/${id}`, { credentials: "include" });
  return parseJsonResponse<DocumentModel>(res, "Épreuve non trouvée.");
}

export async function submitContributionApi(payload: {
  utilisateurId?: string;
  utilisateurNom?: string;
  utilisateurEmail?: string;
  anneeAcademique?: string;
  matiere?: string;
  semestre?: Semestre;
  typeEpreuve?: EpreuveType;
  titre?: string;
  commentaire?: string;
  fichierUrl: string;
  fichierNom: string;
}) {
  const res = await fetch("/api/contributions", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse(res, "Échec de l'envoi de la contribution.");
}

export async function getContributionsApi(statut?: DocumentStatut): Promise<ContributionModel[]> {
  const url = new URL("/api/contributions", window.location.origin);
  if (statut) url.searchParams.append("statut", statut);
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<ContributionModel[]>(res, "Impossible de charger les contributions.");
}

export async function approveContributionApi(
  id: string,
  data: {
    titre: string;
    matiere: string;
    semestre: Semestre;
    typeEpreuve: EpreuveType;
    anneeAcademique: string;
  }
) {
  const res = await fetch(`/api/contributions/${id}/approve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res, "Impossible d'approuver le document.");
}

export async function rejectContributionApi(id: string) {
  const res = await fetch(`/api/contributions/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de refuser le document.");
}

export async function deleteDocumentApi(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de supprimer le document.");
}

export async function updateDocumentApi(
  id: string,
  data: Partial<DocumentModel>
) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(data),
  });
  return parseJsonResponse(res, "Impossible de mettre à jour le document.");
}

export async function getAuditLogsApi(params?: {
  adminId?: string;
  action?: string;
  search?: string;
}): Promise<AuditLog[]> {
  const query = new URLSearchParams();
  if (params?.adminId) query.set("adminId", params.adminId);
  if (params?.action) query.set("action", params.action);
  if (params?.search) query.set("search", params.search);

  const res = await fetch(`/api/admin/audit-logs?${query.toString()}`, {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<AuditLog[]>(res, "Impossible de récupérer le journal d'audit.");
}

export interface AdminUserDetails {
  user: User;
  lastSignInAt: string | null;
  lastLogins: UserActivity[];
  favoriteIds: string[];
  favoriteDocuments: DocumentModel[];
  pendingContributions: ContributionModel[];
  allContributions: ContributionModel[];
  recentActivities: UserActivity[];
}

export async function getUsersApi(): Promise<User[]> {
  const res = await fetch("/api/admin/users", {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<User[]>(res, "Impossible de récupérer la liste des utilisateurs.");
}

export async function getUserDetailsApi(userId: string): Promise<AdminUserDetails> {
  const res = await fetch(`/api/admin/users/${userId}/details`, {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<AdminUserDetails>(res, "Impossible de récupérer les détails de l'utilisateur.");
}

export async function createAdminUserApi(userData: {
  nom: string;
  prenom: string;
  email: string;
  role?: UserRole;
  telephone?: string | null;
}): Promise<{ message: string; user: User }> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(userData),
  });
  return parseJsonResponse(res, "Impossible de créer l'administrateur.");
}

export async function deleteUserApi(userId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de supprimer le compte.");
}

export async function updateUserRoleApi(userId: string, role: UserRole): Promise<{ message: string; user: User }> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ role }),
  });
  return parseJsonResponse(res, "Impossible de modifier le rôle.");
}

export async function getAdminStatsApi(): Promise<DashboardStats> {
  const res = await fetch("/api/admin/stats", {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<DashboardStats>(res, "Impossible de charger les statistiques.");
}

export interface DailyAnalyticsPoint {
  dateIso: string;
  label: string;
  fullLabel: string;
  downloads: number;
  contributions: number;
  logins: number;
  uniqueUsers: number;
  connectedUsersList?: string[];
  downloadedDocsList?: string[];
  contributedDocsList?: string[];
}

export interface ContributionActivityEvent {
  id: string;
  userId: string;
  userNom: string;
  userEmail: string;
  userRole: string;
  actionType: string;
  description: string;
  targetId?: string;
  targetTitle?: string;
  matiere?: string;
  typeEpreuve?: string;
  statut?: string;
  timestamp: string;
}

export interface AdminDailyAnalyticsResponse {
  dailySeries: DailyAnalyticsPoint[];
  downloadEvents: UserActivity[];
  loginEvents: UserActivity[];
  contributionEvents: ContributionActivityEvent[];
}

export async function getAdminDailyAnalyticsApi(days = 30): Promise<AdminDailyAnalyticsResponse> {
  const res = await fetch(`/api/admin/daily-analytics?days=${days}`, {
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<AdminDailyAnalyticsResponse>(
    res,
    "Impossible de charger l'évolution quotidienne."
  );
}

// User Activity Logs API
export interface UserActivityPage {
  data: UserActivity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts?: { download: number; submit: number; moderation: number };
}

const EMPTY_ACTIVITY_PAGE: UserActivityPage = { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0, counts: { download: 0, submit: 0, moderation: 0 } };

export async function getUserActivitiesApi(queryString: string): Promise<UserActivityPage> {
  try {
    const res = await fetch(`/api/activities?${queryString}`, {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return EMPTY_ACTIVITY_PAGE;
    const pageData = await parseJsonResponse<UserActivityPage>(res, "").catch(() => null);
    return pageData ? { ...EMPTY_ACTIVITY_PAGE, ...pageData } : EMPTY_ACTIVITY_PAGE;
  } catch {
    return EMPTY_ACTIVITY_PAGE;
  }
}

export async function logUserActivityApi(activityData: {
  actionType: string;
  description: string;
  targetId?: string;
  targetTitle?: string;
  customUser?: { id: string; nom: string; prenom: string; email: string; role: string };
}): Promise<UserActivity | null> {
  try {
    const res = await fetch("/api/activities", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(activityData),
    });
    if (!res.ok) return null;
    return await parseJsonResponse<UserActivity>(res, "").catch(() => null);
  } catch {
    return null;
  }
}

// User Notifications API
export async function getUserNotificationsApi(currentUser?: User | null): Promise<UserNotification[]> {
  try {
    const headers: Record<string, string> = { ...getAuthHeader() };
    if (currentUser) {
      headers["x-user-id"] = currentUser.id;
      headers["x-user-role"] = currentUser.role;
    }

    const res = await fetch("/api/notifications", { credentials: "include", headers });
    if (!res.ok) return [];
    return (await parseJsonResponse<UserNotification[]>(res, "").catch(() => null)) ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationAsReadApi(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: "PUT",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  syncRotatedTokensFromHeaders(res);
  if (!res.ok) throw new Error("Impossible de marquer la notification comme lue.");
}

export async function markAllNotificationsAsReadApi(currentUser?: User | null): Promise<void> {
  const headers: Record<string, string> = { ...getAuthHeader() };
  if (currentUser) {
    headers["x-user-id"] = currentUser.id;
    headers["x-user-role"] = currentUser.role;
  }

  const res = await fetch("/api/notifications/read-all", {
    method: "PUT",
    credentials: "include",
    headers,
  });
  syncRotatedTokensFromHeaders(res);
  if (!res.ok) throw new Error("Impossible de marquer toutes les notifications comme lues.");
}

export async function deleteNotificationApi(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: { ...getAuthHeader() },
  });
  syncRotatedTokensFromHeaders(res);
  if (!res.ok) throw new Error("Impossible de supprimer la notification.");
}

export async function clearAllNotificationsApi(currentUser?: User | null): Promise<void> {
  const headers: Record<string, string> = { ...getAuthHeader() };
  if (currentUser) {
    headers["x-user-id"] = currentUser.id;
    headers["x-user-role"] = currentUser.role;
  }

  const res = await fetch("/api/notifications", {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  syncRotatedTokensFromHeaders(res);
  if (!res.ok) throw new Error("Impossible d'effacer les notifications.");
}

// User Personal Favorites API
export async function getUserFavoritesApi(): Promise<string[]> {
  if (!hasStoredSessionCandidate()) return [];
  try {
    const res = await fetch("/api/users/favorites", {
      credentials: "include",
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return [];
    const data = await parseJsonResponse<{ favorites?: string[] }>(res, "").catch(() => null);
    return Array.isArray(data?.favorites) ? data.favorites : [];
  } catch {
    return [];
  }
}

export async function toggleUserFavoriteApi(documentId: string): Promise<{ favorites: string[]; isFavorite: boolean }> {
  const res = await fetch("/api/users/favorites/toggle", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ documentId }),
  });
  return parseJsonResponse(res, "Impossible de modifier les favoris.");
}

