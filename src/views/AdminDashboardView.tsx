import React, { useState, useEffect, useMemo } from "react";
import {
  DashboardStats,
  DocumentModel,
  MatiereModel,
  ContributionModel,
  User,
  UserActivity,
} from "../types";
import {
  getUsersApi,
  getAdminDailyAnalyticsApi,
  DailyAnalyticsPoint,
  ContributionActivityEvent,
} from "../lib/api";
import { UserDetailModal } from "../components/UserDetailModal";
import { AdminSubNav } from "../components/AdminSubNav";
import { Reveal } from "../components/motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
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
  LogIn,
  Upload,
  Activity,
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

  // Recharts Daily Analytics & Activity Feed state
  const [analyticsDays, setAnalyticsDays] = useState<7 | 14 | 30>(14);
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [dailySeries, setDailySeries] = useState<DailyAnalyticsPoint[]>([]);
  const [downloadEvents, setDownloadEvents] = useState<UserActivity[]>([]);
  const [loginEvents, setLoginEvents] = useState<UserActivity[]>([]);
  const [contributionEvents, setContributionEvents] = useState<ContributionActivityEvent[]>([]);
  const [activityFeedTab, setActivityFeedTab] = useState<"logins" | "downloads" | "contributions">("logins");
  const [activitySearch, setActivitySearch] = useState("");
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [hoveredExamType, setHoveredExamType] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    setIsAnalyticsLoading(true);
    getAdminDailyAnalyticsApi(analyticsDays)
      .then((res) => {
        if (cancelled || !res) return;
        setDailySeries(Array.isArray(res.dailySeries) ? res.dailySeries : []);
        setDownloadEvents(Array.isArray(res.downloadEvents) ? res.downloadEvents : []);
        setLoginEvents(Array.isArray(res.loginEvents) ? res.loginEvents : []);
        setContributionEvents(
          Array.isArray(res.contributionEvents) ? res.contributionEvents : []
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setIsAnalyticsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analyticsDays, stats]);

  const handleRefresh = async () => {
    if (!onRefreshData || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshData();
      const [freshUsers, freshAnalytics] = await Promise.all([
        getUsersApi().catch(() => []),
        getAdminDailyAnalyticsApi(analyticsDays).catch(() => null),
      ]);
      if (Array.isArray(freshUsers)) setUsers(freshUsers);
      if (freshAnalytics) {
        setDailySeries(Array.isArray(freshAnalytics.dailySeries) ? freshAnalytics.dailySeries : []);
        setDownloadEvents(Array.isArray(freshAnalytics.downloadEvents) ? freshAnalytics.downloadEvents : []);
        setLoginEvents(Array.isArray(freshAnalytics.loginEvents) ? freshAnalytics.loginEvents : []);
        setContributionEvents(
          Array.isArray(freshAnalytics.contributionEvents) ? freshAnalytics.contributionEvents : []
        );
      }
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
      const typeCounts: Record<string, number> = {};
      matchingDocs.forEach((d) => {
        const t = d.typeEpreuve || "Autre";
        typeCounts[t] = (typeCounts[t] || 0) + 1;
      });
      const avgDownloads =
        matchingDocs.length > 0 ? (downloads / matchingDocs.length).toFixed(1) : "0.0";
      const downloadSharePct =
        totalDownloads > 0 ? Math.round((downloads / totalDownloads) * 100) : 0;

      return {
        ...m,
        realDocsCount: matchingDocs.length,
        downloads,
        avgDownloads,
        downloadSharePct,
        typeCounts,
      };
    });
  }, [matieres, documents, totalDownloads]);

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
      const matching = documents.filter((d) => d.typeEpreuve === cfg.type);
      const count = matching.length;
      const downloads = matching.reduce(
        (acc, d) => acc + (Number(d.telechargementsCount) || 0),
        0
      );
      const fraction = documents.length > 0 ? count / total : 0;
      const pct = documents.length > 0 ? Math.round(fraction * 100) : 0;
      const avgDownloads = count > 0 ? (downloads / count).toFixed(1) : "0.0";
      const downloadSharePct =
        totalDownloads > 0 ? Math.round((downloads / totalDownloads) * 100) : 0;
      const startFraction = cumulativeFraction;
      cumulativeFraction += fraction;

      return {
        ...cfg,
        count,
        downloads,
        avgDownloads,
        downloadSharePct,
        fraction,
        pct,
        startFraction,
      };
    });
  }, [documents, totalDownloads]);

  const activeHoveredTypeData = useMemo(
    () =>
      hoveredExamType
        ? typeDistribution.find((t) => t.type === hoveredExamType) || null
        : null,
    [hoveredExamType, typeDistribution]
  );

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
      s1AvgDownloads: s1Docs.length > 0 ? (s1Downloads / s1Docs.length).toFixed(1) : "0.0",
      s2AvgDownloads: s2Docs.length > 0 ? (s2Downloads / s2Docs.length).toFixed(1) : "0.0",
    };
  }, [documents]);

  // Distribution by Academic Year (Vertical Bar Chart)
  const academicYearStats = useMemo(() => {
    const map = new Map<
      string,
      { year: string; count: number; downloads: number; s1Count: number; s2Count: number }
    >();
    documents.forEach((d) => {
      const y = d.anneeAcademique || "Non spécifié";
      const existing = map.get(y) || {
        year: y,
        count: 0,
        downloads: 0,
        s1Count: 0,
        s2Count: 0,
      };
      existing.count += 1;
      existing.downloads += Number(d.telechargementsCount) || 0;
      if (d.semestre === "Semestre 1") existing.s1Count += 1;
      else if (d.semestre === "Semestre 2") existing.s2Count += 1;
      map.set(y, existing);
    });
    const totalDocs = Math.max(1, documents.length);
    const list = Array.from(map.values())
      .sort((a, b) => a.year.localeCompare(b.year))
      .map((item) => ({
        ...item,
        pctOfCatalog: documents.length > 0 ? Math.round((item.count / totalDocs) * 100) : 0,
        avgDownloads: item.count > 0 ? (item.downloads / item.count).toFixed(1) : "0.0",
      }));
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

  // Period totals from dailySeries
  const periodTotals = useMemo(() => {
    return dailySeries.reduce(
      (acc, pt) => {
        acc.downloads += pt.downloads;
        acc.contributions += pt.contributions;
        acc.logins += pt.logins;
        return acc;
      },
      { downloads: 0, contributions: 0, logins: 0 }
    );
  }, [dailySeries]);

  const findUserByIdOrEmail = (userId?: string, email?: string): User | null => {
    if (!users.length) return null;
    const byId = userId ? users.find((u) => u.id === userId) : undefined;
    if (byId) return byId;
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const byEmail = users.find((u) => u.email?.trim().toLowerCase() === cleanEmail);
      if (byEmail) return byEmail;
    }
    return null;
  };

  const formatActivityDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const filteredLoginEvents = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    if (!q) return loginEvents;
    return loginEvents.filter(
      (ev) =>
        (ev.userNom || "").toLowerCase().includes(q) ||
        (ev.userEmail || "").toLowerCase().includes(q) ||
        (ev.userRole || "").toLowerCase().includes(q)
    );
  }, [loginEvents, activitySearch]);

  const filteredDownloadEvents = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    if (!q) return downloadEvents;
    return downloadEvents.filter(
      (ev) =>
        (ev.userNom || "").toLowerCase().includes(q) ||
        (ev.userEmail || "").toLowerCase().includes(q) ||
        (ev.targetTitle || "").toLowerCase().includes(q) ||
        (ev.description || "").toLowerCase().includes(q)
    );
  }, [downloadEvents, activitySearch]);

  const filteredContributionEvents = useMemo(() => {
    const q = activitySearch.trim().toLowerCase();
    const list =
      contributionEvents.length > 0
        ? contributionEvents
        : contributions.slice(0, 60).map((c) => ({
            id: c.id,
            userId: c.utilisateurId,
            userNom: c.utilisateurNom,
            userEmail: c.utilisateurEmail,
            userRole: "Etudiant",
            actionType: "SUBMIT_CONTRIBUTION",
            description: `A soumis « ${c.titre || c.fichierNom} » (${c.matiere || "Matière"} • ${c.typeEpreuve || "Épreuve"})`,
            targetId: c.id,
            targetTitle: c.titre || c.fichierNom,
            matiere: c.matiere,
            typeEpreuve: c.typeEpreuve,
            statut: c.statut,
            timestamp: c.dateEnvoi,
          }));
    if (!q) return list;
    return list.filter(
      (ev) =>
        (ev.userNom || "").toLowerCase().includes(q) ||
        (ev.userEmail || "").toLowerCase().includes(q) ||
        (ev.targetTitle || "").toLowerCase().includes(q) ||
        (ev.matiere || "").toLowerCase().includes(q)
    );
  }, [contributionEvents, contributions, activitySearch]);

  // SVG Donut geometry constants
  const radius = 56;
  const circumference = 2 * Math.PI * radius;

  // Custom Interactive Tooltip for Recharts Daily Activity (AreaChart & BarChart)
  const renderDailyChartTooltip = (tooltipProps: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload?: DailyAnalyticsPoint }>;
    label?: string | number;
  }) => {
    const { active, payload, label } = tooltipProps;
    if (!active || !payload || payload.length === 0) return null;
    const pt = payload[0]?.payload;
    if (!pt) return null;

    const totalActions = pt.logins + pt.downloads + pt.contributions;
    const loginPct = totalActions > 0 ? Math.round((pt.logins / totalActions) * 100) : 0;
    const downloadPct = totalActions > 0 ? Math.round((pt.downloads / totalActions) * 100) : 0;
    const contribPct = totalActions > 0 ? Math.round((pt.contributions / totalActions) * 100) : 0;

    const connectedNames = pt.connectedUsersList ?? [];
    const downloadedTitles = pt.downloadedDocsList ?? [];
    const contributedTitles = pt.contributedDocsList ?? [];

    return (
      <div className="bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3.5 shadow-xl text-slate-100 min-w-[240px] max-w-[300px] space-y-2.5 pointer-events-none">
        {/* Date Header + Total Badge */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
          <div className="text-xs font-extrabold text-white capitalize truncate">
            {pt.fullLabel || label}
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[10px] font-bold text-blue-300 tabular-nums shrink-0">
            {totalActions} action{totalActions > 1 ? "s" : ""}
          </span>
        </div>

        {/* Detailed Metric Rows */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold">Connexions</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="font-extrabold text-white">{pt.logins}</span>
              <span className="text-[10px] text-slate-400">({loginPct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pl-4 text-[11px] text-emerald-300/90">
            <span>• Utilisateurs uniques</span>
            <span className="font-mono font-bold tabular-nums">{pt.uniqueUsers}</span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold">Téléchargements</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="font-extrabold text-white">{pt.downloads}</span>
              <span className="text-[10px] text-slate-400">({downloadPct}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold">Contributions</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono tabular-nums">
              <span className="font-extrabold text-white">{pt.contributions}</span>
              <span className="text-[10px] text-slate-400">({contribPct}%)</span>
            </div>
          </div>
        </div>

        {/* Nominative highlights for that specific day */}
        {(connectedNames.length > 0 ||
          downloadedTitles.length > 0 ||
          contributedTitles.length > 0) && (
          <div className="border-t border-slate-800 pt-2 space-y-1.5 text-[10px]">
            {connectedNames.length > 0 && (
              <div>
                <span className="font-bold text-emerald-400 uppercase tracking-wider">
                  Connecté(s) :{" "}
                </span>
                <span className="text-slate-300">{connectedNames.join(", ")}</span>
              </div>
            )}
            {downloadedTitles.length > 0 && (
              <div>
                <span className="font-bold text-blue-400 uppercase tracking-wider">
                  Téléchargé :{" "}
                </span>
                <span className="text-slate-300 line-clamp-2">
                  {downloadedTitles.join(" • ")}
                </span>
              </div>
            )}
            {contributedTitles.length > 0 && (
              <div>
                <span className="font-bold text-amber-400 uppercase tracking-wider">
                  Soumis :{" "}
                </span>
                <span className="text-slate-300 line-clamp-2">
                  {contributedTitles.join(" • ")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-14">
      {/* 0. BARRE DE NAVIGATION INTER-MODULES ADMINISTRATION */}
      <AdminSubNav
        activeModule="admin-dashboard"
        isSuperAdmin={Boolean(onNavigateToAudit)}
        pendingCount={pendingCount}
        publishedCount={publishedDocsCount}
        isRefreshing={isRefreshing}
        onNavigateModule={(mod) => {
          if (mod === "admin-documents") onNavigateToModeration();
          if (mod === "super-admin-audit" && onNavigateToAudit) onNavigateToAudit();
        }}
        onRefresh={onRefreshData ? handleRefresh : undefined}
      />

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

      {/* 3.5. GRAPHIQUES RECHARTS D'ÉVOLUTION QUOTIDIENNE & TRAÇABILITÉ NOMINATIVE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Colonne Gauche (7 cols) : Graphique Recharts Évolution Quotidienne */}
        <Reveal delay={0.08} className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-5">
            {/* En-tête + Contrôles de période et type de graphique */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
                  <span>Évolution Quotidienne de l'Activité</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Courbes journalières des connexions, téléchargements d'épreuves et dépôts de contributions
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                {/* Sélecteur Courbe / Barres */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setChartType("area")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      chartType === "area"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Courbes
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType("bar")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      chartType === "bar"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Histogramme
                  </button>
                </div>

                {/* Sélecteur 7j / 14j / 30j */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  {([7, 14, 30] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setAnalyticsDays(d)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer tabular-nums whitespace-nowrap ${
                        analyticsDays === d
                          ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      {d}j
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3 Compteurs Récapitulatifs sur la période sélectionnée */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Connexions ({analyticsDays}j)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums mt-1">
                  {periodTotals.logins}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Téléchargements ({analyticsDays}j)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-blue-900 dark:text-blue-300 tabular-nums mt-1">
                  {periodTotals.downloads}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                    Contributions ({analyticsDays}j)
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums mt-1">
                  {periodTotals.contributions}
                </div>
              </div>
            </div>

            {/* Zone Graphique Recharts */}
            <div className="w-full h-72 sm:h-80 pt-1">
              {isAnalyticsLoading && dailySeries.length === 0 ? (
                <div className="w-full h-full rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-xs text-slate-500">
                  Chargement des séries temporelles...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart
                      data={dailySeries}
                      margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="gradDownloads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="gradLogins" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="gradContribs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
                        tickLine={false}
                        minTickGap={14}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={renderDailyChartTooltip}
                        cursor={{ stroke: "#3b82f6", strokeWidth: 1.5, strokeDasharray: "4 4" }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={32}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="logins"
                        name="Connexions"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradLogins)"
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="downloads"
                        name="Téléchargements"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradDownloads)"
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="contributions"
                        name="Contributions"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#gradContribs)"
                        activeDot={{ r: 6, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart
                      data={dailySeries}
                      margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={{ stroke: "#cbd5e1", strokeOpacity: 0.4 }}
                        tickLine={false}
                        minTickGap={14}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={renderDailyChartTooltip}
                        cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={32}
                        iconType="circle"
                        wrapperStyle={{ fontSize: "12px", fontWeight: 600 }}
                      />
                      <Bar
                        dataKey="logins"
                        name="Connexions"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="downloads"
                        name="Téléchargements"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                      <Bar
                        dataKey="contributions"
                        name="Contributions"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={22}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </Reveal>

        {/* Colonne Droite (5 cols) : Qui s'est connecté, Qui a téléchargé, Qui a contribué */}
        <Reveal delay={0.1} className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs h-full flex flex-col justify-between space-y-4">
            <div className="space-y-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-700 dark:text-blue-400 shrink-0" />
                    <span>Suivi Nominatif en Temps Réel</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Consultez qui s'est connecté, qui a téléchargé une épreuve et qui a déposé un sujet
                  </p>
                </div>
              </div>

              {/* Onglets : Qui s'est connecté | Qui a téléchargé | Qui a contribué */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setActivityFeedTab("logins")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activityFeedTab === "logins"
                      ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Connectés ({loginEvents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityFeedTab("downloads")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activityFeedTab === "downloads"
                      ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Téléchargé ({downloadEvents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivityFeedTab("contributions")}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    activityFeedTab === "contributions"
                      ? "bg-blue-900 text-white dark:bg-blue-600 shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Contribué ({filteredContributionEvents.length})</span>
                </button>
              </div>

              {/* Filtre rapide par nom, email ou épreuve */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder={
                    activityFeedTab === "logins"
                      ? "Filtrer par nom ou e-mail d'étudiant connecté..."
                      : activityFeedTab === "downloads"
                      ? "Filtrer par étudiant ou épreuve téléchargée..."
                      : "Filtrer par contributeur ou sujet soumis..."
                  }
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Liste défilante des événements nominatifs */}
            <div className="flex-1 max-h-[340px] overflow-y-auto pr-1 space-y-2">
              {activityFeedTab === "logins" && (
                <>
                  {filteredLoginEvents.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                      <LogIn className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Aucune connexion enregistrée sur cette période
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Les prochaines connexions d'étudiants et d'administrateurs s'afficheront ici.
                      </p>
                    </div>
                  ) : (
                    filteredLoginEvents.map((ev) => {
                      const matchedUser = findUserByIdOrEmail(ev.userId, ev.userEmail);
                      const initials = (ev.userNom || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("");

                      return (
                        <div
                          key={ev.id}
                          onClick={() => matchedUser && setSelectedUser(matchedUser)}
                          className={`p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 flex items-center justify-between gap-3 transition-colors ${
                            matchedUser
                              ? "hover:border-blue-300 dark:hover:border-blue-500/50 cursor-pointer"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initials || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {ev.userNom}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                {ev.userEmail}
                              </div>
                              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                                {ev.actionType === "REGISTER"
                                  ? "Nouvelle inscription & connexion"
                                  : "S'est connecté à la plateforme"}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                              {formatActivityDateTime(ev.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {ev.userRole === "Etudiant" ? "Étudiant" : ev.userRole}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activityFeedTab === "downloads" && (
                <>
                  {filteredDownloadEvents.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                      <Download className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Aucun téléchargement nominatif sur cette période
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Dès qu'un étudiant télécharge un PDF, son nom et l'épreuve apparaissent ici.
                      </p>
                    </div>
                  ) : (
                    filteredDownloadEvents.map((ev) => {
                      const matchedUser = findUserByIdOrEmail(ev.userId, ev.userEmail);
                      const initials = (ev.userNom || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("");

                      return (
                        <div
                          key={ev.id}
                          onClick={() => matchedUser && setSelectedUser(matchedUser)}
                          className={`p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 flex items-start justify-between gap-3 transition-colors ${
                            matchedUser
                              ? "hover:border-blue-300 dark:hover:border-blue-500/50 cursor-pointer"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-700 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {initials || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {ev.userNom}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                {ev.userEmail}
                              </div>
                              <div className="text-[11px] text-blue-700 dark:text-blue-300 font-semibold mt-1 line-clamp-1">
                                A téléchargé : {ev.targetTitle || ev.description}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                              {formatActivityDateTime(ev.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              PDF Téléchargé
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {activityFeedTab === "contributions" && (
                <>
                  {filteredContributionEvents.length === 0 ? (
                    <div className="py-12 px-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
                      <Upload className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Aucune contribution soumise sur cette période
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Les dépôts d'épreuves soumis par les étudiants s'afficheront ici.
                      </p>
                    </div>
                  ) : (
                    filteredContributionEvents.map((ev) => {
                      const matchedUser = findUserByIdOrEmail(ev.userId, ev.userEmail);
                      const initials = (ev.userNom || "U")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("");

                      return (
                        <div
                          key={ev.id}
                          onClick={() => matchedUser && setSelectedUser(matchedUser)}
                          className={`p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70 flex items-start justify-between gap-3 transition-colors ${
                            matchedUser
                              ? "hover:border-blue-300 dark:hover:border-blue-500/50 cursor-pointer"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                              {initials || "U"}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                {ev.userNom}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                                {ev.userEmail}
                              </div>
                              <div className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold mt-1 line-clamp-1">
                                Sujet : {ev.targetTitle || ev.description}
                              </div>
                              {(ev.matiere || ev.statut) && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  {[ev.matiere, ev.typeEpreuve, ev.statut].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                              {formatActivityDateTime(ev.timestamp)}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              {ev.statut || "Contribution"}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </Reveal>
      </div>

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
                  Survolez un segment ou une ligne pour inspecter ses métriques détaillées
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 tabular-nums">
                {publishedDocsCount} sujet{publishedDocsCount > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center my-auto">
              {/* Donut SVG + Infobulle Interactive au Survol */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center relative">
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
                      const isHovered = hoveredExamType === seg.type;
                      const isDimmed = hoveredExamType !== null && !isHovered;
                      return (
                        <circle
                          key={seg.type}
                          cx="70"
                          cy="70"
                          r={radius}
                          fill="transparent"
                          stroke={seg.stroke}
                          strokeWidth={isHovered ? "20" : "16"}
                          strokeOpacity={isDimmed ? 0.35 : 1}
                          strokeDasharray={`${dashLength} ${circumference}`}
                          strokeDashoffset={dashOffset}
                          onMouseEnter={() => setHoveredExamType(seg.type)}
                          onMouseLeave={() => setHoveredExamType(null)}
                          className="transition-all duration-300 cursor-pointer"
                        />
                      );
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                    {activeHoveredTypeData ? (
                      <>
                        <span
                          className="text-xs font-extrabold uppercase tracking-wider"
                          style={{ color: activeHoveredTypeData.stroke }}
                        >
                          {activeHoveredTypeData.type}
                        </span>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none mt-0.5">
                          {activeHoveredTypeData.count}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums mt-1">
                          {activeHoveredTypeData.pct}% • {activeHoveredTypeData.downloads} téléch.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums leading-none">
                          {publishedDocsCount}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                          Épreuves
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Infobulle flottante sous le Donut au survol */}
                <div className="w-full min-h-[74px] mt-3 flex items-center justify-center">
                  {activeHoveredTypeData ? (
                    <div className="w-full bg-slate-900 dark:bg-slate-950 text-slate-100 border border-slate-700/80 rounded-xl p-2.5 shadow-lg text-[11px] space-y-1 transition-all">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                        <span className="font-bold text-white flex items-center gap-1.5 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: activeHoveredTypeData.stroke }}
                          />
                          <span className="truncate">{activeHoveredTypeData.label}</span>
                        </span>
                        <span className="font-mono font-bold text-blue-300 tabular-nums shrink-0">
                          {activeHoveredTypeData.pct}% du fonds
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 pt-0.5 text-[10px] font-mono tabular-nums">
                        <div>
                          <span className="text-slate-400 block font-sans">Sujets</span>
                          <strong className="text-white">{activeHoveredTypeData.count}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-sans">Téléch.</span>
                          <strong className="text-white">
                            {activeHoveredTypeData.downloads} ({activeHoveredTypeData.downloadSharePct}%)
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-sans">Moy./sujet</span>
                          <strong className="text-emerald-300">{activeHoveredTypeData.avgDownloads}</strong>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center italic px-2">
                      Survolez un anneau ou un type d'évaluation pour afficher l'infobulle détaillée
                    </div>
                  )}
                </div>
              </div>

              {/* Légende détaillée interactive avec infobulle au survol */}
              <div className="sm:col-span-7 space-y-2">
                {typeDistribution.map((item) => {
                  const isHovered = hoveredExamType === item.type;
                  return (
                    <div
                      key={item.type}
                      onMouseEnter={() => setHoveredExamType(item.type)}
                      onMouseLeave={() => setHoveredExamType(null)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isHovered
                          ? "bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-500 shadow-xs"
                          : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-3 h-3 rounded-sm shrink-0 ${item.bg}`} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.label}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {item.downloads} téléch. ({item.downloadSharePct}%) • Moy. {item.avgDownloads}/sujet
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
                  );
                })}
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
                  Survolez chaque barre pour consulter le détail annuel et semestriel
                </p>
              </div>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            {/* Histogramme vertical par année académique avec infobulle au survol */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Épreuves par Année Académique
              </div>

              {academicYearStats.list.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  Aucune donnée annuelle disponible
                </div>
              ) : (
                <div className="h-44 pt-6 pb-2 px-3 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl flex items-end justify-around gap-3">
                  {academicYearStats.list.map((yr) => {
                    const heightPct = Math.max(14, Math.round((yr.count / academicYearStats.maxCount) * 100));
                    return (
                      <div
                        key={yr.year}
                        className="relative flex-1 max-w-[76px] h-full flex flex-col items-center justify-end group cursor-pointer"
                      >
                        {/* Infobulle interactive au survol de la barre annuelle */}
                        <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-30 w-48 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-100 border border-slate-700/80 rounded-xl p-2.5 shadow-xl text-[11px] space-y-1">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-extrabold text-white">{yr.year}</span>
                            <span className="font-mono text-[10px] font-bold text-blue-300 tabular-nums">
                              {yr.pctOfCatalog}% du fonds
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums text-[10px]">
                            <span className="text-slate-400 font-sans">Épreuves :</span>
                            <strong className="text-white">{yr.count} sujet(s)</strong>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums text-[10px]">
                            <span className="text-slate-400 font-sans">Téléchargements :</span>
                            <strong className="text-emerald-300">{yr.downloads}</strong>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums text-[10px]">
                            <span className="text-slate-400 font-sans">Moyenne/sujet :</span>
                            <strong className="text-white">{yr.avgDownloads}</strong>
                          </div>
                          <div className="flex items-center justify-between font-mono tabular-nums text-[10px] pt-0.5 border-t border-slate-800/80 text-sky-300">
                            <span className="font-sans">Semestres :</span>
                            <span>S1: {yr.s1Count} • S2: {yr.s2Count}</span>
                          </div>
                        </div>

                        <span className="text-[11px] font-extrabold text-blue-900 dark:text-blue-300 tabular-nums mb-1 group-hover:scale-110 transition-transform">
                          {yr.count}
                        </span>
                        <div className="w-full bg-slate-200/70 dark:bg-slate-700/50 rounded-t-lg flex items-end overflow-hidden h-24 ring-0 group-hover:ring-2 group-hover:ring-blue-500/50 transition-all">
                          <div
                            className="w-full bg-blue-900 dark:bg-blue-600 group-hover:bg-blue-600 dark:group-hover:bg-blue-400 rounded-t-lg transition-all duration-300"
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mt-1.5 truncate max-w-full group-hover:text-blue-700 dark:group-hover:text-blue-300">
                          {yr.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Jauge Comparative Semestre 1 vs Semestre 2 avec infobulles au survol */}
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

              <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full flex relative">
                {/* Segment Semestre 1 */}
                <div
                  className="h-full bg-blue-900 dark:bg-blue-500 hover:brightness-110 transition-all duration-300 rounded-l-full relative group cursor-pointer"
                  style={{ width: `${semesterStats.s1Pct}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-48 bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700 rounded-xl p-2.5 shadow-xl text-[11px] space-y-1">
                    <div className="font-extrabold text-blue-300 border-b border-slate-800 pb-1">
                      Semestre 1 ({semesterStats.s1Pct}%)
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Sujets publiés :</span>
                      <strong>{semesterStats.s1Count}</strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Téléchargements :</span>
                      <strong>{semesterStats.s1Downloads}</strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Moy./sujet :</span>
                      <strong className="text-emerald-300">{semesterStats.s1AvgDownloads}</strong>
                    </div>
                  </div>
                </div>

                {/* Segment Semestre 2 */}
                <div
                  className="h-full bg-sky-500 hover:brightness-110 transition-all duration-300 rounded-r-full relative group cursor-pointer"
                  style={{ width: `${100 - semesterStats.s1Pct}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-48 bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700 rounded-xl p-2.5 shadow-xl text-[11px] space-y-1">
                    <div className="font-extrabold text-sky-300 border-b border-slate-800 pb-1">
                      Semestre 2 ({semesterStats.s2Pct}%)
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Sujets publiés :</span>
                      <strong>{semesterStats.s2Count}</strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Téléchargements :</span>
                      <strong>{semesterStats.s2Downloads}</strong>
                    </div>
                    <div className="flex justify-between font-mono tabular-nums text-[10px]">
                      <span className="text-slate-400 font-sans">Moy./sujet :</span>
                      <strong className="text-emerald-300">{semesterStats.s2AvgDownloads}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                <span>Part S1 : <strong>{semesterStats.s1Pct}%</strong> (Moy. {semesterStats.s1AvgDownloads}/sujet)</span>
                <span>Part S2 : <strong>{semesterStats.s2Pct}%</strong> (Moy. {semesterStats.s2AvgDownloads}/sujet)</span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 5. DIAGRAMME DE COUVERTURE PAR MATIÈRE (BARRES HORIZONTALES & INFOBULLES DÉTAILLÉES) */}
      <Reveal delay={0.18}>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <span>Couverture Documentaire par Matière (Niveau 1 Ingénieur)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Survolez une matière pour afficher la ventilation par type d'épreuve (CC, SN, TD, TP) et ses statistiques de téléchargement
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
              const typeBreakdownEntries = Object.entries(subj.typeCounts || {});
              return (
                <div
                  key={subj.id}
                  className="relative group p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 hover:border-blue-400 dark:hover:border-blue-500/60 transition-all space-y-2 cursor-pointer"
                >
                  {/* Infobulle interactive au survol de la matière */}
                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30 w-64 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-md text-slate-100 border border-slate-700/80 rounded-xl p-3 shadow-xl text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        {subj.code}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {subj.semestre}
                      </span>
                    </div>
                    <div className="font-bold text-white text-xs leading-snug">
                      {subj.nom}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] font-mono tabular-nums border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-400 block font-sans">Épreuves</span>
                        <strong className="text-white">{subj.realDocsCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans">Téléch.</span>
                        <strong className="text-blue-300">
                          {subj.downloads} ({subj.downloadSharePct}%)
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-sans">Moy./sujet</span>
                        <strong className="text-emerald-300">{subj.avgDownloads}</strong>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-800/80 text-[10px]">
                      <span className="text-slate-400 font-semibold">Ventilation : </span>
                      {typeBreakdownEntries.length > 0 ? (
                        <span className="font-mono font-bold text-amber-300 tabular-nums">
                          {typeBreakdownEntries.map(([t, c]) => `${t}: ${c}`).join(" • ")}
                        </span>
                      ) : (
                        <span className="text-amber-400 italic">Aucun sujet publié</span>
                      )}
                    </div>
                  </div>

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
                          ? "bg-blue-900 dark:bg-blue-500 group-hover:bg-blue-600 dark:group-hover:bg-blue-400"
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
