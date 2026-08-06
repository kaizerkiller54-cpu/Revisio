import React, { useState, useEffect } from "react";
import { UserActivity, User } from "../types";
import { getUserActivitiesApi, getUsersApi } from "../lib/api";
import {
  History,
  Search,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  LogIn,
  RefreshCw,
  FileText,
  Filter,
  User as UserIcon,
  Sparkles,
  FileSpreadsheet,
  Clock,
  Layers,
} from "lucide-react";

interface UserActivityLogViewProps {
  currentUser: User | null;
}

export const UserActivityLogView: React.FC<UserActivityLogViewProps> = ({
  currentUser,
}) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionCategory, setActionCategory] = useState<string>("all");
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [actData, usersData] = await Promise.all([
        getUserActivitiesApi(),
        getUsersApi().catch(() => []),
      ]);
      setActivities(actData);
      setUsersList(usersData);
    } catch (err) {
      console.error("Erreur lors du chargement des activités:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter logic
  const filteredActivities = activities.filter((act) => {
    // User filter
    if (selectedUserFilter !== "all" && act.userId !== selectedUserFilter) {
      return false;
    }

    // Action Category filter
    if (actionCategory !== "all") {
      if (actionCategory === "download" && act.actionType !== "DOWNLOAD_DOCUMENT") return false;
      if (actionCategory === "submit" && act.actionType !== "SUBMIT_CONTRIBUTION") return false;
      if (
        actionCategory === "moderation" &&
        act.actionType !== "APPROVE_CONTRIBUTION" &&
        act.actionType !== "REJECT_CONTRIBUTION" &&
        act.actionType !== "CREATE_DOCUMENT" &&
        act.actionType !== "DELETE_DOCUMENT"
      )
        return false;
      if (
        actionCategory === "auth" &&
        act.actionType !== "LOGIN" &&
        act.actionType !== "LOGOUT" &&
        act.actionType !== "REGISTER"
      )
        return false;
      if (
        actionCategory === "role" &&
        act.actionType !== "CHANGE_USER_ROLE" &&
        act.actionType !== "CREATE_USER" &&
        act.actionType !== "DELETE_USER"
      )
        return false;
    }

    // Text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchText =
        act.description.toLowerCase().includes(q) ||
        act.userNom.toLowerCase().includes(q) ||
        act.userEmail.toLowerCase().includes(q) ||
        act.actionType.toLowerCase().includes(q) ||
        (act.targetTitle && act.targetTitle.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    return true;
  });

  // Category counts
  const downloadsCount = activities.filter((a) => a.actionType === "DOWNLOAD_DOCUMENT").length;
  const submissionsCount = activities.filter((a) => a.actionType === "SUBMIT_CONTRIBUTION").length;
  const moderationCount = activities.filter(
    (a) =>
      a.actionType === "APPROVE_CONTRIBUTION" ||
      a.actionType === "REJECT_CONTRIBUTION" ||
      a.actionType === "CREATE_DOCUMENT" ||
      a.actionType === "DELETE_DOCUMENT"
  ).length;
  const roleCount = activities.filter(
    (a) => a.actionType === "CHANGE_USER_ROLE" || a.actionType === "CREATE_USER" || a.actionType === "DELETE_USER"
  ).length;

  const handleExportCSV = () => {
    const headers = ["ID", "Utilisateur", "Email", "Rôle", "Type d'Action", "Description", "Titre Cible", "Horodatage"];
    const rows = filteredActivities.map((a) => [
      a.id,
      `"${a.userNom}"`,
      `"${a.userEmail}"`,
      `"${a.userRole}"`,
      `"${a.actionType}"`,
      `"${a.description.replace(/"/g, '""')}"`,
      `"${(a.targetTitle || "").replace(/"/g, '""')}"`,
      `"${a.timestamp}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `journal_activites_isj_${new Date().toISOString().slice(0, 10)}.csv`);
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200 inline-flex items-center space-x-1">
            <Upload className="w-3 h-3 text-indigo-600" />
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
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 inline-flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-purple-700" />
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
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <History className="w-3.5 h-3.5" />
            <span>Journal d'Activité & Traçabilité</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Historique Global des Actions Utilisateurs
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Ce journal recense l'ensemble des interactions orchestrées par les étudiants, enseignants et administrateurs de l'ISJ (recherches, téléchargements, dépôts d'épreuves, validations et modifications de rôles).
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 relative z-10">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center space-x-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-extrabold transition-all shadow-lg flex items-center space-x-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-100" />
            <span>Exporter CSV</span>
          </button>
        </div>

        {/* Decorative ambient background blur */}
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Summary Stats Grid */}
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
            <span className="text-xs font-bold opacity-80">Total Activités</span>
            <Layers className="w-4 h-4 opacity-70" />
          </div>
          <p className="text-2xl sm:text-3xl font-black">{activities.length}</p>
          <p className="text-[10px] opacity-70 mt-1">Actions enregistrées dans le système</p>
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
          <p className="text-2xl sm:text-3xl font-black text-emerald-950">{downloadsCount}</p>
          <p className="text-[10px] text-slate-500 mt-1">Consultations et exports PDF d'épreuves</p>
        </div>

        <div
          onClick={() => setActionCategory("submit")}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            actionCategory === "submit"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]"
              : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-indigo-800 font-extrabold">Soumissions</span>
            <Upload className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-indigo-950">{submissionsCount}</p>
          <p className="text-[10px] text-slate-500 mt-1">Sujets d'examens transmis par les étudiants</p>
        </div>

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
          <p className="text-[10px] text-slate-500 mt-1">Validations et publications par les admins</p>
        </div>
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
              placeholder="Rechercher action, utilisateur, épreuve..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* User Select & Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* User Dropdown */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedUserFilter}
                onChange={(e) => setSelectedUserFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none text-xs"
              >
                <option value="all">Tous les utilisateurs ({usersList.length || "Tous"})</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.prenom} {u.nom} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Buttons */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl text-xs">
              <button
                onClick={() => setActionCategory("all")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Toutes ({activities.length})
              </button>
              <button
                onClick={() => setActionCategory("download")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "download" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Téléchargements
              </button>
              <button
                onClick={() => setActionCategory("submit")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "submit" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Soumissions
              </button>
              <button
                onClick={() => setActionCategory("moderation")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  actionCategory === "moderation" ? "bg-amber-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Modération
              </button>
            </div>
          </div>
        </div>

        {/* Timeline Log Feed */}
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Chargement du journal d'activité...</p>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">Aucune activité enregistrée</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Aucun événement ne correspond à vos filtres actuels ou à votre recherche.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredActivities.map((act) => {
              const isSelf = currentUser?.id === act.userId;

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                    <Clock className="w-3 h-3 text-indigo-600" />
                  </div>

                  {/* Activity Card */}
                  <div className="bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded-2xl p-4 transition-all space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                          {act.userNom ? act.userNom.charAt(0) : "U"}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{act.userNom}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-purple-100 text-purple-900 px-1.5 py-0.2 rounded font-black">
                                Vous
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({act.userEmail})
                            </span>
                          </p>
                          <span className="text-[10px] font-bold text-indigo-700">
                            {act.userRole}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
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
                      <div className="bg-white border border-slate-200 p-2.5 rounded-xl text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-800">{act.targetTitle}</span>
                        </div>
                        {act.targetId && (
                          <span className="text-[10px] font-mono text-slate-400">
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
      </div>
    </div>
  );
};
