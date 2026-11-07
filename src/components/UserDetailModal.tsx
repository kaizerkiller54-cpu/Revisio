import React, { useState, useEffect, useMemo } from "react";
import {
  User,
  DocumentModel,
  ContributionModel,
  UserActivity,
} from "../types";
import { getUserDetailsApi, AdminUserDetails } from "../lib/api";
import {
  X,
  Clock,
  Bookmark,
  FileCheck,
  FileText,
  Calendar,
  Mail,
  Phone,
  Shield,
  ShieldAlert,
  User as UserIcon,
  LogIn,
  Eye,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  Download,
} from "lucide-react";

interface UserDetailModalProps {
  user: User | null;
  onClose: () => void;
  allDocuments?: DocumentModel[];
  allContributions?: ContributionModel[];
  onPreviewDoc?: (doc: DocumentModel) => void;
  onNavigateToModeration?: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  user,
  onClose,
  allDocuments = [],
  allContributions = [],
  onPreviewDoc,
  onNavigateToModeration,
}) => {
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<
    "all" | "logins" | "favorites" | "contributions"
  >("all");

  useEffect(() => {
    if (!user) {
      setDetails(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setActiveSection("all");

    getUserDetailsApi(user.id)
      .then((res) => {
        if (!cancelled) {
          setDetails(res);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDetails(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Cross-reference contributions from both backend details and parent state
  const mergedContributions = useMemo(() => {
    if (!user) return [];
    const map = new Map<string, ContributionModel>();
    (details?.allContributions || []).forEach((c) => map.set(c.id, c));
    allContributions
      .filter(
        (c) =>
          c.utilisateurId === user.id ||
          c.utilisateurEmail?.toLowerCase().trim() ===
            user.email?.toLowerCase().trim()
      )
      .forEach((c) => {
        if (!map.has(c.id)) map.set(c.id, c);
      });
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.dateEnvoi).getTime() - new Date(a.dateEnvoi).getTime()
    );
  }, [user, details?.allContributions, allContributions]);

  const pendingContributions = useMemo(
    () => mergedContributions.filter((c) => c.statut === "En attente"),
    [mergedContributions]
  );

  // Favorite documents resolved from backend or fallback IDs against allDocuments
  const favoriteDocuments = useMemo(() => {
    if (details?.favoriteDocuments && details.favoriteDocuments.length > 0) {
      return details.favoriteDocuments;
    }
    if (details?.favoriteIds && details.favoriteIds.length > 0 && allDocuments.length > 0) {
      return allDocuments.filter((d) => details.favoriteIds.includes(d.id));
    }
    return [];
  }, [details, allDocuments]);

  const lastLogins = useMemo(() => {
    return details?.lastLogins || [];
  }, [details]);

  const recentActivities = useMemo(() => {
    return details?.recentActivities || [];
  }, [details]);

  if (!user) return null;

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "Aucune connexion enregistrée";
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const formatRelativeTime = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return "À l'instant";
      if (mins < 60) return `Il y a ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Il y a ${hours} h`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `Il y a ${days} j`;
      return "";
    } catch {
      return "";
    }
  };

  const latestLoginDate =
    details?.lastSignInAt ||
    (lastLogins.length > 0 ? lastLogins[0].timestamp : null);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-900/65 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE DE LA FICHE UTILISATEUR */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-start justify-between gap-4 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-900 text-white font-extrabold text-base sm:text-lg flex items-center justify-center shrink-0 shadow-sm">
              {(user.prenom?.[0] || "") + (user.nom?.[0] || "U")}
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="user-detail-modal-title"
                  className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 truncate"
                >
                  {user.prenom} {user.nom}
                </h2>

                {user.role === "SuperAdministrateur" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-white inline-flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>SuperAdministrateur</span>
                  </span>
                ) : user.role === "Administrateur" ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 inline-flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Administrateur</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 inline-flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    <span>Étudiant</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </span>

                {user.telephone && (
                  <span className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{user.telephone}</span>
                  </span>
                )}

                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Inscrit le{" "}
                    {new Date(user.dateCreation).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
            aria-label="Fermer la fiche utilisateur"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRE SYNTHÉTIQUE & SÉLECTEUR DE VUE */}
        <div className="px-4 sm:px-6 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          {/* 3 Cartes de Synthèse Cliquables */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveSection("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeSection === "all"
                  ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              Vue d'ensemble
            </button>

            <button
              onClick={() => setActiveSection("logins")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSection === "logins"
                  ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connexions ({lastLogins.length})</span>
            </button>

            <button
              onClick={() => setActiveSection("favorites")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSection === "favorites"
                  ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Épreuves favorites ({favoriteDocuments.length})</span>
            </button>

            <button
              onClick={() => setActiveSection("contributions")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSection === "contributions"
                  ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Contributions en attente ({pendingContributions.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Dernière connexion :{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {formatDateTime(latestLoginDate)}
              </strong>
            </span>
          </div>
        </div>

        {/* CONTENU DÉFILANT DE LA FICHE */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-blue-700 dark:text-blue-400" />
              <p className="text-xs font-semibold">
                Chargement de l'activité, des favoris et des soumissions de {user.prenom} {user.nom}...
              </p>
            </div>
          ) : (
            <>
              {/* BANDEAU 3 INDICATEURS RAPIDES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                    <LogIn className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                      {lastLogins.length}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      Connexion{lastLogins.length > 1 ? "s" : ""} récente{lastLogins.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                    <Bookmark className="w-5 h-5 fill-blue-700 dark:fill-blue-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                      {favoriteDocuments.length}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      Épreuve{favoriteDocuments.length > 1 ? "s" : ""} favorite{favoriteDocuments.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      pendingContributions.length > 0
                        ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                        : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                      {pendingContributions.length}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      Contribution{pendingContributions.length > 1 ? "s" : ""} en attente (sur {mergedContributions.length})
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1 : DERNIÈRES CONNEXIONS */}
              {(activeSection === "all" || activeSection === "logins") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>Dernières Connexions & Sessions</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {lastLogins.length} session{lastLogins.length > 1 ? "s" : ""} tracée{lastLogins.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {lastLogins.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      Aucune connexion récente enregistrée dans le journal d'authentification pour cet utilisateur.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {lastLogins.map((login, idx) => (
                        <div
                          key={login.id || idx}
                          className="p-3 rounded-xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
                              <History className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <span>
                                  {login.actionType === "REGISTER"
                                    ? "Création de compte"
                                    : "Connexion réussie"}
                                </span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-[9px] font-extrabold uppercase">
                                    Dernière
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {login.description}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200">
                              {formatDateTime(login.timestamp)}
                            </div>
                            <div className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold">
                              {formatRelativeTime(login.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2 : ÉPREUVES FAVORITES DE L'UTILISATEUR */}
              {(activeSection === "all" || activeSection === "favorites") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-blue-700 dark:text-blue-400 fill-blue-700 dark:fill-blue-400" />
                      <span>Épreuves Favorites Enregistrées</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {favoriteDocuments.length} sujet{favoriteDocuments.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {favoriteDocuments.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      Cet utilisateur n'a pas encore ajouté d'épreuves à ses favoris de révision.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {favoriteDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {doc.titre}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-semibold text-blue-700 dark:text-blue-400">
                                  {doc.matiere}
                                </span>
                                <span>•</span>
                                <span className="font-bold">{doc.typeEpreuve}</span>
                                <span>•</span>
                                <span>{doc.semestre}</span>
                                <span>•</span>
                                <span>{doc.anneeAcademique}</span>
                              </div>
                            </div>
                          </div>

                          {onPreviewDoc && (
                            <button
                              onClick={() => {
                                onClose();
                                onPreviewDoc(doc);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title="Prévisualiser l'épreuve PDF"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Voir</span>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3 : CONTRIBUTIONS EN ATTENTE (& HISTORIQUE DES SOUMISSIONS) */}
              {(activeSection === "all" || activeSection === "contributions") && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                      <span>Contributions en Attente & Soumissions</span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {pendingContributions.length} en attente • {mergedContributions.length} au total
                      </span>
                      {pendingContributions.length > 0 && onNavigateToModeration && (
                        <button
                          onClick={() => {
                            onClose();
                            onNavigateToModeration();
                          }}
                          className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Aller modérer</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {mergedContributions.length === 0 ? (
                    <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
                      Aucune épreuve soumise par cet utilisateur pour le moment.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {mergedContributions.map((contrib) => {
                        const isPending = contrib.statut === "En attente";
                        const isApproved = contrib.statut === "Publié";
                        return (
                          <div
                            key={contrib.id}
                            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isPending
                                ? "bg-amber-50/70 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30"
                                : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700"
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                    isPending
                                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30"
                                      : isApproved
                                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                                      : "bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                                  }`}
                                >
                                  {isPending ? (
                                    <Clock className="w-3 h-3" />
                                  ) : isApproved ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  <span>{contrib.statut}</span>
                                </span>

                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {contrib.titre || contrib.fichierNom}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                {contrib.matiere && (
                                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                                    {contrib.matiere}
                                  </span>
                                )}
                                {contrib.typeEpreuve && <span>• {contrib.typeEpreuve}</span>}
                                {contrib.semestre && <span>• {contrib.semestre}</span>}
                                {contrib.anneeAcademique && <span>• {contrib.anneeAcademique}</span>}
                                <span>• Soumis le {formatDateTime(contrib.dateEnvoi)}</span>
                              </div>

                              {contrib.commentaire && (
                                <p className="text-[11px] italic text-slate-600 dark:text-slate-300 pt-0.5">
                                  « {contrib.commentaire} »
                                </p>
                              )}
                            </div>

                            {isPending && onNavigateToModeration && (
                              <button
                                onClick={() => {
                                  onClose();
                                  onNavigateToModeration();
                                }}
                                className="px-3 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Modérer</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* PIED DE MODALE */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 truncate">
            ID Utilisateur : {user.id}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
