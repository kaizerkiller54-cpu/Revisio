import React, { useState, useEffect } from "react";
import { User, AuditLog, UserRole, AuditActionType } from "../types";
import { getAuditLogsApi, getUsersApi, updateUserRoleApi, createAdminUserApi, deleteUserApi } from "../lib/api";
import {
  ShieldAlert,
  ShieldCheck,
  History,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  UserPlus,
  ArrowRightLeft,
  Calendar,
  Download,
  Shield,
  Clock,
  User as UserIcon,
  AlertCircle
} from "lucide-react";

interface SuperAdminAuditViewProps {
  currentUser: User | null;
  onRefreshData?: () => void;
}

export const SuperAdminAuditView: React.FC<SuperAdminAuditViewProps> = ({
  currentUser,
  onRefreshData,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "users">("logs");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters state
  const [selectedAdminFilter, setSelectedAdminFilter] = useState<string>("all");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Role modification modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>("Administrateur");
  const [isUpdatingRole, setIsUpdatingRole] = useState<boolean>(false);

  // Add Admin modal state
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState<boolean>(false);
  const [newNom, setNewNom] = useState<string>("");
  const [newPrenom, setNewPrenom] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newRole, setNewRole] = useState<UserRole>("Administrateur");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState<boolean>(false);

  // Delete User modal state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState<boolean>(false);

  // User management tab specific filters & privilege elevation modal state
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [elevatingUser, setElevatingUser] = useState<User | null>(null);
  const [isElevating, setIsElevating] = useState<boolean>(false);

  const fetchAuditData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [logs, usersList] = await Promise.all([
        getAuditLogsApi({
          adminId: selectedAdminFilter !== "all" ? selectedAdminFilter : undefined,
          action: selectedActionFilter !== "all" ? selectedActionFilter : undefined,
          search: searchQuery.trim() || undefined,
        }),
        getUsersApi(),
      ]);
      setAuditLogs(logs);
      setUsers(usersList);
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors du chargement des données d'audit.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, [selectedAdminFilter, selectedActionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditData();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNom.trim() || !newPrenom.trim() || !newEmail.trim()) {
      setErrorMsg("Veuillez remplir le nom, le prénom et l'adresse e-mail.");
      return;
    }

    setIsCreatingAdmin(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createAdminUserApi({
        nom: newNom,
        prenom: newPrenom,
        email: newEmail,
        role: newRole,
      });
      setSuccessMsg(`L'administrateur/compte ${res.user.prenom} ${res.user.nom} (${res.user.email}) a été créé avec succès.`);
      setIsAddAdminModalOpen(false);
      setNewNom("");
      setNewPrenom("");
      setNewEmail("");
      setNewRole("Administrateur");
      fetchAuditData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de créer l'administrateur.");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeletingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await deleteUserApi(deletingUser.id);
      setSuccessMsg(`Le compte ${deletingUser.prenom} ${deletingUser.nom} (${deletingUser.email}) a été supprimé avec succès.`);
      setDeletingUser(null);
      fetchAuditData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Impossible de supprimer le compte.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleConfirmElevateToAdmin = async () => {
    if (!elevatingUser) return;
    setIsElevating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await updateUserRoleApi(elevatingUser.id, "Administrateur");
      setSuccessMsg(`🎉 Élévation de privilèges réussie ! ${elevatingUser.prenom} ${elevatingUser.nom} est désormais Administrateur ISJ.`);
      setElevatingUser(null);
      fetchAuditData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Échec lors de l'élévation des privilèges.");
    } finally {
      setIsElevating(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!editingUser) return;
    setIsUpdatingRole(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateUserRoleApi(editingUser.id, targetRole);
      setSuccessMsg(`Le rôle de ${editingUser.prenom} ${editingUser.nom} a été mis à jour avec succès vers '${targetRole}'.`);
      setEditingUser(null);
      fetchAuditData();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setErrorMsg(err.message || "Échec de la mise à jour du rôle.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit_logs_isj_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getActionBadge = (action: AuditActionType) => {
    switch (action) {
      case "APPROVE_CONTRIBUTION":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Approbation</span>
          </span>
        );
      case "REJECT_CONTRIBUTION":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <XCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Refus</span>
          </span>
        );
      case "DELETE_DOCUMENT":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Suppression</span>
          </span>
        );
      case "UPDATE_DOCUMENT":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Modification</span>
          </span>
        );
      case "CHANGE_USER_ROLE":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
            <span>Gestion Rôle</span>
          </span>
        );
      case "CREATE_USER":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Création Admin</span>
          </span>
        );
      case "DELETE_USER":
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Suppression Admin</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{action}</span>
          </span>
        );
    }
  };

  const adminsList = users.filter((u) => u.role === "Administrateur" || u.role === "SuperAdministrateur");

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-purple-500/20 text-purple-200 border border-purple-400/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-purple-300" />
              <span>Module Super Administrateur</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Journal d'Audit & Traçabilité des Admins
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
              Consultez en temps réel l'historique complet des actions effectuées par l'ensemble des administrateurs (plusieurs administrateurs enregistrés). Contrôlez les accès et gérez les privilèges.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportLogs}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-xs font-bold text-white transition-all flex items-center space-x-2 backdrop-blur-sm shadow-sm"
            >
              <Download className="w-4 h-4 text-purple-300" />
              <span>Exporter Journal (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Stats bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Administrateurs Actifs
            </p>
            <p className="text-2xl font-black text-slate-900">{adminsList.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Actions Tracées dans l'Audit
            </p>
            <p className="text-2xl font-black text-slate-900">{auditLogs.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Approbations Enregistrées
            </p>
            <p className="text-2xl font-black text-slate-900">
              {auditLogs.filter((l) => l.action === "APPROVE_CONTRIBUTION").length}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Comptes Utilisateurs Totaux
            </p>
            <p className="text-2xl font-black text-slate-900">{users.length}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-4">
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`pb-3 px-1 font-bold text-sm flex items-center space-x-2 border-b-2 transition-all ${
            activeSubTab === "logs"
              ? "border-purple-600 text-purple-900 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historique des Actions des Admins ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("users")}
          className={`pb-3 px-1 font-bold text-sm flex items-center space-x-2 border-b-2 transition-all ${
            activeSubTab === "users"
              ? "border-purple-600 text-purple-900 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Gestion des Administrateurs & Rôles ({users.length})</span>
        </button>
      </div>

      {/* SubTab 1: AUDIT LOGS */}
      {activeSubTab === "logs" && (
        <div className="space-y-6">
          {/* Filters controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              {/* Search input */}
              <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par admin, épreuve..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </form>

              {/* Filter Selects */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
                {/* Admin Select */}
                <div className="flex items-center space-x-1.5">
                  <UserIcon className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-bold text-slate-700">Admin:</span>
                  <select
                    value={selectedAdminFilter}
                    onChange={(e) => setSelectedAdminFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="all">Tous les Administrateurs</option>
                    {adminsList.map((adm) => (
                      <option key={adm.id} value={adm.id}>
                        {adm.prenom} {adm.nom} ({adm.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Type Select */}
                <div className="flex items-center space-x-1.5">
                  <Filter className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-bold text-slate-700">Action:</span>
                  <select
                    value={selectedActionFilter}
                    onChange={(e) => setSelectedActionFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="all">Toutes les actions</option>
                    <option value="APPROVE_CONTRIBUTION">Approbation & Publication</option>
                    <option value="REJECT_CONTRIBUTION">Refus de contribution</option>
                    <option value="DELETE_DOCUMENT">Suppression d'épreuve</option>
                    <option value="UPDATE_DOCUMENT">Modification de fiche</option>
                    <option value="CHANGE_USER_ROLE">Gestion de Rôle</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs Table / Feed */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Chargement du journal d'audit...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl space-y-2">
              <History className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-slate-700 font-bold text-sm">Aucune action enregistrée pour ces critères.</p>
              <p className="text-slate-400 text-xs">Essayez de réinitialiser vos filtres de recherche.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 text-[10px]">
                      <th className="py-3 px-4">Administrateur</th>
                      <th className="py-3 px-4">Type d'Action</th>
                      <th className="py-3 px-4">Détail de l'opération</th>
                      <th className="py-3 px-4">Élément Ciblé</th>
                      <th className="py-3 px-4 text-right">Date & Heure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => {
                      const logDate = new Date(log.date);
                      const formattedDate = logDate.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={log.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center shrink-0 text-[11px] border border-purple-200">
                                {log.adminNom.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 leading-tight">{log.adminNom}</p>
                                <p className="text-[10px] text-slate-400">{log.adminEmail}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 shrink-0 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-800 leading-relaxed max-w-md">
                            {log.details}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {log.targetName ? (
                              <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold text-[10px] inline-block max-w-[180px] truncate">
                                {log.targetName}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formattedDate}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: USERS & ADMIN MANAGEMENT */}
      {activeSubTab === "users" && (() => {
        const studentsCount = users.filter((u) => u.role === "Etudiant").length;
        const adminsCount = users.filter((u) => u.role === "Administrateur").length;
        const superAdminsCount = users.filter((u) => u.role === "SuperAdministrateur").length;

        const filteredUsersList = users.filter((u) => {
          const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
          const query = userSearchQuery.toLowerCase().trim();
          const matchesSearch =
            !query ||
            u.nom.toLowerCase().includes(query) ||
            u.prenom.toLowerCase().includes(query) ||
            u.email.toLowerCase().includes(query) ||
            u.id.toLowerCase().includes(query);
          return matchesRole && matchesSearch;
        });

        return (
          <div className="space-y-6">
            {/* Quick Stats bar for Users */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setUserRoleFilter("all")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  userRoleFilter === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-md"
                    : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold opacity-80">Tous les comptes</span>
                  <Users className="w-4 h-4 opacity-70" />
                </div>
                <p className="text-2xl font-black">{users.length}</p>
                <p className="text-[10px] opacity-70 mt-1">Inscrits dans le système</p>
              </div>

              <div
                onClick={() => setUserRoleFilter("Etudiant")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  userRoleFilter === "Etudiant"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                    : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-700 font-extrabold flex items-center space-x-1">
                    <span>Étudiants</span>
                  </span>
                  <UserIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-black text-indigo-950">{studentsCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Éligibles pour élévation de privilège</p>
              </div>

              <div
                onClick={() => setUserRoleFilter("Administrateur")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  userRoleFilter === "Administrateur"
                    ? "bg-amber-600 text-white border-amber-600 shadow-md"
                    : "bg-white border-slate-200 text-slate-800 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-800 font-extrabold">Administrateurs</span>
                  <Shield className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-2xl font-black text-amber-950">{adminsCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Modération & Gestion des sujets</p>
              </div>

              <div
                onClick={() => setUserRoleFilter("SuperAdministrateur")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  userRoleFilter === "SuperAdministrateur"
                    ? "bg-purple-900 text-white border-purple-900 shadow-md"
                    : "bg-white border-slate-200 text-slate-800 hover:border-purple-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-900 font-extrabold">SuperAdmin</span>
                  <ShieldAlert className="w-4 h-4 text-purple-700" />
                </div>
                <p className="text-2xl font-black text-purple-950">{superAdminsCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Supervision & Journal d'Audit</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                    <span>Gestion des Utilisateurs & Élévation de Privilèges</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Consultez la liste des étudiants et promouvez-les administrateurs en 1 clic.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewNom("");
                    setNewPrenom("");
                    setNewEmail("");
                    setNewRole("Administrateur");
                    setIsAddAdminModalOpen(true);
                  }}
                  className="px-4 py-2.5 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2 shrink-0"
                >
                  <UserPlus className="w-4 h-4 text-purple-200" />
                  <span>Ajouter un Administrateur</span>
                </button>
              </div>

              {/* User search & filter controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Rechercher étudiant, admin, e-mail..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Role Tabs */}
                <div className="flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                  <button
                    onClick={() => setUserRoleFilter("all")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      userRoleFilter === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Tous ({users.length})
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("Etudiant")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 ${
                      userRoleFilter === "Etudiant"
                        ? "bg-indigo-600 text-white"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/60"
                    }`}
                  >
                    <span>Étudiants ({studentsCount})</span>
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("Administrateur")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 ${
                      userRoleFilter === "Administrateur"
                        ? "bg-amber-600 text-white"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
                    }`}
                  >
                    <span>Admins ({adminsCount})</span>
                  </button>
                  <button
                    onClick={() => setUserRoleFilter("SuperAdministrateur")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1 ${
                      userRoleFilter === "SuperAdministrateur"
                        ? "bg-purple-900 text-white"
                        : "bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200/60"
                    }`}
                  >
                    <span>SuperAdmins ({superAdminsCount})</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4">Utilisateur</th>
                      <th className="py-3 px-4">Adresse E-mail</th>
                      <th className="py-3 px-4">Rôle Actuel</th>
                      <th className="py-3 px-4">Date de Création</th>
                      <th className="py-3 px-4 text-right">Actions / Élévation de Privilèges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                          Aucun utilisateur ne correspond à votre recherche ou filtre.
                        </td>
                      </tr>
                    ) : (
                      filteredUsersList.map((u) => {
                        const dateFormatted = new Date(u.dateCreation).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        });

                        const isSelf = currentUser?.id === u.id;
                        const isStudent = u.role === "Etudiant";

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center space-x-2.5">
                                <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs ${
                                  isStudent
                                    ? "bg-indigo-100 text-indigo-800"
                                    : u.role === "Administrateur"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-purple-100 text-purple-900"
                                }`}>
                                  {u.prenom.charAt(0)}{u.nom.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 flex items-center space-x-1">
                                    <span>{u.prenom} {u.nom}</span>
                                    {isSelf && (
                                      <span className="text-[9px] bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-extrabold ml-1">
                                        Vous
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-[10px] font-mono text-slate-400">ID: {u.id}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-700">{u.email}</td>

                            <td className="py-3.5 px-4">
                              {u.role === "SuperAdministrateur" ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200 flex items-center space-x-1 w-fit">
                                  <ShieldAlert className="w-3 h-3 text-purple-700" />
                                  <span>SuperAdministrateur</span>
                                </span>
                              ) : u.role === "Administrateur" ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center space-x-1 w-fit">
                                  <Shield className="w-3 h-3 text-amber-700" />
                                  <span>Administrateur</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 inline-flex items-center space-x-1">
                                  <UserIcon className="w-3 h-3 text-indigo-600" />
                                  <span>Étudiant</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{dateFormatted}</td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {/* Quick Privilege Elevation Button for Students */}
                                {isStudent && (
                                  <button
                                    onClick={() => setElevatingUser(u)}
                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black transition-all shadow-sm flex items-center space-x-1.5"
                                    title="Promouvoir cet étudiant en Administrateur"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                    <span>Élévation Admin</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setTargetRole(u.role);
                                  }}
                                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1"
                                >
                                  <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Rôle</span>
                                </button>

                                <button
                                  onClick={() => setDeletingUser(u)}
                                  disabled={isSelf}
                                  title={isSelf ? "Vous ne pouvez pas supprimer votre propre compte connecté" : "Supprimer cet utilisateur/administrateur"}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center space-x-1 ${
                                    isSelf
                                      ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                                      : "bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700"
                                  }`}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Supprimer</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal 1: Add Administrator */}
      {isAddAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200 shrink-0 font-bold">
                <UserPlus className="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Ajouter un Administrateur</h3>
                <p className="text-xs text-slate-500">
                  Création directe d'un nouveau compte administratif ISJ.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Prénom :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Dr. Kamga"
                  value={newPrenom}
                  onChange={(e) => setNewPrenom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Nom de famille :</label>
                <input
                  type="text"
                  required
                  placeholder="ex: NKONGO"
                  value={newNom}
                  onChange={(e) => setNewNom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-medium uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Adresse E-mail Institutionnelle :</label>
                <input
                  type="email"
                  required
                  placeholder="ex: kamga@isj.cm"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Attribution du Rôle :</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 font-bold bg-white"
                >
                  <option value="Administrateur">Administrateur (Modération, validation épreuves)</option>
                  <option value="SuperAdministrateur">SuperAdministrateur (Audit, gestion globale admins)</option>
                  <option value="Etudiant">Étudiant (Accès standard)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddAdminModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {isCreatingAdmin ? "Création..." : "Créer le compte Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Delete User Confirmation */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center border border-rose-200 shrink-0 font-bold">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Supprimer le Compte</h3>
                <p className="text-xs text-slate-500">
                  Cette action enregistrera une suppression dans le journal d'audit.
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700 bg-rose-50/60 border border-rose-100 p-4 rounded-2xl">
              <p>
                Êtes-vous absolument sûr de vouloir supprimer le compte de :
              </p>
              <div className="font-bold text-slate-900 text-sm">
                {deletingUser.prenom} {deletingUser.nom}
              </div>
              <div className="font-mono text-slate-600 text-xs">
                {deletingUser.email} — Rôle actuel : <strong className="text-purple-900">{deletingUser.role}</strong>
              </div>
              <p className="text-[11px] text-rose-800 font-semibold pt-1">
                ⚠️ L'accès de cet utilisateur sera immédiatement révoqué.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDeleteUser}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
              >
                {isDeletingUser ? "Suppression..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center border border-purple-200 shrink-0 font-bold">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Modifier le Rôle Utilisateur</h3>
                <p className="text-xs text-slate-500">
                  Compte: <strong className="text-slate-800">{editingUser.prenom} {editingUser.nom}</strong> ({editingUser.email})
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block font-bold text-slate-900">Sélectionner le nouveau rôle :</label>

              <div
                onClick={() => setTargetRole("Etudiant")}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetRole === "Etudiant"
                    ? "bg-indigo-50 border-indigo-600 text-indigo-950 font-bold"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold text-slate-900">Étudiant</p>
                  <p className="text-[10px] text-slate-500">Accès standard à la recherche et au téléchargement d'épreuves.</p>
                </div>
                {targetRole === "Etudiant" && <CheckCircle2 className="w-5 h-5 text-indigo-700" />}
              </div>

              <div
                onClick={() => setTargetRole("Administrateur")}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetRole === "Administrateur"
                    ? "bg-amber-50 border-amber-600 text-amber-950 font-bold"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold text-slate-900">Administrateur</p>
                  <p className="text-[10px] text-slate-500">Pouvoir d'approber, modérer et publier les épreuves d'examens.</p>
                </div>
                {targetRole === "Administrateur" && <CheckCircle2 className="w-5 h-5 text-amber-700" />}
              </div>

              <div
                onClick={() => setTargetRole("SuperAdministrateur")}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                  targetRole === "SuperAdministrateur"
                    ? "bg-purple-50 border-purple-600 text-purple-950 font-bold"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <div>
                  <p className="font-bold text-slate-900">SuperAdministrateur</p>
                  <p className="text-[10px] text-slate-500">Consulte le journal d'audit de toutes les actions et gère les rôles.</p>
                </div>
                {targetRole === "SuperAdministrateur" && <CheckCircle2 className="w-5 h-5 text-purple-700" />}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isUpdatingRole}
                onClick={handleConfirmRoleChange}
                className="px-5 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition-all flex items-center space-x-1.5"
              >
                {isUpdatingRole ? "Mise à jour..." : "Confirmer le changement"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Privilege Elevation Modal for Student -> Admin */}
      {elevatingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-fadeIn">
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200 shrink-0 font-bold">
                <ShieldCheck className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Élévation de Privilèges</h3>
                <p className="text-xs text-slate-500">
                  Nomination au poste d'Administrateur ISJ
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-amber-50/70 border border-amber-200 p-4 rounded-2xl">
              <p className="text-slate-700">
                Vous allez élever les privilèges de l'étudiant suivant au statut d'<strong>Administrateur</strong> :
              </p>
              <div className="font-black text-slate-900 text-sm bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                <p className="text-amber-950 font-black">{elevatingUser.prenom} {elevatingUser.nom}</p>
                <p className="text-xs font-mono text-slate-500 font-normal">{elevatingUser.email}</p>
              </div>

              <div className="space-y-1.5 pt-2 text-[11px] text-amber-900">
                <p className="font-bold">Privilèges accordés :</p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                  <li>Accès au Tableau de Bord d'Administration.</li>
                  <li>Modération, validation et publication des sujets soumis par d'autres étudiants.</li>
                  <li>Gestion de la base d'épreuves et ajout de matières de cours.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setElevatingUser(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isElevating}
                onClick={handleConfirmElevateToAdmin}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md transition-all flex items-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-white" />
                <span>{isElevating ? "Élévation..." : "Promouvoir en Administrateur"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
