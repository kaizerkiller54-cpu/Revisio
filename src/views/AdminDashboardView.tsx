import React, { useState, useEffect, useMemo } from "react";
import {
  DashboardStats,
  DocumentModel,
  MatiereModel,
  ContributionModel,
  User,
} from "../types";
import { getUsersApi } from "../lib/api";
import { UserDetailModal } from "../components/UserDetailModal";
import { Reveal } from "../components/motion";
import {
  Users,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Download,
  BookOpen,
  BarChart3,
  PieChart,
  TrendingUp,
  Eye,
  RefreshCw,
  Layers,
  Award,
  ShieldAlert,
  Calendar,
  Search,
  ChevronRight,
} from "lucide-react";

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  statsUnavailable?: boolean;
  documents?: DocumentModel[];
  hiddenDocuments?: DocumentModel[];
  matieres?: MatiereModel[];
  contributions?: ContributionModel[];
  onNavigateToModeration: () => void;
  onNavigateToAudit?: () => void;
  onPreviewDoc?: (doc: DocumentModel) => void;
  onRefreshData?: () => Promise<void> | void;
}

const EXAM_TYPE_CONFIG: Array<{
  type: string;
  label: string;
  stroke: string;
  bg: string;
  badge: string;
}> = [
  {
    type: "CC",
    label: "Contrôle Continu (CC)",
    stroke: "#dc2626",
    bg: "bg-red-600",
    badge: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/30",
  },
  {
    type: "SN",
    label: "Session Normale (SN)",
    stroke: "#1d4ed8",
    bg: "bg-blue-700",
    badge: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
  },
  {
    type: "SR",
    label: "Session Rattrapage (SR)",
    stroke: "#059669",
    bg: "bg-emerald-600",
    badge: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30",
  },
  {
    type: "TD",
    label: "Travaux Dirigés (TD)",
    stroke: "#d97706",
    bg: "bg-amber-600",
    badge: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30",
  },
  {
    type: "TP",
    label: "Travaux Pratiques (TP)",
    stroke: "#0284c7",
    bg: "bg-sky-600",
    badge: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30",
  },
  {
    type: "Cours",
    label: "Support de Cours",
    stroke: "#0d9488",
    bg: "bg-teal-600",
    badge: "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30",
  },
];

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  documents = [],
  hiddenDocuments = [],
  matieres = [],
  contributions = [],
  onNavigateToModeration,
  onNavigateToAudit,
  onPreviewDoc,
  onRefreshData,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [subjectSemFilter, setSubjectSemFilter] = useState<"Tous" | "Semestre 1" | "Semestre 2">("Tous");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<
    "Tous" | "Etudiant" | "Administrateur" | "SuperAdministrateur"
  >("Tous");

  useEffect(() => {
    let cancelled = false;
    getUsersApi()
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setUsers(list);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [stats]);

  const handleRefresh = async () => {
    if (!onRefreshData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      const freshUsers = await getUsersApi().catch(() => []);
      if (Array.isArray(freshUsers)) setUsers(freshUsers);
    } finally {
      setIsRefreshing(false);
    }
  };

  // All documents in catalog (published + hidden)
  const allDocs = useMemo(() => {
    const map = new Map<string, DocumentModel>();
    documents.forEach((d) => map.set(d.id, d));
    hiddenDocuments.forEach((d) => map.set(d.id, d));
    return Array.from(map.values());
  }, [documents, hiddenDocuments]);

  // Core KPI metrics computed from real database entities & stats endpoint
  const totalUsersCount = stats?.totalUsers ?? (users.length > 0 ? users.length : 0);
  const publishedDocsCount = documents.length || stats?.documentsPublies || 0;
  const hiddenDocsCount = hiddenDocuments.length;
  const totalDocsCount = stats?.totalDocuments ?? publishedDocsCount + hiddenDocsCount;

  const pendingContribs = useMemo(
    () => contributions.filter((c) => c.statut === "En attente"),
    [contributions]
  );
  const approvedContribsCount = useMemo(
    () => contributions.filter((c) => c.statut === "Publié").length,
    [contributions]
  );
  const rejectedContribsCount = useMemo(
    () => contributions.filter((c) => c.statut === "Refusé").length,
    [contributions]
  );
  const pendingCount = stats?.documentsEnAttente ?? pendingContribs.length;

  const totalDownloads = useMemo(
    () => documents.reduce((sum, d) => sum + (Number(d.telechargementsCount) || 0), 0),
    [documents]
  );
  const avgDownloadsPerDoc =
    publishedDocsCount > 0 ? (totalDownloads / publishedDocsCount).toFixed(1) : "0.0";

  // Subject coverage analysis
  const subjectsAnalytics = useMemo(() => {
    return matieres.map((m) => {
      const matchingDocs = documents.filter(
        (d) =>
          d.matiereId === m.id ||
          d.matiere?.toLowerCase().trim() === m.nom?.toLowerCase().trim()
      );
      const downloads = matchingDocs.reduce(
        (acc, d) => acc + (Number(d.telechargementsCount) || 0),
        0
      );
      return {
        ...m,
        realDocsCount: matchingDocs.length,
        downloads,
      };
    });
  }, [matieres, documents]);

  const coveredSubjectsCount = useMemo(
    () => subjectsAnalytics.filter((s) => s.realDocsCount > 0).length,
    [subjectsAnalytics]
  );
  const coveragePercent =
    matieres.length > 0 ? Math.round((coveredSubjectsCount / matieres.length) * 100) : 0;

  const filteredSubjectsAnalytics = useMemo(() => {
    const list =
      subjectSemFilter === "Tous"
        ? subjectsAnalytics
        : subjectsAnalytics.filter((s) => s.semestre === subjectSemFilter);
    return [...list].sort((a, b) => {
      if (b.realDocsCount !== a.realDocsCount) return b.realDocsCount - a.realDocsCount;
      return b.downloads - a.downloads;
    });
  }, [subjectsAnalytics, subjectSemFilter]);

  const maxSubjectDocs = useMemo(
    () => Math.max(1, ...subjectsAnalytics.map((s) => s.realDocsCount)),
    [subjectsAnalytics]
  );

  // Distribution by exam type (for Donut Chart)
  const typeDistribution = useMemo(() => {
    const total = Math.max(1, documents.length);
    let cumulativeFraction = 0;

    return EXAM_TYPE_CONFIG.map((cfg) => {
      const count = documents.filter((d) => d.typeEpreuve === cfg.type).length;
      const downloads = documents
        .filter((d) => d.typeEpreuve === cfg.type)
        .reduce((acc, d) => acc + (Number(d.telechargementsCount) || 0), 0);
      const fraction = documents.length > 0 ? count / total : 0;
      const pct = documents.length > 0 ? Math.round(fraction * 100) : 0;
      const startFraction = cumulativeFraction;
      cumulativeFraction += fraction;

      return {
        ...cfg,
        count,
        downloads,
        fraction,
        pct,
        startFraction,
      };
    });
  }, [documents]);

  // Distribution by Semester (S1 vs S2)
  const semesterStats = useMemo(() => {
    const s1Docs = documents.filter((d) => d.semestre === "Semestre 1");
    const s2Docs = documents.filter((d) => d.semestre === "Semestre 2");
    const s1Downloads = s1Docs.reduce((a, d) => a + (Number(d.telechargementsCount) || 0), 0);
    const s2Downloads = s2Docs.reduce((a, d) => a + (Number(d.telechargementsCount) || 0), 0);
    const total = Math.max(1, s1Docs.length + s2Docs.length);
    return {
      s1Count: s1Docs.length,
      s2Count: s2Docs.length,
      s1Pct: documents.length > 0 ? Math.round((s1Docs.length / total) * 100) : 50,
      s2Pct: documents.length > 0 ? Math.round((s2Docs.length / total) * 100) : 50,
      s1Downloads,
      s2Downloads,
    };
  }, [documents]);

  // Distribution by Academic Year (Vertical Bar Chart)
  const academicYearStats = useMemo(() => {
    const map = new Map<string, { year: string; count: number; downloads: number }>();
    documents.forEach((d) => {
      const y = d.anneeAcademique || "Non spécifié";
      const existing = map.get(y) || { year: y, count: 0, downloads: 0 };
      existing.count += 1;
      existing.downloads += Number(d.telechargementsCount) || 0;
      map.set(y, existing);
    });
    const list = Array.from(map.values()).sort((a, b) => a.year.localeCompare(b.year));
    const maxCount = Math.max(1, ...list.map((i) => i.count));
    return { list, maxCount };
  }, [documents]);

  // Top Downloaded Documents
  const topDownloadedDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => (Number(b.telechargementsCount) || 0) - (Number(a.telechargementsCount) || 0))
      .slice(0, 5);
  }, [documents]);

  // User Role Breakdown
  const roleBreakdown = useMemo(() => {
    const etudiants = users.filter((u) => u.role === "Etudiant").length;
    const admins = users.filter((u) => u.role === "Administrateur").length;
    const superAdmins = users.filter((u) => u.role === "SuperAdministrateur").length;
    return { etudiants, admins, superAdmins };
  }, [users]);

  // Filtered users for the interactive directory
  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userRoleFilter !== "Tous" && u.role !== userRoleFilter) return false;
      if (!q) return true;
      const fullName = `${u.prenom || ""} ${u.nom || ""}`.toLowerCase();
      return (
        fullName.includes(q) ||
        (u.email || "").toLowerCase().includes(q) ||
        (u.role || "").toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userRoleFilter]);

  // SVG Donut geometry constants
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-6 pb-14">
      {/* 1. EN-TÊTE INSTITUTIONNEL & BARRE D'ACTIONS */}
      <Reveal>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Gouvernance & Analytique • Institut Universitaire Saint Jean</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Tableau de Bord Administrateur
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                Pilotage en temps réel du fonds documentaire ING1, suivi des téléchargements, couverture par unité d'enseignement et file de modération.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {onRefreshData && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60"
                  title="Actualiser les indicateurs depuis la base de données"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                  <span>Actualiser</span>
                </button>
              )}

              {onNavigateToAudit && (
                <button
                  onClick={onNavigateToAudit}
                  className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-200 dark:border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                  <span>Audit & Comptes</span>
                </button>
              )}

              <button
                onClick={onNavigateToModeration}
                className="h-10 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Modération des Épreuves</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-400 text-slate-950 tabular-nums leading-none">
                    {pendingCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 2. BANDEAU D'ALERTE SI SOUMISSIONS EN ATTENTE */}
      {pendingCount > 0 && (
        <Reveal delay={0.04}>
          <div className="bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-slate-900 dark:text-slate-100 font-bold text-sm sm:text-base">
                  {pendingCount} soumission{pendingCount > 1 ? "s" : ""} étudiante{pendingCount > 1 ? "s" : ""} en attente de validation
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Vérifiez la lisibilité des fichiers PDF soumis et publiez-les dans le catalogue officiel avec leurs métadonnées.
                </p>
              </div>
            </div>
            <button
              onClick={onNavigateToModeration}
              className="px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>Traiter la file</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Reveal>
      )}

      {/* 3. GRILLE DES 6 INDICATEURS CLÉS DE PERFORMANCE (KPIs) */}
      <Reveal delay={0.06}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* KPI 1 : Épreuves Publiées */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Épreuves Publiées
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {publishedDocsCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Sur <strong className="text-slate-700 dark:text-slate-200">{totalDocsCount}</strong> indexées ({hiddenDocsCount} masquée{hiddenDocsCount > 1 ? "s" : ""})
              </p>
            </div>
          </div>

          {/* KPI 2 : Téléchargements Cumulés */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Téléchargements
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-900 dark:text-blue-300 tabular-nums">
                {totalDownloads}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Moy. <strong className="text-slate-700 dark:text-slate-200">{avgDownloadsPerDoc}</strong> téléch. / épreuve
              </p>
            </div>
          </div>

          {/* KPI 3 : Couverture des Matières */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Couverture UE
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                  {coveredSubjectsCount}/{matieres.length}
                </span>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                  ({coveragePercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                <div
                  className="h-full bg-blue-700 dark:bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI 4 : File de Modération */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                En Modération
              </span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  pendingCount > 0
                    ? "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                    : "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {pendingCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {approvedContribsCount} validée{approvedContribsCount > 1 ? "s" : ""} • {rejectedContribsCount} refusée{rejectedContribsCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* KPI 5 : Utilisateurs Inscrits */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Communauté
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {totalUsersCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {users.length > 0
                  ? `${roleBreakdown.etudiants} étud. • ${roleBreakdown.admins + roleBreakdown.superAdmins} admin.`
                  : "Comptes étudiants & admins"}
              </p>
            </div>
          </div>

          {/* KPI 6 : Équilibre Semestriel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Répartition S1 / S2
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                {semesterStats.s1Count} <span className="text-slate-400 font-normal text-lg">/</span> {semesterStats.s2Count}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {semesterStats.s1Pct}% au S1 • {semesterStats.s2Pct}% au S2
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* 4. DIAGRAMMES ANALYTIQUES : DONUT TYPE D'ÉPREUVE + ÉVOLUTION ANNUELLE & SEMESTRES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Diagramme Circulaire (Donut SVG) : Répartition par Type d'Épreuve */}
        <Reveal delay={0.1} className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Répartition par Type d'Évaluation</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ventilation des sujets publiés entre CC, SN, SR, TD, TP et Cours
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                {publishedDocsCount} sujet{publishedDocsCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-auto">
              {/* Donut SVG */}
              <div className="sm:col-span-5 flex items-center justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-44 h-44 -rotate-90" viewBox="0 0 140 140">
                    <circle
                      cx="70"
                      cy="70"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      strokeWidth="16"
                      className="text-slate-100 dark:text-slate-800"
                    />
                    {typeDistribution.map((seg) => {
                      if (seg.count === 0) return null;
                      const dashLength = seg.fraction * circumference;
                      const dashOffset = -seg.startFraction * circumference;
                      return (
                        <circle
                          key={seg.type}
                          cx="70"
                          cy="70"
                          r={radius}
                          fill="transparent"
                          stroke={seg.stroke}
                          strokeWidth="16"
                          strokeDasharray={`${dashLength} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          className="transition-all duration-500"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                      {publishedDocsCount}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                      Épreuves
                    </span>
                  </div>
                </div>
              </div>

              {/* Légende détaillée avec barres et téléchargements */}
              <div className="sm:col-span-7 space-y-2.5">
                {typeDistribution.map((item) => (
                  <div
                    key={item.type}
                    className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-3 h-3 rounded-sm shrink-0 ${item.bg}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.label}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {item.downloads} téléchargement{item.downloads > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                        {item.count}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 tabular-nums w-11 text-center">
                        {item.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* Histogramme Années Académiques + Comparatif Semestriel */}
        <Reveal delay={0.14} className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Distribution Annuelle & Semestrielle</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Volume d'archives par année académique et équilibre S1 / S2
                </p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            {/* Histogramme vertical par année académique */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Épreuves par Année Académique
              </div>

              {academicYearStats.list.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  Aucune donnée annuelle disponible
                </div>
              ) : (
                <div className="h-40 pt-4 pb-2 px-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl flex items-end justify-around gap-3">
                  {academicYearStats.list.map((yr) => {
                    const heightPct = Math.max(14, Math.round((yr.count / academicYearStats.maxCount) * 100));
                    return (
                      <div
                        key={yr.year}
                        className="flex-1 max-w-[72px] h-full flex flex-col items-center justify-end group"
                      >
                        <span className="text-[11px] font-extrabold text-blue-900 dark:text-blue-300 tabular-nums mb-1">
                          {yr.count}
                        </span>
                        <div className="w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-t-lg flex items-end overflow-hidden h-24">
                          <div
                            className="w-full bg-blue-900 dark:bg-blue-600 group-hover:bg-blue-700 rounded-t-lg transition-all duration-500"
                            style={{ height: `${heightPct}%` }}
                            title={`${yr.year} : ${yr.count} épreuve(s), ${yr.downloads} téléchargement(s)`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate max-w-full">
                          {yr.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Jauge Comparative Semestre 1 vs Semestre 2 */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-900 dark:bg-blue-500" />
                  Semestre 1 ({semesterStats.s1Count} sujets • {semesterStats.s1Downloads} téléch.)
                </span>
                <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  Semestre 2 ({semesterStats.s2Count} sujets • {semesterStats.s2Downloads} téléch.)
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                </span>
              </div>

              <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-blue-900 dark:bg-blue-500 transition-all duration-500"
                  style={{ width: `${semesterStats.s1Pct}%` }}
                  title={`Semestre 1 : ${semesterStats.s1Pct}%`}
                />
                <div
                  className="h-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${100 - semesterStats.s1Pct}%` }}
                  title={`Semestre 2 : ${100 - semesterStats.s1Pct}%`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Part S1 : <strong>{semesterStats.s1Pct}%</strong></span>
                <span>Part S2 : <strong>{semesterStats.s2Pct}%</strong></span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 5. DIAGRAMME DE COUVERTURE PAR MATIÈRE (BARRES HORIZONTALES & DÉTECTION DES MANQUES) */}
      <Reveal delay={0.18}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <span>Couverture Documentaire par Matière (Niveau 1 Ingénieur)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nombre d'épreuves publiées et téléchargements par matière — identifiez rapidement les UE à enrichir
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto shrink-0">
              {(["Tous", "Semestre 1", "Semestre 2"] as const).map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSubjectSemFilter(sem)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    subjectSemFilter === sem
                      ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {filteredSubjectsAnalytics.map((subj) => {
              const barPct =
                subj.realDocsCount > 0
                  ? Math.max(12, Math.round((subj.realDocsCount / maxSubjectDocs) * 100))
                  : 0;
              return (
                <div
                  key={subj.id}
                  className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 font-mono text-[10px] font-bold shrink-0">
                        {subj.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {subj.nom}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {subj.downloads} téléch.
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                          subj.realDocsCount > 0
                            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300"
                        }`}
                      >
                        {subj.realDocsCount > 0
                          ? `${subj.realDocsCount} sujet${subj.realDocsCount > 1 ? "s" : ""}`
                          : "À compléter"}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        subj.realDocsCount > 0
                          ? "bg-blue-900 dark:bg-blue-500"
                          : "bg-amber-400 w-0"
                      }`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* 6. PALMARÈS DES TÉLÉCHARGEMENTS & DERNIÈRES CONTRIBUTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 5 des Épreuves les plus téléchargées */}
        <Reveal delay={0.22} className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Palmarès des Épreuves les Plus Téléchargées</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Les sujets d'examens les plus sollicités par les étudiants de Niveau 1
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                Top {topDownloadedDocs.length}
              </span>
            </div>

            {topDownloadedDocs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Aucune épreuve publiée pour le moment.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {topDownloadedDocs.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? "bg-blue-900 text-white"
                            : idx === 1
                            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {doc.titre}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {doc.matiere}
                          </span>
                          <span>•</span>
                          <span>{doc.typeEpreuve}</span>
                          <span>•</span>
                          <span>{doc.anneeAcademique}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold tabular-nums flex items-center gap-1">
                        <Download className="w-3 h-3 text-blue-700 dark:text-blue-400" />
                        <span>{doc.telechargementsCount || 0}</span>
                      </div>
                      {onPreviewDoc && (
                        <button
                          onClick={() => onPreviewDoc(doc)}
                          className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 transition-colors cursor-pointer"
                          title="Prévisualiser le PDF"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* État des Contributions & Répartition des Rôles */}
        <Reveal delay={0.26} className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                  <span>Flux de Modération & Rôles</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Synthèse des soumissions étudiantes et gouvernance des comptes
                </p>
              </div>
              <button
                onClick={onNavigateToModeration}
                className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gérer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cartes de statut des contributions */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 text-center">
                <div className="text-xl font-black text-amber-800 dark:text-amber-300 tabular-nums">
                  {pendingCount}
                </div>
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase mt-0.5">
                  En Attente
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/30 text-center">
                <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                  {approvedContribsCount}
                </div>
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mt-0.5">
                  Approuvées
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-500/10 border border-red-200/80 dark:border-red-500/30 text-center">
                <div className="text-xl font-black text-red-800 dark:text-red-300 tabular-nums">
                  {rejectedContribsCount}
                </div>
                <div className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase mt-0.5">
                  Refusées
                </div>
              </div>
            </div>

            {/* Répartition des rôles utilisateurs */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Répartition des Comptes ({totalUsersCount})</span>
                {onNavigateToAudit && (
                  <button
                    onClick={onNavigateToAudit}
                    className="text-[11px] text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Gérer les accès →
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">
                    {users.length > 0 ? roleBreakdown.etudiants : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Étudiants
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">
                    {users.length > 0 ? roleBreakdown.admins : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Admins
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm font-extrabold text-blue-900 dark:text-sky-400 tabular-nums">
                    {users.length > 0 ? roleBreakdown.superAdmins : "—"}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    SuperAdmins
                  </div>
                </div>
              </div>
            </div>

            {/* Action directe vers la modération ou l'audit */}
            <div className="pt-1">
              <button
                onClick={onNavigateToModeration}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Ouvrir le Centre de Modération & Publication</span>
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 7. RÉPERTOIRE DES UTILISATEURS & ACTIVITÉ INDIVIDUELLE (CLIC SUR UNE LIGNE) */}
      <Reveal delay={0.3}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <span>Utilisateurs & Suivi Individuel</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cliquez sur une ligne d'utilisateur pour afficher ses dernières connexions, ses épreuves favorites et ses contributions en attente
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Barre de recherche utilisateur */}
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher nom, e-mail..."
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
              </div>

              {/* Filtres par rôle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
                {(
                  [
                    { id: "Tous", label: `Tous (${users.length})` },
                    { id: "Etudiant", label: `Étudiants (${roleBreakdown.etudiants})` },
                    { id: "Administrateur", label: `Admins (${roleBreakdown.admins})` },
                    { id: "SuperAdministrateur", label: `SuperAdmins (${roleBreakdown.superAdmins})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setUserRoleFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      userRoleFilter === tab.id
                        ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Adresse E-mail</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Contributions</th>
                  <th className="py-3 px-4 hidden md:table-cell">Inscription</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Aucun compte utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const userContribs = contributions.filter(
                      (c) =>
                        c.utilisateurId === u.id ||
                        c.utilisateurEmail?.toLowerCase().trim() ===
                          u.email?.toLowerCase().trim()
                    );
                    const userPendingCount = userContribs.filter(
                      (c) => c.statut === "En attente"
                    ).length;
                    const createdDate = u.dateCreation
                      ? new Date(u.dateCreation).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—";

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="hover:bg-blue-50/50 dark:hover:bg-blue-950/25 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {(u.prenom?.[0] || "").toUpperCase()}
                              {(u.nom?.[0] || "U").toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors truncate">
                                {u.prenom} {u.nom}
                              </div>
                              {u.telephone && (
                                <div className="text-[10px] text-slate-400 truncate">
                                  {u.telephone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {u.email}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.role === "SuperAdministrateur"
                                ? "bg-blue-950 text-white border-blue-900 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30"
                                : u.role === "Administrateur"
                                ? "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
                                : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                            }`}
                          >
                            {u.role === "Etudiant" ? "Étudiant" : u.role}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {userPendingCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                {userPendingCount} en attente
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                {userContribs.length > 0
                                  ? `${userContribs.length} soumise${userContribs.length > 1 ? "s" : ""}`
                                  : "Aucune"}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 hidden md:table-cell text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {createdDate}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(u);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Voir fiche</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* MODALE VUE DÉTAILLÉE UTILISATEUR (Connexions, Favoris, Contributions en attente) */}
      <UserDetailModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        allDocuments={allDocs}
        allContributions={contributions}
        onPreviewDoc={onPreviewDoc}
        onNavigateToModeration={onNavigateToModeration}
      />
    </div>
  );
};
