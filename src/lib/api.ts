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

export async function loginApi(email: string, motDePasse: string, masterKey?: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, motDePasse, masterKey }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de connexion.");
  return data;
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de l'inscription.");
  return data;
}

export async function getMeApi() {
  const res = await fetch("/api/auth/me", {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as User;
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de mettre à jour le profil.");
  return resData;
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible d'envoyer le message.");
  return resData;
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
  if (!res.ok) throw new Error("Impossible de charger les matières.");
  return res.json();
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
  if (!res.ok) throw new Error("Impossible de charger les épreuves.");
  return res.json();
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
  if (!res.ok) throw new Error("Impossible d'effectuer la recherche.");
  return res.json();
}

export async function suggestDocumentsApi(q: string, limit = 6): Promise<SearchSuggestion[]> {
  const url = new URL("/api/documents/suggest", window.location.origin);
  url.searchParams.append("q", q);
  url.searchParams.append("limit", String(limit));
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
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
  if (!res.ok) throw new Error("Épreuve non trouvée.");
  return res.json();
}

export async function recordDownloadApi(id: string) {
  const res = await fetch(`/api/documents/${id}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  return res.json();
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
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de l'envoi de la contribution.");
  return data;
}

export async function getContributionsApi(statut?: DocumentStatut): Promise<ContributionModel[]> {
  const url = new URL("/api/contributions", window.location.origin);
  if (statut) url.searchParams.append("statut", statut);
  const res = await fetch(url.toString(), {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Impossible de charger les contributions.");
  return res.json();
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible d'approuver le document.");
  return resData;
}

export async function rejectContributionApi(id: string) {
  const res = await fetch(`/api/contributions/${id}/reject`, {
    method: "POST",
    headers: { ...getAuthHeader() },
  });
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de refuser le document.");
  return resData;
}

export async function deleteDocumentApi(id: string) {
  const res = await fetch(`/api/documents/${id}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de supprimer le document.");
  return resData;
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de mettre à jour le document.");
  return resData;
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
  if (!res.ok) throw new Error("Impossible de récupérer le journal d'audit.");
  return res.json();
}

export async function getUsersApi(): Promise<User[]> {
  const res = await fetch("/api/admin/users", {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Impossible de récupérer la liste des utilisateurs.");
  return res.json();
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de créer l'administrateur.");
  return resData;
}

export async function deleteUserApi(userId: string): Promise<{ message: string }> {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: "DELETE",
    headers: { ...getAuthHeader() },
  });
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de supprimer le compte.");
  return resData;
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
  const resData = await res.json();
  if (!res.ok) throw new Error(resData.message || "Impossible de modifier le rôle.");
  return resData;
}

export async function getAdminStatsApi(): Promise<DashboardStats> {
  const res = await fetch("/api/admin/stats", {
    headers: { ...getAuthHeader() },
  });
  if (!res.ok) throw new Error("Impossible de charger les statistiques.");
  return res.json();
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
    return { ...EMPTY_ACTIVITY_PAGE, ...(await res.json()) };
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
    return await res.json();
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
    return await res.json();
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
