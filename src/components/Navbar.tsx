import React, { useState, useEffect } from "react";
import { User } from "../types";
import { NotificationCenter } from "./NotificationCenter";
import { AppLogo } from "./AppLogo";
import {
  ArrowLeft,
  BookOpen,
  Upload,
  LayoutDashboard,
  FileCheck,
  LogIn,
  LogOut,
  UserCheck,
  Menu,
  X,
  Search,
  School,
  FileSearch,
  ShieldAlert,
  History,
  ChevronUp,
  Settings,
  Bookmark,
  Calendar
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenQuickLogin?: () => void;
  favoritesCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  favoritesCount = 0,
}) => {
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 80) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAdmin = user?.role === "Administrateur" || user?.role === "SuperAdministrateur";
  const isSuperAdmin = user?.role === "SuperAdministrateur";

  const handleNavClick = (tab: string) => {
    if (tab !== activeTab) {
      setNavHistory((h) => [...h.slice(-9), activeTab]);
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleBack = () => {
    if (navHistory.length === 0) {
      setActiveTab("home");
      return;
    }
    const next = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setActiveTab(next);
  };

  const handleLogoutClick = () => {
    onLogout();
    setMobileMenuOpen(false);
  };

  return (
    <>
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 2xl:px-8">
        <div className="flex items-center justify-between gap-2 xl:gap-4 h-16">
          {/* Zone 1 : Logo & Brand (Jamais écrasé) */}
          <div
            onClick={() => handleNavClick("home")}
            className="cursor-pointer shrink-0 pr-1 xl:pr-2"
          >
            <AppLogo size="md" variant="light" showSubtitle={false} />
          </div>

          {/* Zone 2 : Navigation Principale & Administration (Desktop) */}
          <nav
            aria-label="Navigation principale"
            className="hidden lg:flex items-center justify-center flex-1 min-w-0 gap-1.5 xl:gap-2.5"
          >
            {/* Pôle Académique */}
            <div className="flex items-center gap-0.5 xl:gap-1 bg-slate-50/90 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/70 shrink-0">
              <button
                onClick={() => handleNavClick("home")}
                className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "home"
                    ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <School className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Accueil</span>
              </button>

              <button
                onClick={() => handleNavClick("subjects")}
                className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "subjects"
                    ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Matières</span>
              </button>

              <button
                onClick={() => handleNavClick("exams")}
                className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "exams"
                    ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <Search className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Épreuves</span>
              </button>

              <button
                onClick={() => handleNavClick("planning")}
                className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "planning"
                    ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Planning & CC</span>
              </button>

              <button
                onClick={() => handleNavClick("contribute")}
                className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "contribute"
                    ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                }`}
              >
                <Upload className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                <span>Contribuer</span>
              </button>

              {user && (
                <button
                  onClick={() => handleNavClick("favorites")}
                  className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "favorites"
                      ? "bg-blue-900 text-white dark:bg-blue-600 font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0 ${
                      activeTab === "favorites"
                        ? "fill-white text-white"
                        : favoritesCount > 0
                        ? "fill-blue-700 text-blue-700 dark:fill-blue-400 dark:text-blue-400"
                        : ""
                    }`}
                  />
                  <span>Favoris</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all tabular-nums leading-none ${
                      activeTab === "favorites"
                        ? "bg-white text-blue-900"
                        : favoritesCount > 0
                        ? "bg-blue-100 dark:bg-blue-500/25 text-blue-800 dark:text-blue-200"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                    title={`${favoritesCount} épreuve${favoritesCount > 1 ? "s" : ""} favorite${favoritesCount > 1 ? "s" : ""}`}
                  >
                    {favoritesCount}
                  </span>
                </button>
              )}
            </div>

            {/* Pôle Administration (Gouvernance & Modération) */}
            {isAdmin && (
              <div className="flex items-center gap-0.5 xl:gap-1 bg-amber-50/70 dark:bg-slate-800/80 p-1 rounded-xl border border-amber-200/80 dark:border-slate-700 shrink-0">
                {isSuperAdmin && (
                  <button
                    onClick={() => handleNavClick("admin-dashboard")}
                    title="Dashboard Administrateur"
                    className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === "admin-dashboard"
                        ? "bg-amber-600 text-white font-semibold shadow-xs"
                        : "text-amber-900 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-500/15"
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span className="hidden 2xl:inline">Dashboard Admin</span>
                    <span className="2xl:hidden">Admin</span>
                  </button>
                )}

                <button
                  onClick={() => handleNavClick("admin-documents")}
                  title="Modération des documents"
                  className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "admin-documents"
                      ? "bg-amber-600 text-white font-semibold shadow-xs"
                      : "text-amber-900 dark:text-amber-300 hover:bg-amber-100/80 dark:hover:bg-amber-500/15"
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Modération</span>
                </button>

                {isSuperAdmin && (
                  <button
                    onClick={() => handleNavClick("super-admin-audit")}
                    title="Journal d'Audit SuperAdmin"
                    className={`h-9 px-2 xl:px-2.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === "super-admin-audit"
                        ? "bg-blue-900 text-white dark:bg-sky-600 font-semibold shadow-xs"
                        : "text-blue-900 dark:text-sky-300 hover:bg-blue-100/70 dark:hover:bg-sky-500/15"
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span className="hidden 2xl:inline">Journal d'Audit</span>
                    <span className="2xl:hidden">Audit</span>
                  </button>
                )}
              </div>
            )}
          </nav>

          {/* Zone 3 : Outils Personnels, Notifications & Session (Jamais écrasé) */}
          <div className="hidden lg:flex items-center shrink-0 gap-1.5 xl:gap-2">
            {/* Groupe Utilitaires : Journal, Paramètres, Notifications */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleNavClick("activity-log")}
                title={isSuperAdmin ? "Journal d'activité global" : "Mon journal d'activité"}
                className={`h-9 px-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "activity-log"
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 font-semibold ring-2 ring-blue-500/30"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <History className="w-4 h-4 shrink-0" />
                <span className="hidden 2xl:inline">
                  {isSuperAdmin ? "Journal global" : "Mon journal"}
                </span>
              </button>

              <button
                onClick={() => handleNavClick("settings")}
                title="Paramètres de l'application"
                className={`h-9 px-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 font-semibold ring-2 ring-blue-500/30"
                    : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="hidden 2xl:inline">Paramètres</span>
              </button>

              {/* Notification Center */}
              <NotificationCenter currentUser={user} onNavigateTab={handleNavClick} />
            </div>

            {user ? (
              <div className="flex shrink-0 items-center pl-2 ml-0.5 border-l border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  title="Déconnexion du compte"
                  className="h-9 flex items-center gap-1.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/15 dark:hover:bg-red-500/25 dark:text-red-300 font-semibold text-xs border border-red-200/80 dark:border-red-500/30 transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-slate-200 dark:border-slate-700 shrink-0">
                <button
                  onClick={() => handleNavClick("login")}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 transition-colors whitespace-nowrap"
                >
                  Connexion
                </button>
                <button
                  onClick={() => handleNavClick("register")}
                  className="h-9 bg-blue-900 text-white px-4 rounded-xl text-xs font-semibold hover:bg-blue-800 transition-all shadow-xs whitespace-nowrap"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>

          {/* Mobile Actions: Notifications & Menu */}
          <div className="flex items-center lg:hidden space-x-2 shrink-0">
            <NotificationCenter currentUser={user} onNavigateTab={handleNavClick} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg focus:outline-none transition-colors"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Bouton de retour flottant (non statique) */}
      {activeTab !== "home" && (
        <div className="fixed top-[5.25rem] left-3 sm:left-6 z-40 animate-fadeIn">
          <button
            onClick={handleBack}
            className="flex items-center space-x-1.5 p-3 sm:px-4 sm:py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-xl hover:shadow-2xl border border-slate-200/90 dark:border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group ring-1 ring-black/5 cursor-pointer"
            title="Page précédente"
            aria-label="Page précédente"
          >
            <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:-translate-x-1 transition-transform shrink-0" />
            <span className="hidden sm:inline text-xs font-bold tracking-tight">Retour</span>
          </button>
        </div>
      )}

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <>
          {/* Fond semi-transparent pour fermer au clic extérieur */}
          <div
            className="fixed inset-0 top-16 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-40 lg:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shadow-2xl px-3.5 pt-2.5 pb-4 space-y-2.5 animate-fadeIn">
            {/* Carte Utilisateur Compacte */}
            {user && (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {(user.prenom?.[0] || "") + (user.nom?.[0] || "U")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {user.prenom} {user.nom}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                    isAdmin
                      ? "bg-amber-50 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-500/30"
                      : "bg-blue-50 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-500/30"
                  }`}
                >
                  {user.role}
                </span>
              </div>
            )}

            {/* Grille Navigation Principale (2 colonnes pour tout voir sans couper) */}
            <div>
              <div className="px-1 pb-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Navigation & Outils
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleNavClick("home")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "home"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <School className="w-4 h-4 shrink-0" />
                  <span className="truncate">Accueil</span>
                </button>

                <button
                  onClick={() => handleNavClick("subjects")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "subjects"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="truncate">Matières</span>
                </button>

                <button
                  onClick={() => handleNavClick("exams")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "exams"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span className="truncate">Épreuves</span>
                </button>

                <button
                  onClick={() => handleNavClick("planning")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "planning"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="truncate">Planning & CC</span>
                </button>

                <button
                  onClick={() => handleNavClick("contribute")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "contribute"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span className="truncate">Contribuer</span>
                </button>

                {user && (
                  <button
                    onClick={() => handleNavClick("favorites")}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-1.5 border transition-all cursor-pointer ${
                      activeTab === "favorites"
                        ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                        : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Bookmark
                        className={`w-4 h-4 shrink-0 ${
                          activeTab === "favorites"
                            ? "fill-white text-white"
                            : favoritesCount > 0
                            ? "fill-blue-700 text-blue-700 dark:fill-blue-400 dark:text-blue-400"
                            : ""
                        }`}
                      />
                      <span className="truncate">Favoris</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full tabular-nums shrink-0 leading-none ${
                        activeTab === "favorites"
                          ? "bg-white text-blue-900"
                          : favoritesCount > 0
                          ? "bg-blue-100 dark:bg-blue-500/25 text-blue-800 dark:text-blue-200"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {favoritesCount}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => handleNavClick("activity-log")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "activity-log"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <History className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    {isSuperAdmin ? "Journal global" : "Mon journal"}
                  </span>
                </button>

                <button
                  onClick={() => handleNavClick("settings")}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-blue-900 text-white border-blue-900 dark:bg-blue-600 dark:border-blue-500 shadow-xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="truncate">Paramètres</span>
                </button>
              </div>
            </div>

            {/* Section Espace Administration Compacte */}
            {isAdmin && (
              <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 space-y-1.5">
                <div className="px-1 text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                  Espace Administration
                </div>
                <div className={`grid gap-1.5 ${isSuperAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleNavClick("admin-dashboard")}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                        activeTab === "admin-dashboard"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-slate-700"
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="truncate">Dashboard Admin</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleNavClick("admin-documents")}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                      activeTab === "admin-documents"
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-amber-900 dark:text-amber-300 border-amber-200/80 dark:border-slate-700"
                    }`}
                  >
                    <FileCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate">Modération</span>
                  </button>

                  {isSuperAdmin && (
                    <button
                      onClick={() => handleNavClick("super-admin-audit")}
                      className={`col-span-2 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        activeTab === "super-admin-audit"
                          ? "bg-blue-900 text-white border-blue-900 dark:bg-sky-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-blue-900 dark:text-sky-300 border-blue-200/80 dark:border-slate-700"
                      }`}
                    >
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span className="truncate">Journal d'Audit & Historique Admins</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Pied du menu mobile : Déconnexion / Connexion toujours visible */}
            <div className="pt-1">
              {user ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-red-600 dark:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-500/15 dark:hover:bg-red-500/25 border border-red-200/80 dark:border-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-2xs"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Se déconnecter du compte</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleNavClick("login")}
                    className="w-full text-center py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => handleNavClick("register")}
                    className="w-full text-center py-2.5 text-xs font-bold text-white bg-blue-900 rounded-xl shadow-xs"
                  >
                    S'inscrire
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* BARRE FLOTTANTE SUR MOBILE LORS DU SCROLL */}
      {isScrolled && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 lg:hidden animate-fadeIn max-w-[95vw]">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-2 py-1.5 rounded-full shadow-2xl border border-slate-700/70 flex items-center gap-1 ring-1 ring-black/20">
            <button
              onClick={() => handleNavClick("home")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                activeTab === "home"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <School className="w-3.5 h-3.5 shrink-0 text-blue-300" />
              <span className="text-[11px] font-bold">Accueil</span>
            </button>

            <button
              onClick={() => handleNavClick("exams")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                activeTab === "exams"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-blue-300" />
              <span className="text-[11px] font-bold">Épreuves</span>
            </button>

            <button
              onClick={() => handleNavClick("planning")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                activeTab === "planning"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0 text-blue-300" />
              <span className="text-[11px] font-bold">Planning</span>
            </button>

            <button
              onClick={() => handleNavClick("contribute")}
              className={`px-2.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all ${
                activeTab === "contribute"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Upload className="w-3.5 h-3.5 shrink-0 text-blue-300" />
              <span className="text-[11px] font-bold">Déposer</span>
            </button>

            <div className="w-px h-5 bg-slate-700/80 mx-0.5 shrink-0" />

            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                if (!mobileMenuOpen) {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={`p-2 rounded-full shrink-0 transition-all ${
                mobileMenuOpen
                  ? "bg-blue-600 text-white ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
              title="Menu complet"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 shrink-0 transition-colors"
              title="Haut de page"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>

    {/* Modal de confirmation de déconnexion (rendue hors du header en plein écran) */}
    {showLogoutConfirm && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
        onClick={() => setShowLogoutConfirm(false)}
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-inner">
            <LogOut className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1.5">
            <h3 id="logout-confirm-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Confirmer la déconnexion
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte {user ? <strong>{user.prenom} {user.nom}</strong> : "Revisio"} ?
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLogoutConfirm(false);
                onLogout();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs sm:text-sm font-bold shadow-md shadow-red-600/20 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
