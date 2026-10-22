import React, { useState, useEffect } from "react";
import { AnimatePresence, MotionConfig } from "motion/react";
import { PageTransition } from "./components/motion";
import { User, DocumentModel, MatiereModel, ContributionModel, DashboardStats } from "./types";
import {
  getMeApi,
  logoutApi,
  getSubjectsApi,
  getDocumentsApi,
  getContributionsApi,
  getAdminStatsApi,
  downloadDocumentFileApi
} from "./lib/api";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { PdfViewerModal } from "./components/PdfViewerModal";
import { CookieConsent } from "./components/CookieConsent";
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem("isj_app_theme");
    if (saved === "dark" || saved === "light" || saved === "system") return saved;
    return "light";
  });

  const [documents, setDocuments] = useState<DocumentModel[]>([]);
  const [matieres, setMatieres] = useState<MatiereModel[]>([]);
  const [contributions, setContributions] = useState<ContributionModel[]>([]);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);

  const [previewDocument, setPreviewDocument] = useState<DocumentModel | null>(null);

  const [examsFilters, setExamsFilters] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [consentReminderKey, setConsentReminderKey] = useState(0);

  // Load initial datasets from API
  const loadData = async () => {
    try {
      const me = await getMeApi();
      if (me) {
        setUser(me);
      } else {
        setUser(null);
        setActiveTab("login");
      }

      const [docsData, subjectsData, contribsData, statsData] = await Promise.all([
        getDocumentsApi({ statut: "Publié" }),
        getSubjectsApi(),
        getContributionsApi().catch(() => []),
        getAdminStatsApi().catch(() => null),
      ]);

      setDocuments(docsData);
      setMatieres(subjectsData);
      setContributions(contribsData);
      if (statsData) setAdminStats(statsData);
    } catch (err) {
      console.error("Erreur de chargement des données:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleNavigate = (tab: string, filterState?: any) => {
    if (!user && tab !== "login" && tab !== "register") {
      setAuthNotice("Connexion Obligatoire : Veuillez vous connecter ou créer un compte pour accéder aux ressources d'épreuves.");
      setActiveTab("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (filterState) {
      setExamsFilters(filterState);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } finally {
      setUser(null);
      localStorage.removeItem("isj_auth_token");
      setActiveTab("login");
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("isj_app_theme", newTheme);
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

    try {
      const result = await downloadDocumentFileApi(doc.id);
      if (!result) {
        console.error("Échec du téléchargement du document.");
        return;
      }
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.filename || doc.fichierNom || `${doc.titre}.pdf`;
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
    } catch (err) {
      console.error("Erreur lors du téléchargement:", err);
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
      className={`min-h-screen flex flex-col font-sans selection:bg-blue-600 selection:text-white transition-colors duration-300 ${
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
                onNavigate={handleNavigate}
                onViewDoc={(doc) => setPreviewDocument(doc)}
                onDownloadDoc={handleDownloadDocument}
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
                initialFilters={examsFilters}
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

            {(activeTab === "admin-dashboard") && (user?.role === "Administrateur" || user?.role === "SuperAdministrateur") && (
              <AdminDashboardView
                stats={adminStats}
                onNavigateToModeration={() => setActiveTab("admin-documents")}
              />
            )}

            {(activeTab === "admin-documents") && (user?.role === "Administrateur" || user?.role === "SuperAdministrateur") && (
              <AdminDocumentsView
                contributions={contributions}
                documents={documents}
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
              />
            )}

            {activeTab === "login" && (
              <LoginView
                onLoginSuccess={(loggedUser, token) => {
                  setUser(loggedUser);
                  localStorage.setItem("isj_auth_token", token);
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
        user={user}
        onClose={() => setPreviewDocument(null)}
        onDownload={handleDownloadDocument}
      />

      {/* Bannière de consentement aux cookies (1ère visite) */}
      <CookieConsent reminderKey={consentReminderKey} />
    </div>
    </MotionConfig>
  );
}

