import React, { useState, useEffect, useCallback } from "react";
import { User } from "../types";
import { NotificationCenter } from "./NotificationCenter";
import { AppLogo } from "./AppLogo";
import {
  ArrowLeft,
  BookOpen,
  Upload,
  LayoutDashboard,
  FileCheck,
  LogOut,
  Menu,
  X,
  Search,
  School,
  ShieldAlert,
  History,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Settings,
  Bookmark,
  Calendar,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string, filterState?: any) => void;
  onLogout: () => void;
  onOpenQuickLogin?: () => void;
  favoritesCount?: number;
  pendingModerationCount?: number;
  currentTheme?: "light" | "dark" | "system";
  onChangeTheme?: (theme: "light" | "dark" | "system") => void;
}

function triggerMenuHaptic(duration: number | number[] = 10) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
    return;
  }
  try {
    const raw = localStorage.getItem("revisio_user_preferences_v1");
    if (raw && JSON.parse(raw)?.hapticFeedbackEnabled === false) {
      return;
    }
    navigator.vibrate(duration);
  } catch {}
}

function formatRoleLabel(role?: User["role"]): string {
  if (role === "SuperAdministrateur") return "Super Administrateur";
  if (role === "Administrateur") return "Administrateur";
  return "Étudiant ING1";
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  favoritesCount = 0,
  pendingModerationCount = 0,
  currentTheme = "light",
  onChangeTheme,
}) => {
  const [navHistory, setNavHistory] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState("");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setAdminMenuOpen(false);
        setUserMenuOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const isAdmin =
    user?.role === "Administrateur" || user?.role === "SuperAdministrateur";
  const isSuperAdmin = user?.role === "SuperAdministrateur";
  const isAdminTabActive =
    activeTab === "admin-dashboard" ||
    activeTab === "admin-documents" ||
    activeTab === "super-admin-audit";

  const userInitials = user
    ? `${(user.prenom?.[0] || "").toUpperCase()}${(
        user.nom?.[0] || "U"
      ).toUpperCase()}`
    : "ISJ";

  const handleNavClick = useCallback(
    (tab: string, filterState?: any) => {
      triggerMenuHaptic(10);
      if (tab !== activeTab) {
        setNavHistory((h) => [...h.slice(-9), activeTab]);
      }
      setActiveTab(tab, filterState);
      setMobileMenuOpen(false);
      setAdminMenuOpen(false);
      setUserMenuOpen(false);
    },
    [activeTab, setActiveTab]
  );

  const handleBack = () => {
    triggerMenuHaptic(10);
    if (navHistory.length === 0) {
      setActiveTab("home");
      return;
    }
    const next = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setActiveTab(next);
  };

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = quickSearchQuery.trim();
    if (!q) {
      handleNavClick("exams");
      return;
    }
    setQuickSearchQuery("");
    handleNavClick("exams", { search: q });
  };

  const handleThemeSwitch = (themeVal: "light" | "dark" | "system") => {
    triggerMenuHaptic(16);
    onChangeTheme?.(themeVal);
  };

  const primaryAcademicItems = [
    {
      id: "home",
      label: "Accueil",
      subtitle: "Vue d'ensemble & actualités ING1",
      icon: School,
    },
    {
      id: "subjects",
      label: "Matières",
      subtitle: "Unités d'enseignement S1 & S2",
      icon: BookOpen,
    },
    {
      id: "exams",
      label: "Banque d'Épreuves",
      subtitle: "Sujets de CC, SN et rattrapages PDF",
      icon: Search,
    },
    {
      id: "planning",
      label: "Planning & CC",
      subtitle: "Prochain CC : Sam. 21 nov. 2026",
      icon: Calendar,
    },
    {
      id: "contribute",
      label: "Contribuer",
      subtitle: "Partager un sujet avec la promotion",
      icon: Upload,
    },
  ];

  const adminItems = [
    {
      id: "admin-dashboard",
      label: "Dashboard Admin",
      subtitle: "Statistiques, courbes et pilotage",
      icon: LayoutDashboard,
      count: undefined,
    },
    {
      id: "admin-documents",
      label: "Modération",
      subtitle: "Validation et publication des sujets",
      icon: FileCheck,
      count: pendingModerationCount > 0 ? pendingModerationCount : undefined,
    },
    ...(isSuperAdmin
      ? [
          {
            id: "super-admin-audit",
            label: "Journal d'Audit & Sécurité",
            subtitle: "Traçabilité et gouvernance SuperAdmin",
            icon: ShieldAlert,
            count: undefined,
          },
        ]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-900 dark:text-slate-100 border-b border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 2xl:px-8">
          <div className="flex items-center justify-between gap-3 xl:gap-6 h-16">
            {/* Zone 1 : Logo & Brand */}
            <div
              onClick={() => handleNavClick("home")}
              className="cursor-pointer shrink-0 select-none active:scale-[0.98] transition-transform"
            >
              <AppLogo size="md" variant="light" showSubtitle={false} />
            </div>

            {/* Zone 2 : Navigation Principale & Menu Administration (Desktop lg+) */}
            <nav
              aria-label="Navigation principale"
              className="hidden lg:flex items-center justify-center flex-1 min-w-0 gap-2"
            >
              <div className="flex items-center gap-0.5 xl:gap-1 bg-slate-100/80 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shrink-0">
                <button
                  onClick={() => handleNavClick("home")}
                  className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "home"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <School className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Accueil</span>
                </button>

                <button
                  onClick={() => handleNavClick("subjects")}
                  className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "subjects"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Matières</span>
                </button>

                <button
                  onClick={() => handleNavClick("exams")}
                  className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "exams"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Épreuves</span>
                </button>

                <button
                  onClick={() => handleNavClick("planning")}
                  className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "planning"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Planning & CC</span>
                </button>

                <button
                  onClick={() => handleNavClick("contribute")}
                  className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "contribute"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Contribuer</span>
                </button>

                {user && (
                  <button
                    onClick={() => handleNavClick("favorites")}
                    className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === "favorites"
                        ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
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
                    {favoritesCount > 0 && (
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          activeTab === "favorites"
                            ? "text-blue-200"
                            : "text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        ({favoritesCount})
                      </span>
                    )}
                  </button>
                )}

                {/* Accès Administration intégré */}
                {isAdmin && (
                  <>
                    <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />
                    <div className="relative shrink-0">
                      <button
                        onClick={() => {
                          triggerMenuHaptic(10);
                          setAdminMenuOpen(!adminMenuOpen);
                          setUserMenuOpen(false);
                        }}
                        title="Espace Administration & Gouvernance"
                        className={`h-9 px-2.5 xl:px-3 rounded-xl text-xs font-semibold transition-all duration-150 select-none active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                          isAdminTabActive || adminMenuOpen
                            ? "bg-slate-900 text-white dark:bg-blue-600 shadow-2xs"
                            : "text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800"
                        }`}
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                        <span>
                          {activeTab === "admin-documents"
                            ? "Modération"
                            : activeTab === "super-admin-audit"
                            ? "Audit"
                            : "Admin"}
                        </span>
                        {pendingModerationCount > 0 && (
                          <span className="text-[11px] font-bold tabular-nums text-amber-500 dark:text-amber-300">
                            ({pendingModerationCount})
                          </span>
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${
                            adminMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {adminMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setAdminMenuOpen(false)}
                          />
                          <div className="absolute right-0 top-full mt-2.5 w-72 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn space-y-1">
                            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                              Espace Administration · ISJ
                            </div>

                            {adminItems.map((item) => {
                              const Icon = item.icon;
                              const active = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => handleNavClick(item.id)}
                                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-start justify-between gap-2.5 transition-all duration-150 select-none active:scale-[0.98] cursor-pointer ${
                                    active
                                      ? "bg-slate-900 text-white dark:bg-blue-600"
                                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0">
                                    <Icon
                                      className={`w-4 h-4 shrink-0 mt-0.5 ${
                                        active
                                          ? "text-white"
                                          : "text-blue-700 dark:text-blue-400"
                                      }`}
                                    />
                                    <div className="min-w-0">
                                      <div className="font-semibold truncate">
                                        {item.label}
                                      </div>
                                      <div
                                        className={`text-[11px] truncate ${
                                          active
                                            ? "text-slate-300 dark:text-blue-100"
                                            : "text-slate-500 dark:text-slate-400"
                                        }`}
                                      >
                                        {item.subtitle}
                                      </div>
                                    </div>
                                  </div>
                                  {item.count !== undefined && (
                                    <span
                                      className={`text-[11px] font-bold tabular-nums shrink-0 ${
                                        active
                                          ? "text-amber-300"
                                          : "text-amber-600 dark:text-amber-400"
                                      }`}
                                    >
                                      {item.count}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </nav>

            {/* Zone 3 : Outils Personnels, Notifications & Menu Compte (Desktop lg+) */}
            <div className="hidden lg:flex items-center shrink-0 gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleNavClick("activity-log")}
                  title={
                    isSuperAdmin
                      ? "Journal d'activité global"
                      : "Mon journal d'activité"
                  }
                  className={`h-9 px-2.5 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "activity-log"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold"
                      : "bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <History className="w-4 h-4 shrink-0" />
                  <span className="hidden 2xl:inline">
                    {isSuperAdmin ? "Journal global" : "Mon journal"}
                  </span>
                </button>

                <button
                  onClick={() => handleNavClick("settings")}
                  title="Paramètres & Préférences"
                  className={`h-9 px-2.5 rounded-xl text-xs font-medium transition-all duration-150 select-none active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-slate-900 text-white dark:bg-blue-600 font-semibold"
                      : "bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span className="hidden 2xl:inline">Paramètres</span>
                </button>

                <NotificationCenter
                  currentUser={user}
                  onNavigateTab={handleNavClick}
                />
              </div>

              {user ? (
                <div className="relative pl-2 ml-0.5 border-l border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      triggerMenuHaptic(10);
                      setUserMenuOpen(!userMenuOpen);
                      setAdminMenuOpen(false);
                    }}
                    className="h-9 pl-1.5 pr-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2 transition-all duration-150 select-none active:scale-95 cursor-pointer"
                    title="Menu du compte & préférences rapides"
                  >
                    <div className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {userInitials}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] truncate hidden xl:inline">
                      {user.prenom}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        userMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Desktop User Quick Menu Popover */}
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-2.5 w-76 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn space-y-3">
                        {/* Profile Header */}
                        <button
                          type="button"
                          onClick={() => handleNavClick("settings")}
                          className="w-full p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {userInitials}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {user.prenom} {user.nom}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {formatRoleLabel(user.role)} · {user.email}
                              </div>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </button>

                        {/* Quick Theme Switcher */}
                        {onChangeTheme && (
                          <div className="space-y-1.5">
                            <div className="px-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Apparence</span>
                              <span className="font-medium">
                                {currentTheme === "dark"
                                  ? "Sombre"
                                  : currentTheme === "light"
                                  ? "Clair"
                                  : "Système"}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                              {(
                                [
                                  { id: "light", label: "Clair", icon: Sun },
                                  { id: "dark", label: "Sombre", icon: Moon },
                                  { id: "system", label: "Auto", icon: Laptop },
                                ] as const
                              ).map((t) => {
                                const Icon = t.icon;
                                const active = currentTheme === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleThemeSwitch(t.id)}
                                    className={`py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 transition-all duration-150 select-none active:scale-95 cursor-pointer ${
                                      active
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{t.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quick Links */}
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-b border-slate-100 dark:border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => handleNavClick("favorites")}
                            className="w-full py-2 px-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                              <span>Mes épreuves favorites</span>
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                              {favoritesCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavClick("activity-log")}
                            className="w-full py-2 px-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <History className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {isSuperAdmin
                                  ? "Journal d'activité global"
                                  : "Mon journal d'activité"}
                              </span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNavClick("settings")}
                            className="w-full py-2 px-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 flex items-center justify-between cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="w-3.5 h-3.5 text-slate-400" />
                              <span>Paramètres & Appareils</span>
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerMenuHaptic([20, 40, 20]);
                            setUserMenuOpen(false);
                            setShowLogoutConfirm(true);
                          }}
                          className="w-full py-2 px-3 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Se déconnecter</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-slate-200 dark:border-slate-800 shrink-0">
                  <button
                    onClick={() => handleNavClick("login")}
                    className="h-9 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => handleNavClick("register")}
                    className="h-9 bg-slate-900 dark:bg-blue-600 text-white px-4 rounded-xl text-xs font-semibold hover:bg-slate-800 dark:hover:bg-blue-500 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                  >
                    S'inscrire
                  </button>
                </div>
              )}
            </div>

            {/* Mobile & Tablet Actions (< lg): Notifications & Menu Trigger */}
            <div className="flex items-center lg:hidden gap-1.5 shrink-0">
              <NotificationCenter
                currentUser={user}
                onNavigateTab={handleNavClick}
              />
              <button
                type="button"
                onClick={() => {
                  triggerMenuHaptic(12);
                  setMobileMenuOpen(!mobileMenuOpen);
                }}
                className={`min-h-[42px] min-w-[42px] px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all duration-150 select-none touch-manipulation active:scale-90 cursor-pointer ${
                  mobileMenuOpen
                    ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500"
                    : "bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700/70"
                }`}
                aria-label="Ouvrir le menu de navigation"
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <>
                    <Menu className="w-5 h-5" />
                    <span className="hidden sm:inline text-xs font-semibold">
                      Menu
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bouton de retour flottant */}
        {activeTab !== "home" && !mobileMenuOpen && (
          <div className="fixed top-[5.25rem] left-3 sm:left-6 z-30 animate-fadeIn">
            <button
              onClick={handleBack}
              className="flex items-center space-x-1.5 p-3 sm:px-4 sm:py-2.5 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 shadow-lg hover:shadow-xl border border-slate-200/90 dark:border-slate-700/80 backdrop-blur-md transition-all hover:scale-105 active:scale-95 group cursor-pointer"
              title="Page précédente"
              aria-label="Page précédente"
            >
              <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:-translate-x-1 transition-transform shrink-0" />
              <span className="hidden sm:inline text-xs font-bold tracking-tight">
                Retour
              </span>
            </button>
          </div>
        )}
      </header>

      {/* =====================================================================
          ADAPTIVE MENU OVERLAY (< lg)
          - Small Smartphones (< sm): Soft Bottom-Anchored Sheet with thumb zone
          - Tablets (sm to lg): Sleek Right-Side Slide-Over Command Drawer
         ===================================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col sm:flex-row sm:justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs animate-fadeIn"
            onClick={() => {
              triggerMenuHaptic(8);
              setMobileMenuOpen(false);
            }}
          />

          {/* Panel Container: Bottom Sheet on < sm, Right Slide-Over Drawer on sm..lg */}
          <div className="relative z-10 mt-auto sm:mt-0 w-full sm:max-w-[400px] max-h-[88dvh] sm:max-h-none sm:h-[100dvh] bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
            {/* Mobile Drag Handle (< sm only) */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Top Header of Drawer: Identity & Close button */}
            <div className="px-4 pt-2 sm:pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
              {user ? (
                <button
                  type="button"
                  onClick={() => handleNavClick("settings")}
                  className="group flex-1 min-w-0 flex items-center justify-between gap-3 p-1.5 -m-1.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 active:scale-[0.98] transition-all select-none touch-manipulation text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                      {userInitials}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {user.prenom} {user.nom}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                        <span className="font-medium text-blue-700 dark:text-blue-400 shrink-0">
                          {formatRoleLabel(user.role)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-active:translate-x-1 transition-transform" />
                </button>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center">
                    ISJ
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Navigation Revisio
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Première Année Ingénieur · ING1
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  triggerMenuHaptic(8);
                  setMobileMenuOpen(false);
                }}
                className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Fermer le menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3.5 space-y-4">
              {/* 1. Quick Exam Search Bar inside the Menu */}
              <form onSubmit={handleQuickSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  placeholder="Rechercher une matière ou épreuve (ex: Analyse 1)..."
                  className="w-full min-h-[42px] pl-9 pr-10 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all"
                />
                {quickSearchQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-600 text-white active:scale-90 transition-transform cursor-pointer"
                    aria-label="Lancer la recherche"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* 2. Quick Personal Hub Trio (Favoris, Journal, Paramètres) */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleNavClick("favorites")}
                  className={`min-h-[54px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                    activeTab === "favorites"
                      ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-2xs"
                      : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Bookmark
                      className={`w-4 h-4 ${
                        activeTab === "favorites"
                          ? "text-white fill-white"
                          : "text-amber-500"
                      }`}
                    />
                    <span
                      className={`text-xs font-bold tabular-nums ${
                        activeTab === "favorites"
                          ? "text-blue-100"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {favoritesCount}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold truncate mt-1">
                    Favoris
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick("activity-log")}
                  className={`min-h-[54px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                    activeTab === "activity-log"
                      ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-2xs"
                      : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <History
                    className={`w-4 h-4 ${
                      activeTab === "activity-log"
                        ? "text-white"
                        : "text-blue-600 dark:text-blue-400"
                    }`}
                  />
                  <span className="text-[11px] font-semibold truncate mt-1">
                    {isSuperAdmin ? "Journal global" : "Mon journal"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick("settings")}
                  className={`min-h-[54px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-2xs"
                      : "bg-slate-50/80 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Settings
                    className={`w-4 h-4 ${
                      activeTab === "settings"
                        ? "text-white"
                        : "text-slate-600 dark:text-slate-300"
                    }`}
                  />
                  <span className="text-[11px] font-semibold truncate mt-1">
                    Paramètres
                  </span>
                </button>
              </div>

              {/* 3. Primary Academic Navigation:
                  - On Phones (< sm): Smooth vertical grouped list with subtitles & chevrons
                  - On Tablets (sm..lg): 2-column Bento cards */}
              <div className="space-y-1.5">
                <div className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Pôle Académique
                </div>

                {/* Phone Layout (< sm): Soft Vertical List */}
                <div className="sm:hidden bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl divide-y divide-slate-200/50 dark:divide-slate-800/80 overflow-hidden">
                  {primaryAcademicItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`group w-full min-h-[52px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-all duration-150 select-none touch-manipulation active:scale-[0.985] cursor-pointer ${
                          active
                            ? "bg-slate-900 dark:bg-blue-600 text-white"
                            : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 active:bg-slate-200/60 dark:active:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              active
                                ? "bg-white/15 text-white"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-xs font-semibold truncate ${
                                active
                                  ? "text-white"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {item.label}
                            </div>
                            <div
                              className={`text-[11px] truncate ${
                                active
                                  ? "text-slate-300 dark:text-blue-100"
                                  : "text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 group-active:translate-x-1 transition-transform ${
                            active ? "text-white" : "text-slate-400"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Tablet Layout (sm..lg): 2-Column Soft Cards */}
                <div className="hidden sm:grid sm:grid-cols-2 gap-2">
                  {primaryAcademicItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all duration-150 select-none touch-manipulation active:scale-[0.97] cursor-pointer ${
                          item.id === "contribute" ? "sm:col-span-2" : ""
                        } ${
                          active
                            ? "bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-xs"
                            : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              active
                                ? "bg-white/15 text-white"
                                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700"
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              active ? "text-white" : "text-slate-400"
                            }`}
                          />
                        </div>
                        <div>
                          <div
                            className={`text-xs font-bold truncate ${
                              active
                                ? "text-white"
                                : "text-slate-900 dark:text-white"
                            }`}
                          >
                            {item.label}
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              active
                                ? "text-slate-300 dark:text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Espace Administration (Unified clean surface, no double-nested bordered cards) */}
              {isAdmin && (
                <div className="space-y-1.5">
                  <div className="px-1 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span>Administration & Gouvernance</span>
                    {pendingModerationCount > 0 && (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        {pendingModerationCount} en attente
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 rounded-2xl divide-y divide-slate-200/50 dark:divide-slate-800/80 overflow-hidden">
                    {adminItems.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`group w-full min-h-[50px] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-all duration-150 select-none touch-manipulation active:scale-[0.985] cursor-pointer ${
                            active
                              ? "bg-slate-900 dark:bg-blue-600 text-white"
                              : "hover:bg-slate-100/80 dark:hover:bg-slate-800/70 active:bg-slate-200/60 dark:active:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                active
                                  ? "bg-white/15 text-white"
                                  : "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 border border-slate-200/70 dark:border-slate-700"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-xs font-semibold truncate ${
                                  active
                                    ? "text-white"
                                    : "text-slate-900 dark:text-white"
                                }`}
                              >
                                {item.label}
                              </div>
                              <div
                                className={`text-[11px] truncate ${
                                  active
                                    ? "text-slate-300 dark:text-blue-100"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.count !== undefined && (
                              <span
                                className={`text-xs font-bold tabular-nums ${
                                  active
                                    ? "text-amber-300"
                                    : "text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {item.count}
                              </span>
                            )}
                            <ChevronRight
                              className={`w-4 h-4 group-active:translate-x-1 transition-transform ${
                                active ? "text-white" : "text-slate-400"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Bottom Thumb-Zone Bar: Theme Switcher + Sign Out / Auth */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/90 space-y-2.5 shrink-0">
              {/* Instant 1-Tap Theme Switcher */}
              {onChangeTheme && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Thème d'affichage
                  </span>
                  <div className="inline-flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl">
                    {(
                      [
                        { id: "light", label: "Clair", icon: Sun },
                        { id: "dark", label: "Sombre", icon: Moon },
                        { id: "system", label: "Auto", icon: Laptop },
                      ] as const
                    ).map((t) => {
                      const Icon = t.icon;
                      const active = currentTheme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleThemeSwitch(t.id)}
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                            active
                              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    triggerMenuHaptic([20, 40, 20]);
                    setMobileMenuOpen(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800/90 hover:bg-rose-50 dark:hover:bg-rose-500/15 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center gap-2 transition-all duration-150 select-none touch-manipulation active:scale-[0.97] cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Se déconnecter du compte</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleNavClick("login")}
                    className="min-h-[44px] w-full text-center py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform cursor-pointer"
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavClick("register")}
                    className="min-h-[44px] w-full text-center py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 rounded-xl shadow-2xs active:scale-95 transition-transform cursor-pointer"
                  >
                    S'inscrire
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BARRE FLOTTANTE SUR MOBILE LORS DU SCROLL */}
      {isScrolled && !mobileMenuOpen && (
        <div className="fixed bottom-3 sm:bottom-4 inset-x-0 z-40 lg:hidden flex justify-center px-2 sm:px-4 pointer-events-none animate-fadeIn">
          <div className="pointer-events-auto w-full max-w-[420px] sm:w-auto sm:max-w-none bg-slate-900/95 backdrop-blur-md text-white p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl sm:rounded-full shadow-2xl border border-slate-700/70 flex items-center justify-between sm:justify-center gap-0.5 sm:gap-1 ring-1 ring-black/20">
            <button
              onClick={() => handleNavClick("home")}
              className={`flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                activeTab === "home"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <School
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 ${
                  activeTab === "home" ? "text-white" : "text-blue-300"
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                Accueil
              </span>
            </button>

            <button
              onClick={() => handleNavClick("exams")}
              className={`flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                activeTab === "exams"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Search
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 ${
                  activeTab === "exams" ? "text-white" : "text-blue-300"
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                Épreuves
              </span>
            </button>

            <button
              onClick={() => handleNavClick("planning")}
              className={`flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                activeTab === "planning"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Calendar
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 ${
                  activeTab === "planning" ? "text-white" : "text-blue-300"
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                Planning
              </span>
            </button>

            <button
              onClick={() => handleNavClick("contribute")}
              className={`flex-1 sm:flex-initial min-w-0 px-1.5 sm:px-3 py-1.5 rounded-xl sm:rounded-full text-xs font-extrabold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 whitespace-nowrap transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                activeTab === "contribute"
                  ? "bg-blue-600 text-white shadow-md ring-1 ring-blue-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Upload
                className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 ${
                  activeTab === "contribute" ? "text-white" : "text-blue-300"
                }`}
              />
              <span className="text-[10px] sm:text-[11px] font-bold leading-tight truncate max-w-full">
                Déposer
              </span>
            </button>

            <div className="w-px h-6 sm:h-5 bg-slate-700/80 mx-0.5 shrink-0" />

            <button
              onClick={() => {
                triggerMenuHaptic(12);
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="p-2 rounded-xl sm:rounded-full shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-90 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Menu complet"
            >
              <Menu className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                triggerMenuHaptic(10);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="p-2 text-slate-400 hover:text-white rounded-xl sm:rounded-full hover:bg-slate-800 shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-90 cursor-pointer"
              title="Haut de page"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1.5">
              <h3
                id="logout-confirm-title"
                className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                Confirmer la déconnexion
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Souhaitez-vous fermer la session de{" "}
                {user ? (
                  <strong className="text-slate-800 dark:text-slate-200">
                    {user.prenom} {user.nom}
                  </strong>
                ) : (
                  "votre compte"
                )}{" "}
                sur cet appareil ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  triggerMenuHaptic(8);
                  setShowLogoutConfirm(false);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold transition-all active:scale-95 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerMenuHaptic([20, 40, 20]);
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnecter</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
