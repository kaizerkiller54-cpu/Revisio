import React from "react";
import { LayoutDashboard, FileCheck, ShieldAlert, RefreshCw, Sparkles } from "lucide-react";

function triggerHaptic(pattern: number | number[] = 10) {
  try {
    const raw = localStorage.getItem("revisio_user_preferences_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hapticFeedbackEnabled === false) return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported environments
  }
}

export type AdminModuleTab = "admin-dashboard" | "admin-documents" | "super-admin-audit";

interface AdminSubNavProps {
  activeModule: AdminModuleTab;
  isSuperAdmin?: boolean;
  pendingCount?: number;
  publishedCount?: number;
  isRefreshing?: boolean;
  onNavigateModule: (tab: AdminModuleTab) => void;
  onRefresh?: () => void;
}

export const AdminSubNav: React.FC<AdminSubNavProps> = ({
  activeModule,
  isSuperAdmin = false,
  pendingCount = 0,
  publishedCount,
  isRefreshing = false,
  onNavigateModule,
  onRefresh,
}) => {
  const navItems: Array<{
    id: AdminModuleTab;
    label: string;
    shortLabel: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeTone?: "amber" | "blue";
    visible: boolean;
  }> = [
    {
      id: "admin-dashboard",
      label: "Pilotage & Analytique",
      shortLabel: "Dashboard",
      subtitle: "Indicateurs & flux",
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: "admin-documents",
      label: "Modération & Dépôts",
      shortLabel: "Modération",
      subtitle: pendingCount > 0 ? `${pendingCount} à traiter` : "Fonds documentaire",
      icon: FileCheck,
      badge: pendingCount > 0 ? pendingCount : publishedCount,
      badgeTone: pendingCount > 0 ? "amber" : "blue",
      visible: true,
    },
    {
      id: "super-admin-audit",
      label: "Audit & Utilisateurs",
      shortLabel: "Audit & Rôles",
      subtitle: "Traçabilité SuperAdmin",
      icon: ShieldAlert,
      visible: isSuperAdmin,
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 sm:p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {/* Left: Adaptive Segmented Navigation */}
      <div
        className={`grid ${
          visibleItems.length === 3 ? "grid-cols-3" : "grid-cols-2"
        } sm:flex sm:items-center gap-1.5 w-full sm:w-auto`}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                triggerHaptic(10);
                if (!isActive) {
                  onNavigateModule(item.id);
                }
              }}
              className={`group relative px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-left transition-all duration-150 flex items-center justify-center sm:justify-start gap-2 sm:gap-2.5 select-none touch-manipulation active:scale-96 cursor-pointer ${
                isActive
                  ? "bg-blue-900 dark:bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? "text-white"
                    : "text-blue-700 dark:text-blue-400 group-hover:scale-105 transition-transform"
                }`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-extrabold truncate sm:hidden">
                    {item.shortLabel}
                  </span>
                  <span className="text-xs font-extrabold truncate hidden sm:inline">
                    {item.label}
                  </span>

                  {typeof item.badge === "number" && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums leading-none shrink-0 ${
                        item.badgeTone === "amber"
                          ? isActive
                            ? "bg-amber-400 text-slate-950"
                            : "bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/30"
                          : isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <p
                  className={`hidden lg:block text-[10px] truncate ${
                    isActive ? "text-blue-100/90" : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right: Quick Status & Sync Button */}
      <div className="hidden sm:flex items-center gap-2 shrink-0 pr-1">
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Console Gouvernance ISJ</span>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              onRefresh();
            }}
            disabled={isRefreshing}
            className="h-9 px-3 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/70 dark:border-slate-700 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 touch-manipulation"
            title="Synchroniser les données d'administration"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRefreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""
              }`}
            />
            <span className="hidden md:inline">Actualiser</span>
          </button>
        )}
      </div>
    </div>
  );
};
