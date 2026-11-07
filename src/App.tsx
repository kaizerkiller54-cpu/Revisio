import React, { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { PageTransition } from "./components/motion";
import { User, DocumentModel, MatiereModel, ContributionModel, DashboardStats } from "./types";
import {
  getMeApi,
  logoutApi,
  getSubjectsApi,
  getDocumentsApi,
  getHiddenDocumentsApi,
  getContributionsApi,
  getAdminStatsApi,
  downloadDocumentFileApi,
  getUserFavoritesApi,
  toggleUserFavoriteApi
} from "./lib/api";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PdfViewerModal } from "./components/PdfViewerModal";
import { CookieConsent } from "./components/CookieConsent";
import { DownloadStatusToast, DownloadToastState } from "./components/DownloadStatusToast";
import { HomeView } from "./views/HomeView";
import { SubjectsView } from "./views/SubjectsView";
import { ExamsView } from "./views/ExamsView";
import { ContributeView } from "./views/ContributeView";
import { AdminDashboardView } from "./views/AdminDashboardView";
import { AdminDocumentsView } from "./views/AdminDocumentsView";
import { SuperAdminAuditView } from "./views/SuperAdminAuditView";
import { UserActivityLogView } from "./views/UserActivityLogView";
import { LoginView } from "./views/LoginView";
import { RegisterView } from "./views/RegisterView";
import { SettingsView } from "./views/SettingsView";
import { FavoritesView } from "./views/FavoritesView";
import { PlanningView } from "./views/PlanningView";

const DEFAULT_DOCUMENTS: DocumentModel[] = [
  {
    id: "doc-1",
    titre: "Épreuve de Contrôle Continu (CC) - Analyse 1",
    matiere: "Analyse 1",
    matiereId: "mat-3",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "CC_Analyse1_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-10-15T09:00:00.000Z",
    dateAjout: "2026-10-15T09:00:00.000Z",
    telechargementsCount: 142,
  },
  {
    id: "doc-2",
    titre: "Examen de Session Normale - Algèbre linéaire",
    matiere: "Algèbre linéaire",
    matiereId: "mat-2",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "SN_Algebre_Lineaire_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-02-10T14:00:00.000Z",
    dateAjout: "2026-02-10T14:00:00.000Z",
    telechargementsCount: 198,
  },
  {
    id: "doc-3",
    titre: "Épreuve de Contrôle Continu (CC) - Électrocinétique",
    matiere: "Électrocinétique",
    matiereId: "mat-4",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "CC_Electrocinetique_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-11-02T10:30:00.000Z",
    dateAjout: "2026-11-02T10:30:00.000Z",
    telechargementsCount: 86,
  },
  {
    id: "doc-4",
    titre: "Travaux Dirigés & Corrigé - Mesures Physiques",
    matiere: "Mesures Physiques",
    matiereId: "mat-6",
    semestre: "Semestre 1",
    typeEpreuve: "TD",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "TD_Mesures_Physiques_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-10-20T11:00:00.000Z",
    dateAjout: "2026-10-20T11:00:00.000Z",
    telechargementsCount: 64,
  },
  {
    id: "doc-5",
    titre: "Examen de Session Normale - Mécanique du Point",
    matiere: "Mécanique",
    matiereId: "mat-7",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    fichierUrl: "",
    fichierNom: "SN_Mecanique_2024-2025_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2025-02-14T08:30:00.000Z",
    dateAjout: "2025-02-14T08:30:00.000Z",
    telechargementsCount: 215,
  },
  {
    id: "doc-6",
    titre: "Épreuve de Contrôle Continu (CC) - Communication",
    matiere: "Communication",
    matiereId: "mat-1",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "CC_Communication_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-11-05T15:00:00.000Z",
    dateAjout: "2026-11-05T15:00:00.000Z",
    telechargementsCount: 52,
  },
  {
    id: "doc-7",
    titre: "Cours & Support de Révision - Mécatronique",
    matiere: "Mécatronique",
    matiereId: "mat-8",
    semestre: "Semestre 1",
    typeEpreuve: "Cours",
    anneeAcademique: "2025-2026",
    fichierUrl: "",
    fichierNom: "Cours_Mecatronique_2025-2026_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2026-10-01T08:00:00.000Z",
    dateAjout: "2026-10-01T08:00:00.000Z",
    telechargementsCount: 110,
  },
  {
    id: "doc-8",
    titre: "Examen de Session Normale - Algorithmique & C",
    matiere: "Algorithmique",
    matiereId: "mat-15",
    semestre: "Semestre 2",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    fichierUrl: "",
    fichierNom: "SN_Algorithmique_2024-2025_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2025-06-18T10:00:00.000Z",
    dateAjout: "2025-06-18T10:00:00.000Z",
    telechargementsCount: 178,
  },
  {
    id: "doc-9",
    titre: "Épreuve de Contrôle Continu (CC) - Analyse 2",
    matiere: "Analyse 2",
    matiereId: "mat-11",
    semestre: "Semestre 2",
    typeEpreuve: "CC",
    anneeAcademique: "2024-2025",
    fichierUrl: "",
    fichierNom: "CC_Analyse2_2024-2025_ISJ.pdf",
    statut: "Publié",
    visible: true,
    datePublication: "2025-05-12T09:00:00.000Z",
    dateAjout: "2025-05-12T09:00:00.000Z",
    telechargementsCount: 130,
  },
];

