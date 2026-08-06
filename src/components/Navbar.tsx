import React, { useState, useEffect } from "react";
import { User } from "../types";
import { NotificationCenter } from "./NotificationCenter";
import { AppLogo } from "./AppLogo";
import {
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
  Settings
} from "lucide-react";

interface NavbarProps {
  user: User | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onOpenQuickLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white text-slate-900 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand matching Geometric Balance */}
          <div
            onClick={() => handleNavClick("home")}
            className="cursor-pointer"
          >
            <AppLogo size="md" variant="light" showSubtitle={true} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => handleNavClick("home")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "home"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <School className="w-4 h-4" />
              <span>Accueil</span>
            </button>

            <button
              onClick={() => handleNavClick("subjects")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "subjects"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Matières</span>
            </button>

            <button
              onClick={() => handleNavClick("exams")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "exams"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Épreuves</span>
            </button>

            <button
              onClick={() => handleNavClick("contribute")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "contribute"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Contribuer</span>
            </button>

            <button
              onClick={() => handleNavClick("activity-log")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "activity-log"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <History className="w-4 h-4" />
              <span>Journal d'Activité</span>
            </button>

            <button
              onClick={() => handleNavClick("settings")}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === "settings"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Paramètres</span>
            </button>

            {isAdmin && (
              <>
                <div className="h-5 w-px bg-slate-200 mx-1" />
                <button
                  onClick={() => handleNavClick("admin-dashboard")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === "admin-dashboard"
                      ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                      : "text-slate-600 hover:text-amber-700 hover:bg-amber-50/50"
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Admin</span>
                </button>

                <button
                  onClick={() => handleNavClick("admin-documents")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    activeTab === "admin-documents"
                      ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                      : "text-slate-600 hover:text-amber-700 hover:bg-amber-50/50"
                  }`}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Modération</span>
                </button>
              </>
            )}

            {isSuperAdmin && (
              <button
                onClick={() => handleNavClick("super-admin-audit")}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  activeTab === "super-admin-audit"
                    ? "bg-purple-50 text-purple-900 border border-purple-200 font-extrabold shadow-sm"
                    : "text-purple-700 hover:text-purple-900 hover:bg-purple-50/60"
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-purple-700" />
                <span>Journal d'Audit</span>
              </button>
            )}
          </nav>

          {/* User Auth Info & Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Notification Center */}
            <NotificationCenter currentUser={user} onNavigateTab={handleNavClick} />

            {user ? (
              <div className="flex items-center space-x-3 pl-2 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {user.prenom} {user.nom}
                  </p>
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isAdmin
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="Déconnexion"
                  className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleNavClick("login")}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  Connexion
                </button>
                <button
                  onClick={() => handleNavClick("register")}
                  className="bg-indigo-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-indigo-800 transition-all shadow-sm"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center md:hidden space-x-2">
            <NotificationCenter currentUser={user} onNavigateTab={handleNavClick} />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-5 space-y-2 animate-fadeIn">
          {user && (
            <div className="p-3 mb-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-slate-900">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  isAdmin ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {user.role}
              </span>
            </div>
          )}

          <button
            onClick={() => handleNavClick("home")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "home" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <School className="w-4 h-4" />
            <span>Accueil</span>
          </button>

          <button
            onClick={() => handleNavClick("subjects")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "subjects" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Matières du Niveau 1</span>
          </button>

          <button
            onClick={() => handleNavClick("exams")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "exams" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Consulter les Épreuves</span>
          </button>

          <button
            onClick={() => handleNavClick("contribute")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "contribute" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Soumettre une Épreuve</span>
          </button>

          <button
            onClick={() => handleNavClick("activity-log")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "activity-log" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Journal d'Activité</span>
          </button>

          <button
            onClick={() => handleNavClick("settings")}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
              activeTab === "settings" ? "bg-indigo-50 text-indigo-700 font-bold" : "text-slate-600"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres</span>
          </button>

          {isAdmin && (
            <div className="pt-2 border-t border-slate-200 space-y-1">
              <div className="px-3 py-1 text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                Espace Administration
              </div>
              <button
                onClick={() => handleNavClick("admin-dashboard")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                  activeTab === "admin-dashboard" ? "bg-amber-50 text-amber-800 font-bold" : "text-slate-600"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Admin</span>
              </button>

              <button
                onClick={() => handleNavClick("admin-documents")}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                  activeTab === "admin-documents" ? "bg-amber-50 text-amber-800 font-bold" : "text-slate-600"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                <span>Modération des Documents</span>
              </button>

              {isSuperAdmin && (
                <button
                  onClick={() => handleNavClick("super-admin-audit")}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center space-x-2 ${
                    activeTab === "super-admin-audit" ? "bg-purple-50 text-purple-900 font-extrabold" : "text-purple-700"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-purple-700" />
                  <span>Journal d'Audit & Historique Admins</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-200">
            {user ? (
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleNavClick("login")}
                  className="w-full text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Connexion
                </button>
                <button
                  onClick={() => handleNavClick("register")}
                  className="w-full text-center py-2 text-sm font-bold text-white bg-indigo-900 rounded-lg"
                >
                  S'inscrire
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BARRE FLOTTANTE SUR MOBILE LORS DU SCROLL */}
      {isScrolled && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 md:hidden animate-fadeIn max-w-[95vw]">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full shadow-2xl border border-slate-700/70 flex items-center space-x-1 ring-1 ring-black/20">
            <button
              onClick={() => handleNavClick("home")}
              className={`px-3 py-2 rounded-full text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeTab === "home"
                  ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <School className="w-4 h-4 shrink-0 text-indigo-300" />
              <span className="text-[11px] font-bold">Accueil</span>
            </button>

            <button
              onClick={() => handleNavClick("exams")}
              className={`px-3 py-2 rounded-full text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeTab === "exams"
                  ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Search className="w-4 h-4 shrink-0 text-indigo-300" />
              <span className="text-[11px] font-bold">Épreuves</span>
            </button>

            <button
              onClick={() => handleNavClick("contribute")}
              className={`px-3 py-2 rounded-full text-xs font-extrabold flex items-center space-x-1.5 transition-all ${
                activeTab === "contribute"
                  ? "bg-indigo-600 text-white shadow-md ring-1 ring-indigo-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Upload className="w-4 h-4 shrink-0 text-indigo-300" />
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
              className={`p-2 rounded-full transition-all ${
                mobileMenuOpen
                  ? "bg-indigo-600 text-white ring-1 ring-indigo-400"
                  : "text-slate-300 hover:text-white hover:bg-slate-800"
              }`}
              title="Menu complet"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>

            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
              title="Haut de page"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
