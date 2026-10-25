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

const getAuthHeader = () => {
  const token = localStorage.getItem("isj_auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function parseJsonResponse<T = any>(
  res: Response,
  defaultErrorMessage = "Erreur de communication avec le serveur"
): Promise<T> {
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
  }

  if (!res.ok) {
    throw new Error(data?.message || `${defaultErrorMessage} (Code HTTP ${res.status})`);
  }

  return data as T;
}

export async function loginApi(email: string, motDePasse: string, masterKey?: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, motDePasse, masterKey }),
  });
  return parseJsonResponse(res, "Échec de connexion.");
}

export async function registerApi(
  nom: string,
  prenom: string,
  email: string,
  motDePasse: string,
  role: string,
  masterKey?: string,
  telephone?: string
) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nom, prenom, email, motDePasse, role, masterKey, telephone }),
  });
  return parseJsonResponse(res, "Échec de l'inscription.");
}

export async function getMeApi() {
  try {
    const res = await fetch("/api/auth/me", {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) return null;
    const data = await parseJsonResponse<{ user: User }>(res, "Erreur session");
    return data.user as User;
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { ...getAuthHeader() },
    });
  } catch {
    // La déconnexion locale prime : un échec réseau ne doit jamais bloquer l'utilisateur.
  }
}

export async function updateUserProfileApi(data: {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  nouveauMotDePasse?: string;
}) {
  const res = await fetch("/api/users/profile", {
    method: "PUT",
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(contactData),
  });
  return parseJsonResponse(res, "Impossible d'envoyer le message.");
}

export async function downloadFeedbackApi(): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const res = await fetch("/api/contact/feedback", {
      headers: { ...getAuthHeader() },
    });
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
  const res = await fetch("/api/subjects");
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
  const res = await fetch(url.toString());
  return parseJsonResponse<DocumentModel[]>(res, "Impossible de charger les épreuves.");
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
  const res = await fetch(url.toString());
  return parseJsonResponse<DocumentSearchPage>(res, "Impossible d'effectuer la recherche.");
}

export async function suggestDocumentsApi(q: string, limit = 6): Promise<SearchSuggestion[]> {
  const url = new URL("/api/documents/suggest", window.location.origin);
  url.searchParams.append("q", q);
  url.searchParams.append("limit", String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await parseJsonResponse<{ data: SearchSuggestion[] }>(res, "").catch(() => null);
  return data?.data ?? [];
}

export async function downloadDocumentFileApi(id: string): Promise<{ blob: Blob; filename: string } | null> {
  try {
    const res = await fetch(`/api/documents/${id}/download`, {
      headers: { ...getAuthHeader() },
    });
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
  const res = await fetch(`/api/documents/${id}`);
  return parseJsonResponse<DocumentModel>(res, "Épreuve non trouvée.");
}

export async function recordDownloadApi(id: string) {
  const res = await fetch(`/api/documents/${id}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible d'enregistrer le téléchargement.");
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
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de refuser le document.");
}

export async function deleteDocumentApi(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
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
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<AuditLog[]>(res, "Impossible de récupérer le journal d'audit.");
}

export async function getUsersApi(): Promise<User[]> {
  const res = await fetch("/api/admin/users", {
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<User[]>(res, "Impossible de récupérer la liste des utilisateurs.");
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
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse(res, "Impossible de supprimer le compte.");
}

export async function updateUserRoleApi(userId: string, role: UserRole): Promise<{ message: string; user: User }> {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: "PUT",
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
    headers: { ...getAuthHeader() },
  });
  return parseJsonResponse<DashboardStats>(res, "Impossible de charger les statistiques.");
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

    const res = await fetch("/api/notifications", { headers });
    if (!res.ok) return [];
    return (await parseJsonResponse<UserNotification[]>(res, "").catch(() => null)) ?? [];
  } catch {
    return [];
  }
}

export async function markNotificationAsReadApi(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}/read`, {
    method: "PUT",
    headers: { ...getAuthHeader() },
  });
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
    headers,
  });
  if (!res.ok) throw new Error("Impossible de marquer toutes les notifications comme lues.");
}

export async function deleteNotificationApi(id: string): Promise<void> {
  const res = await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
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
    headers,
  });
  if (!res.ok) throw new Error("Impossible d'effacer les notifications.");
}