const DEFAULT_MATIERES: MatiereModel[] = [
  { id: "mat-1", nom: "Communication", code: "COMM101", semestre: "Semestre 1", description: "Techniques de communication écrite et orale.", countDocs: 1 },
  { id: "mat-2", nom: "Algèbre linéaire", code: "MATH101", semestre: "Semestre 1", description: "Espaces vectoriels, matrices, applications linéaires.", countDocs: 1 },
  { id: "mat-3", nom: "Analyse 1", code: "MATH102", semestre: "Semestre 1", description: "Suites numériques, dérivation, calcul d'intégrales.", countDocs: 1 },
  { id: "mat-4", nom: "Électrocinétique", code: "PHYS101", semestre: "Semestre 1", description: "Circuits électriques, lois de Kirchhoff, filtres.", countDocs: 1 },
  { id: "mat-5", nom: "Anglais", code: "LANG101", semestre: "Semestre 1", description: "Anglais scientifique et technique I.", countDocs: 0 },
  { id: "mat-6", nom: "Mesures Physiques", code: "PHYS102", semestre: "Semestre 1", description: "Calculs d'incertitudes, métrologie, instruments.", countDocs: 1 },
  { id: "mat-7", nom: "Mécanique", code: "PHYS103", semestre: "Semestre 1", description: "Mécanique du point et du solide, cinématique.", countDocs: 1 },
  { id: "mat-8", nom: "Mécatronique", code: "MTRK101", semestre: "Semestre 1", description: "Systèmes mécatroniques intégrés, capteurs.", countDocs: 1 },
  { id: "mat-9", nom: "Réflexion humaine", code: "HUM201", semestre: "Semestre 2", description: "Éthique de l'ingénieur, réflexion critique.", countDocs: 0 },
  { id: "mat-10", nom: "Géométrie", code: "MATH201", semestre: "Semestre 2", description: "Géométrie euclidienne dans l'espace.", countDocs: 0 },
  { id: "mat-11", nom: "Analyse 2", code: "MATH202", semestre: "Semestre 2", description: "Séries numériques, Fourier, intégrales multiples.", countDocs: 1 },
  { id: "mat-12", nom: "Électrostatique/magnétostatique", code: "PHYS201", semestre: "Semestre 2", description: "Champs et potentiels électrostatiques.", countDocs: 0 },
  { id: "mat-13", nom: "Anglais", code: "LANG202", semestre: "Semestre 2", description: "Anglais technique II, présentations.", countDocs: 0 },
  { id: "mat-14", nom: "Chimie", code: "CHIM201", semestre: "Semestre 2", description: "Structure atomique, liaisons chimiques.", countDocs: 0 },
  { id: "mat-15", nom: "Algorithmique", code: "INFO201", semestre: "Semestre 2", description: "Conception d'algorithmes, complexité.", countDocs: 1 },
  { id: "mat-16", nom: "IDFOT", code: "INFO202", semestre: "Semestre 2", description: "Initiation aux Développements et Formations Outils.", countDocs: 0 },
];

