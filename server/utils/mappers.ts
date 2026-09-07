import type { Contribution, Document, Matiere, User, UserActivity, UserNotification, AuditLog } from "@prisma/client";

export const semestreToDb = (s: string): "Semestre_1" | "Semestre_2" =>
  s === "Semestre 2" ? "Semestre_2" : "Semestre_1";

export const semestreFromDb = (s: "Semestre_1" | "Semestre_2"): "Semestre 1" | "Semestre 2" =>
  s === "Semestre_2" ? "Semestre 2" : "Semestre 1";

export const statutToDb = (s: string): "En_attente" | "Publie" | "Refuse" =>
  s === "Publié" ? "Publie" : s === "Refusé" ? "Refuse" : "En_attente";

export const statutFromDb = (s: "En_attente" | "Publie" | "Refuse"): "En attente" | "Publié" | "Refusé" =>
  s === "Publie" ? "Publié" : s === "Refuse" ? "Refusé" : "En attente";

export const mapUser = (u: User) => ({
  id: u.id,
  nom: u.nom,
  prenom: u.prenom,
  email: u.email,
  telephone: u.telephone ?? null,
  role: u.role,
  dateCreation: u.createdAt.toISOString(),
});

export const mapDocument = (d: Document & { matiere?: Matiere }) => ({
  id: d.id,
  titre: d.titre,
  matiere: d.matiere?.nom ?? d.matiereId,
  matiereId: d.matiereId,
  semestre: semestreFromDb(d.semestre),
  typeEpreuve: d.typeEpreuve,
  anneeAcademique: d.anneeAcademique,
  fichierUrl: d.fichierUrl,
  fichierNom: d.fichierNom,
  statut: statutFromDb(d.statut),
  datePublication: d.datePublication ? d.datePublication.toISOString() : undefined,
  dateAjout: d.createdAt.toISOString(),
  telechargementsCount: d.telechargementsCount,
  contributionId: d.contributionId ?? undefined,
});

export const mapContribution = (c: Contribution) => ({
  id: c.id,
  utilisateurId: c.utilisateurId,
  utilisateurNom: c.utilisateurNom,
  utilisateurEmail: c.utilisateurEmail,
  anneeAcademique: c.anneeAcademique,
  matiere: c.matiere,
  semestre: semestreFromDb(c.semestre),
  typeEpreuve: c.typeEpreuve,
  titre: c.titre ?? undefined,
  commentaire: c.commentaire ?? undefined,
  fichierUrl: c.fichierUrl,
  fichierNom: c.fichierNom,
  statut: statutFromDb(c.statut),
  dateEnvoi: c.dateEnvoi.toISOString(),
});

export const mapMatiere = (m: Matiere, countDocs: number) => ({
  id: m.id,
  nom: m.nom,
  code: m.code,
  semestre: semestreFromDb(m.semestre),
  description: m.description ?? "",
  countDocs,
});

export const mapActivity = (a: UserActivity) => ({
  id: a.id,
  userId: a.userId,
  userNom: a.userNom,
  userEmail: a.userEmail,
  userRole: a.userRole,
  actionType: a.actionType,
  description: a.description,
  targetId: a.targetId ?? undefined,
  targetTitle: a.targetTitle ?? undefined,
  timestamp: a.timestamp.toISOString(),
});

export const mapNotification = (n: UserNotification) => ({
  id: n.id,
  userId: n.userId,
  titre: n.titre,
  message: n.message,
  type: n.type,
  lue: n.lue,
  date: n.createdAt.toISOString(),
  linkTab: n.linkTab ?? undefined,
});

export const mapAuditLog = (a: AuditLog) => ({
  id: a.id,
  adminId: a.adminId,
  adminNom: a.adminNom,
  adminEmail: a.adminEmail,
  action: a.action,
  details: a.details,
  targetId: a.targetId ?? undefined,
  targetName: a.targetName ?? undefined,
  date: a.date.toISOString(),
});
