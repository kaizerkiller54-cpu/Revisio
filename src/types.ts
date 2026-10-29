export type UserRole = "Etudiant" | "Administrateur" | "SuperAdministrateur";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string | null;
  role: UserRole;
  dateCreation: string;
}

export type AuditActionType =
  | "APPROVE_CONTRIBUTION"
  | "REJECT_CONTRIBUTION"
  | "DELETE_DOCUMENT"
  | "UPDATE_DOCUMENT"
  | "CREATE_DOCUMENT"
  | "CHANGE_USER_ROLE"
  | "CREATE_USER"
  | "DELETE_USER";

export interface AuditLog {
  id: string;
  adminId: string;
  adminNom: string;
  adminEmail: string;
  action: AuditActionType;
  details: string;
  targetId?: string;
  targetName?: string;
  date: string;
}

export type EpreuveType = "CC" | "SN" | "SR" | "TD" | "TP" | "Cours";
export type Semestre = "Semestre 1" | "Semestre 2";
export type DocumentStatut = "En attente" | "Publié" | "Refusé";

export interface DocumentModel {
  id: string;
  titre: string;
  matiere: string;
  semestre: Semestre;
  typeEpreuve: EpreuveType;
  anneeAcademique: string;
  fichierUrl: string;
  fichierNom: string;
  statut: DocumentStatut;
  datePublication?: string;
  dateAjout: string;
  telechargementsCount: number;
  contributionId?: string;
  isContributionPreview?: boolean;
}

export interface ContributionModel {
  id: string;
  utilisateurId: string;
  utilisateurNom: string;
  utilisateurEmail: string;
  anneeAcademique?: string;
  matiere?: string;
  semestre?: Semestre;
  typeEpreuve?: EpreuveType;
  titre?: string;
  commentaire?: string;
  fichierUrl: string;
  fichierNom: string;
  statut: DocumentStatut;
  dateEnvoi: string;
}

export interface MatiereModel {
  id: string;
  nom: string;
  code: string;
  semestre: Semestre;
  description: string;
  countDocs: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  documentsPublies: number;
  documentsEnAttente: number;
  totalContributions: number;
}

export type UserActivityActionType =
  | "DOWNLOAD_DOCUMENT"
  | "VIEW_DOCUMENT"
  | "SEARCH_EXAMS"
  | "SUBMIT_CONTRIBUTION"
  | "APPROVE_CONTRIBUTION"
  | "REJECT_CONTRIBUTION"
  | "CREATE_DOCUMENT"
  | "UPDATE_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "CREATE_USER"
  | "DELETE_USER"
  | "CHANGE_USER_ROLE"
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "ADD_MATIERE";

export interface UserActivity {
  id: string;
  userId: string;
  userNom: string;
  userEmail: string;
  userRole: UserRole;
  actionType: UserActivityActionType | string;
  description: string;
  targetId?: string;
  targetTitle?: string;
  timestamp: string;
}

export type NotificationType = "success" | "info" | "warning" | "error";

export interface UserNotification {
  id: string;
  userId: string; // user ID or "ALL" or "ADMINS"
  titre: string;
  message: string;
  type: NotificationType;
  lue: boolean;
  date: string;
  linkTab?: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}
