import React, { useState, useEffect } from "react";
import { UserActivity, User } from "../types";
import { getUserActivitiesApi } from "../lib/api";
import {
  History,
  Search,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LogIn,
  LogOut,
  RefreshCw,
  FileText,
  Filter,
    User as UserIcon,
    FileSpreadsheet,
  Clock,
  Layers,
  ShieldAlert,
} from "lucide-react";

interface UserActivityLogViewProps {
  currentUser: User | null;
}

export const UserActivityLogView: React.FC<UserActivityLogViewProps> = ({
  currentUser,
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ download: 0, submit: 0, moderation: 0 });

  const isSuperAdmin = currentUser?.role === "SuperAdministrateur";

  const CATEGORY_ACTION_TYPES: Record<string, string[] | undefined> = {
    download: ["DOWNLOAD_DOCUMENT"],
    submit: ["SUBMIT_CONTRIBUTION"],
    moderation: ["APPROVE_CONTRIBUTION", "REJECT_CONTRIBUTION", "CREATE_DOCUMENT", "DELETE_DOCUMENT"],
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      const types = CATEGORY_ACTION_TYPES[actionCategory];
      if (types) params.set("actionTypes", types.join(","));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("page", page.toString());
      params.set("pageSize", "50");

      const res = await getUserActivitiesApi(params.toString());
      setActivities(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setCounts(res.counts ?? { download: 0, submit: 0, moderation: 0 });
    } catch (err) {
      console.error("Erreur lors du chargement des activités:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, actionCategory, searchQuery]);

  // Filter logic (client-side only for display purposes since API filters)
  // No need for user filter since API handles it

  const moderationCount = counts.moderation;

  const handleExportCSV = () => {
    const headers = ["ID", "Type d'Action", "Description", "Titre Cible", "Horodatage"];
    const rows = activities.map((a) => [
      a.id,
      `"${a.actionType}"`,
      `"${a.description.replace(/"/g, '""')}"`,
      `"${(a.targetTitle || "").replace(/"/g, '""')}"`,
      `"${a.timestamp}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mon_journal_activites_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderActionBadge = (actionType: string) => {
    switch (actionType) {
      case "DOWNLOAD_DOCUMENT":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center space-x-1">
            <Download className="w-3 h-3 text-emerald-600" />
            <span>Téléchargement</span>
          </span>
        );
      case "SUBMIT_CONTRIBUTION":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-200 inline-flex items-center space-x-1">
            <Upload className="w-3 h-3 text-blue-600" />
            <span>Soumission Épreuve</span>
          </span>
        );
      case "APPROVE_CONTRIBUTION":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-900 border border-teal-200 inline-flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-teal-700" />
            <span>Approbation Admin</span>
          </span>
        );
      case "REJECT_CONTRIBUTION":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-200 inline-flex items-center space-x-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Refus Admin</span>
          </span>
        );
      case "CHANGE_USER_ROLE":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            <span>Élévation de Rôle</span>
          </span>
        );
      case "LOGIN":
      case "REGISTER":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-900 border border-sky-200 inline-flex items-center space-x-1">
            <LogIn className="w-3 h-3 text-sky-600" />
            <span>Connexion</span>
          </span>
        );
      case "LOGOUT":
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 border border-orange-200 inline-flex items-center space-x-1">
            <LogOut className="w-3 h-3 text-orange-600" />
            <span>Déconnexion</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center space-x-1">
            <FileText className="w-3 h-3 text-slate-600" />
            <span>{actionType}</span>
          </span>
        );
    }
  };

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Title & Intro */}
      <div
        className={`${isSuperAdmin ? "bg-slate-900" : "bg-blue-900"} rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden`}
      >
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center space-x-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            <span>Journal d'Activité Personnel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isSuperAdmin ? "Historique Global des Actions (SuperAdmin)" : "Mon Historique d'Actions"}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {isSuperAdmin
              ? "Vue omnipotente : toutes les interactions de la plateforme (étudiants, enseignants, administrateurs)."
              : "Ce journal recense uniquement VOS actions personnelles : téléchargements, dépôts d'épreuves, connexions, etc."}
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-extrabold transition-all shadow-lg flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-100" />
            <span>Exporter CSV</span>
          </button>
        </div>

        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Summary Stats Grid - Only show relevant counts for current user */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActionCategory("all")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            actionCategory === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]"
              : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold opacity-80">Total</span>
            <Layers className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{total}</p>
          <p className="text-[10px] opacity-70 mt-1">Actions enregistrées</p>
        </div>

        <div
          onClick={() => setActionCategory("download")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            actionCategory === "download"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-lg scale-[1.02]"
              : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-emerald-800 font-extrabold">Téléchargements</span>
            <Download className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-950">{counts.download}</p>
          <p className="text-[10px] text-slate-500 mt-1">Vos consultations PDF</p>
        </div>

        <div
          onClick={() => setActionCategory("submit")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            actionCategory === "submit"
              ? "bg-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]"
              : "bg-white border-slate-200 text-slate-800 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-blue-800 font-extrabold">Soumissions</span>
            <Upload className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-950">{counts.submit}</p>
          <p className="text-[10px] text-slate-500 mt-1">Vos dépôts d'épreuves</p>
        </div>

        {isSuperAdmin && (
          <div
            onClick={() => setActionCategory("moderation")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
              actionCategory === "moderation"
                ? "bg-amber-600 text-white border-amber-600 shadow-lg scale-[1.02]"
                : "bg-white border-slate-200 text-slate-800 hover:border-amber-300"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-800 font-extrabold">Modérations</span>
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-950">{moderationCount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Validations admin</p>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Filters and Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
          {/* Search Field */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Rechercher action, épreuve..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setPage(1); }}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs & User Filter (SuperAdmin only) */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {isSuperAdmin && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs">
                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-600 font-medium">Vue : Globale (SuperAdmin)</span>
              </div>
            )}

            {/* Category Buttons */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl text-xs">
              <button
                onClick={() => { setActionCategory("all"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Toutes ({total})
              </button>
              <button
                onClick={() => { setActionCategory("download"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "download" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Téléchargements
              </button>
              <button
                onClick={() => { setActionCategory("submit"); setPage(1); }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "submit" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Soumissions
              </button>
              {isSuperAdmin && (
                <button
                  onClick={() => { setActionCategory("moderation"); setPage(1); }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    actionCategory === "moderation" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Modération
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Log Feed */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Chargement de votre journal d'activité...</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <History className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Aucune activité</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || actionCategory !== "all"
                ? "Aucun événement ne correspond à vos filtres."
                : "Vous n'avez encore effectué aucune action sur la plateforme."}
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((act) => {
              const isSelf = currentUser?.id === act.userId;

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                    <Clock className="w-3 h-3 text-blue-600" />
                  </div>

                  {/* Activity Card */}
                  <div className="bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-200 rounded-2xl p-4 transition-all space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {act.userNom ? act.userNom.charAt(0) : "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
                            <span className="truncate max-w-[200px]">{act.userNom}</span>
                            {isSelf && !isSuperAdmin && (
                              <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-black">
                                Vous
                              </span>
                            )}
                            {isSuperAdmin && (
                              <span className="text-[10px] text-slate-400 font-normal inline-block max-w-[240px] truncate align-bottom">
                                ({act.userEmail})
                              </span>
                            )}
                          </p>
                          <span className="text-[10px] font-bold text-blue-700">
                            {act.userRole}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {renderActionBadge(act.actionType)}
                        <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {formatTimestamp(act.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Description Text */}
                    <p className="text-xs text-slate-800 font-medium leading-relaxed pl-1">
                      {act.description}
                    </p>

                    {/* Target detail callout if present */}
                    {act.targetTitle && (
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold text-slate-800 min-w-0 truncate">{act.targetTitle}</span>
                        </div>
                        {act.targetId && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            ID: {act.targetId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold text-slate-700"
            >
              Précédent
            </button>
            <span className="px-3 py-2 text-xs font-bold text-slate-600">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-xl text-xs font-bold text-slate-700"
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};