function updateMatieresCounts(mats: MatiereModel[], docs: DocumentModel[]): MatiereModel[] {
  return mats.map((m) => {
    const cnt = docs.filter(
      (d) => d.matiereId === m.id || d.matiere?.toLowerCase() === m.nom?.toLowerCase()
    ).length;
    return { ...m, countDocs: cnt };
  });
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem("isj_app_theme");
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    return "light";
  });
  const [favorites, setFavorites] = useState<string[]>([]);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadToast, setDownloadToast] = useState<DownloadToastState | null>(null);

  const [documents, setDocuments] = useState<DocumentModel[]>(DEFAULT_DOCUMENTS);
  const [hiddenDocuments, setHiddenDocuments] = useState<DocumentModel[]>([]);
  const [matieres, setMatieres] = useState<MatiereModel[]>(() => updateMatieresCounts(DEFAULT_MATIERES, DEFAULT_DOCUMENTS));
  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);

  const [previewDocument, setPreviewDocument] = useState<DocumentModel | null>(null);

  const [examsFilters, setExamsFilters] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoadError, setDataLoadError] = useState(false);
  const [consentReminderKey, setConsentReminderKey] = useState(0);

  // Load initial datasets from API
  const loadData = async () => {
    try {
      const me = await getMeApi().catch(() => null);
      if (me) {
        setUser(me);
      } else {
        setUser(null);
      }

      const docsData = await getDocumentsApi({ statut: "Publié" }).catch(() => []);
      const subjectsData = await getSubjectsApi().catch(() => []);
      const contribsData = await getContributionsApi().catch(() => []);
      const statsData = me?.role === "SuperAdministrateur" ? await getAdminStatsApi().catch(() => null) : null;
      const hiddenData = me?.role === "SuperAdministrateur" ? await getHiddenDocumentsApi().catch(() => []) : [];

      const activeDocs = Array.isArray(docsData) && docsData.length > 0 ? docsData : DEFAULT_DOCUMENTS;
      const activeSubjects = Array.isArray(subjectsData) && subjectsData.length > 0 ? subjectsData : DEFAULT_MATIERES;

      setDocuments(activeDocs);
      setMatieres(updateMatieresCounts(activeSubjects, activeDocs));

      if (Array.isArray(hiddenData)) setHiddenDocuments(hiddenData);
      if (Array.isArray(contribsData)) setContributions(contribsData);
      if (statsData) setAdminStats(statsData);

      setDataLoadError(false);
    } catch (err) {
      console.error("Erreur de chargement des données:", err);
      setDataLoadError(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync favorites strictly for the currently authenticated user
  useEffect(() => {
    // Purge any legacy shared favorites key to prevent cross-account pollution
    try {
      localStorage.removeItem("isj_favorites");
    } catch {}

    if (user?.id) {
      const userKey = `revisio_user_favs_${user.id}`;
      // 1. Read immediate isolated cache for this specific user
      try {
        const cached = localStorage.getItem(userKey);
        if (cached) {
          setFavorites(JSON.parse(cached));
        } else {
          setFavorites([]);
        }
      } catch {
        setFavorites([]);
      }

      // 2. Fetch fresh user favorites from their own backend account
      getUserFavoritesApi()
        .then((serverFavs) => {
          if (Array.isArray(serverFavs)) {
            setFavorites(serverFavs);
            try {
              localStorage.setItem(userKey, JSON.stringify(serverFavs));
            } catch {}
          }
        })
        .catch(() => undefined);
    } else {
      // Unauthenticated: always empty
      setFavorites([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const token = localStorage.getItem("isj_auth_token");
    if (!token) return;
    const seenKey = `revisio_seen_publications_${user.id}`;
    let cancelled = false;

    fetch("/api/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : [])
      .then((items: Array<{ id: string; titre: string; message: string; userId: string; date: string }>) => {
        if (cancelled) return;
        const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || "[]"));
        const fresh = items.filter((item) => item.userId === "ALL" && !seen.has(item.id) && Date.now() - new Date(item.date).getTime() < 30 * 24 * 60 * 60 * 1000);
        if (fresh.length) {
          const latest = fresh[0];
          new Notification(latest.titre, { body: fresh.length > 1 ? `${latest.message} (+${fresh.length - 1} autre(s))` : latest.message });
          const updated = new Set([...seen, ...fresh.map((item) => item.id)]);
          localStorage.setItem(seenKey, JSON.stringify([...updated].slice(-200)));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleNavigate = (tab: string, filterState?: any) => {
    if (!user && tab !== "login" && tab !== "register") {
      setAuthNotice("Connexion Obligatoire : Veuillez vous connecter ou créer un compte pour accéder aux ressources d'épreuves.");
      setActiveTab("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (filterState && typeof filterState === "object") {
      const normalizedFilters: any = {};
      if (typeof filterState.search === "string") normalizedFilters.search = filterState.search;
      if (typeof filterState.matiere === "string") normalizedFilters.matiere = filterState.matiere;
      else if (filterState.matiere && typeof filterState.matiere === "object" && typeof filterState.matiere.matiere === "string") {
        normalizedFilters.matiere = filterState.matiere.matiere;
      }
      if (typeof filterState.semestre === "string") normalizedFilters.semestre = filterState.semestre;
      if (typeof filterState.typeEpreuve === "string") normalizedFilters.typeEpreuve = filterState.typeEpreuve;
      if (typeof filterState.anneeAcademique === "string") normalizedFilters.anneeAcademique = filterState.anneeAcademique;
      setExamsFilters(normalizedFilters);
    } else {
      setExamsFilters({});
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      setFavorites([]);
      localStorage.removeItem("isj_auth_token");
      setActiveTab("login");
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("isj_app_theme", newTheme);
  };

  const handleToggleFavorite = (doc: DocumentModel) => {
    if (!user) {
      setAuthNotice(
        "Connexion Requise : Veuillez vous connecter ou créer un compte pour marquer des épreuves comme favorites."
      );
      setActiveTab("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const currentUserId = user.id;
    const userKey = `revisio_user_favs_${currentUserId}`;

    // 1. Optimistic update in state and user-specific local storage
    setFavorites((prev) => {
      const isFav = prev.includes(doc.id);
      const updated = isFav ? prev.filter((id) => id !== doc.id) : [...prev, doc.id];
      try {
        localStorage.setItem(userKey, JSON.stringify(updated));
      } catch (err) {
        console.error("Erreur de sauvegarde locale des favoris:", err);
      }
      return updated;
    });

    // 2. Synchronize with the student's personal backend account
    toggleUserFavoriteApi(doc.id)
      .then((res) => {
        if (res && Array.isArray(res.favorites)) {
          setFavorites(res.favorites);
          try {
            localStorage.setItem(userKey, JSON.stringify(res.favorites));
          } catch {}
        }
      })
      .catch((err) => {
        console.error("Erreur synchronisation favoris serveur:", err);
      });
  };

  const handleDownloadDocument = async (doc: DocumentModel) => {
    if (!user) {
      setAuthNotice(
        "Accès Téléchargement Restreint : Vous devez être connecté ou créer un compte pour télécharger les épreuves au format PDF."
      );
      setActiveTab("register");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (downloadingDocId) return; // Évite les doubles clics simultanés

    setDownloadingDocId(doc.id);
    setDownloadToast({
      id: doc.id,
      title: doc.titre,
      status: "preparing",
    });

    try {
      const result = await downloadDocumentFileApi(doc.id);
      if (!result) {
        setDownloadToast({
          id: doc.id,
          title: doc.titre,
          status: "error",
          error: "Impossible de récupérer le document. Veuillez vérifier votre connexion et réessayer.",
        });
        return;
      }

      const filename = result.filename || doc.fichierNom || `${doc.titre}.pdf`;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      // Optimistically increment download count
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, telechargementsCount: (d.telechargementsCount || 0) + 1 } : d
        )
      );

      setDownloadToast({
        id: doc.id,
        title: doc.titre,
        filename,
        status: "success",
      });
    } catch (err: any) {
      console.error("Erreur lors du téléchargement:", err);
      setDownloadToast({
        id: doc.id,
        title: doc.titre,
        status: "error",
        error: err?.message || "Une erreur est survenue lors du téléchargement du document.",
      });
    } finally {
      setDownloadingDocId(null);
    }
  };

  const userContributions = contributions.filter(
    (c) => c.utilisateurEmail?.toLowerCase() === user?.email?.toLowerCase()
  );

  const isDarkMode = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);
  const isAuthPage = activeTab === "login" || activeTab === "register";

  return (
    <MotionConfig reducedMotion="user">
    <div
      className={`min-h-[100svh] w-full overflow-x-clip flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
        isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Navbar - Hidden on Auth pages */}
      {!isAuthPage && (
        <Navbar
          user={user}
          activeTab={activeTab}
          setActiveTab={handleNavigate}
          onLogout={handleLogout}
          favoritesCount={favorites.length}
        />
      )}

      {/* Main Container */}
      <main className={`flex-1 ${isAuthPage ? "w-full p-0 flex flex-col justify-center" : "max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8"}`}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-semibold">
              Chargement des anciennes épreuves de l'ISJ...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={activeTab}>
            {activeTab === "home" && (
              <HomeView
                documents={documents}
                matieres={matieres}
                dataUnavailable={dataLoadError}
                onNavigate={handleNavigate}
                onViewDoc={(doc) => setPreviewDocument(doc)}
                onDownloadDoc={handleDownloadDocument}
                favoriteIds={favorites}
                onToggleFavorite={handleToggleFavorite}
                downloadingDocId={downloadingDocId}
              />
            )}

            {activeTab === "subjects" && (
              <SubjectsView
                matieres={matieres}
                onSelectMatiere={(matiereNom, semestre) =>
                  handleNavigate("exams", { matiere: matiereNom, semestre })
                }
              />
            )}

            {activeTab === "exams" && (
              <ExamsView
                documents={documents}
                onViewDoc={(doc) => setPreviewDocument(doc)}
                onDownloadDoc={handleDownloadDocument}
                favoriteIds={favorites}
                onToggleFavorite={handleToggleFavorite}
                downloadingDocId={downloadingDocId}
                initialFilters={examsFilters}
              />
            )}

            {activeTab === "favorites" && (
              <FavoritesView
                documents={documents}
                favoriteIds={favorites}
                onToggleFavorite={handleToggleFavorite}
                onViewDoc={(doc) => setPreviewDocument(doc)}
                onDownloadDoc={handleDownloadDocument}
                downloadingDocId={downloadingDocId}
                onNavigateToExams={() => handleNavigate("exams")}
              />
            )}

            {activeTab === "planning" && (
              <PlanningView
                user={user}
                documents={documents}
                matieres={matieres}
                onNavigateToExams={(filters) =>
                  handleNavigate("exams", typeof filters === "string" ? { matiere: filters } : filters)
                }
                onNavigateToLogin={() => setActiveTab("login")}
              />
            )}

            {activeTab === "contribute" && (
              <ContributeView
                user={user}
                onNavigateToLogin={() => setActiveTab("login")}
                userContributions={userContributions}
                onContributionSuccess={loadData}
              />
            )}

            {(activeTab === "admin-dashboard") && user?.role === "SuperAdministrateur" && (
              <AdminDashboardView
                stats={adminStats}
                statsUnavailable={!adminStats}
                onNavigateToModeration={() => setActiveTab("admin-documents")}
              />
            )}

            {(activeTab === "admin-documents") && (user?.role === "Administrateur" || user?.role === "SuperAdministrateur") && (
              <AdminDocumentsView
                contributions={contributions}
                documents={documents}
                hiddenDocuments={hiddenDocuments}
                isSuperAdmin={user?.role === "SuperAdministrateur"}
                onRefreshData={loadData}
                onPreviewPdf={(doc) => setPreviewDocument(doc)}
              />
            )}

            {activeTab === "super-admin-audit" && user?.role === "SuperAdministrateur" && (
              <SuperAdminAuditView
                currentUser={user}
                onRefreshData={loadData}
              />
            )}

            {activeTab === "activity-log" && (
              <UserActivityLogView
                currentUser={user}
              />
            )}

            {activeTab === "settings" && (
              <SettingsView
                user={user}
                currentTheme={theme}
                onChangeTheme={handleThemeChange}
                onUpdateUser={(updated) => setUser(updated)}
                onNavigateToRegister={() => setActiveTab("register")}
                onNavigateToFavorites={() => handleNavigate("favorites")}
                favoritesCount={favorites.length}
              />
            )}

            {activeTab === "login" && (
              <LoginView
                onLoginSuccess={(loggedUser, token) => {
                  setUser(loggedUser);
                  localStorage.setItem("isj_auth_token", token);
                  if (typeof Notification !== "undefined" && Notification.permission === "default") {
                    Notification.requestPermission().catch(() => undefined);
                  }
                  loadData();
                  setActiveTab("home");
                  setAuthNotice(null);
                  setConsentReminderKey((k) => k + 1);
                }}
                onNavigateToRegister={() => {
                  setAuthNotice(null);
                  setActiveTab("register");
                }}
                redirectReason={authNotice}
              />
            )}

            {activeTab === "register" && (
              <RegisterView
                onRegisterSuccess={(registeredUser, token) => {
                  setUser(registeredUser);
                  localStorage.setItem("isj_auth_token", token);
                  if (typeof Notification !== "undefined" && Notification.permission === "default") {
                    Notification.requestPermission().catch(() => undefined);
                  }
                  loadData();
                  setActiveTab("home");
                  setAuthNotice(null);
                  setConsentReminderKey((k) => k + 1);
                }}
                onNavigateToLogin={() => setActiveTab("login")}
                redirectReason={authNotice}
              />
            )}
            </PageTransition>
          </AnimatePresence>
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* PDF View Modal */}
      <PdfViewerModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onDownload={handleDownloadDocument}
        isDownloading={previewDocument?.id === downloadingDocId}
      />

      {/* Bannière de consentement aux cookies (1ère visite) */}
      <CookieConsent reminderKey={consentReminderKey} />

      {/* Toast flottant de progression de téléchargement */}
      <DownloadStatusToast toast={downloadToast} onDismiss={() => setDownloadToast(null)} />
    </div>
    </MotionConfig>
  );
}

