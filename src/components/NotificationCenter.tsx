import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { UserNotification, User } from "../types";
import {
  getUserNotificationsApi,
  markNotificationAsReadApi,
  markAllNotificationsAsReadApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
} from "../lib/api";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from "lucide-react";

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

interface NotificationCenterProps {
  currentUser: User | null;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  currentUser,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getUserNotificationsApi(currentUser);
      setNotifications(data);
    } catch (err) {
      console.error("Erreur lors de la récupération des notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.lue).length;
  const visibleNotifications =
    filterTab === "unread" ? notifications.filter((n) => !n.lue) : notifications;

  const handleToggleOpen = () => {
    triggerHaptic(10);
    setIsOpen((prev) => !prev);
  };

  const handleMarkAsRead = async (id: string, linkTab?: string) => {
    triggerHaptic(10);
    try {
      await markNotificationAsReadApi(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lue: true } : n))
      );
      if (linkTab && onNavigateTab) {
        onNavigateTab(linkTab);
        setIsOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    triggerHaptic([10, 25, 10]);
    try {
      await markAllNotificationsAsReadApi(currentUser);
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic(12);
    try {
      await deleteNotificationApi(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    triggerHaptic([12, 30, 12]);
    try {
      await clearAllNotificationsApi(currentUser);
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  const renderIcon = (type: UserNotification["type"]) => {
    switch (type) {
      case "success":
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "warning":
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case "error":
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffMins < 1) return "À l'instant";
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      return d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderPanelContent = () => (
    <>
      {/* Soft Panel Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/25 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Alertes académiques et suivi des dépôts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              fetchNotifications();
            }}
            className="w-8 h-8 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer touch-manipulation"
            title="Actualiser"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setIsOpen(false);
            }}
            className="w-8 h-8 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-all active:scale-90 cursor-pointer touch-manipulation"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs + Quick Actions Bar */}
      <div className="px-3.5 sm:px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Segmented Filter */}
        <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setFilterTab("all");
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none touch-manipulation active:scale-95 ${
              filterTab === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Toutes ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setFilterTab("unread");
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer select-none touch-manipulation active:scale-95 ${
              filterTab === "unread"
                ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-2xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Non lues ({unreadCount})
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50/80 dark:hover:bg-blue-500/10 font-semibold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="Tout marquer comme lu"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tout lire</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            disabled={notifications.length === 0}
            className="px-2 py-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-500/10 font-semibold flex items-center gap-1 disabled:opacity-35 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer touch-manipulation"
            title="Effacer toutes les notifications"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vider</span>
          </button>
        </div>
      </div>

      {/* Notification List Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-100 dark:divide-slate-800/70 min-h-[180px] max-h-[55svh] sm:max-h-[360px]">
        {visibleNotifications.length === 0 ? (
          <div className="py-10 px-6 text-center space-y-2.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {filterTab === "unread"
                ? "Aucune notification non lue"
                : "Aucune notification pour le moment"}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
              {filterTab === "unread"
                ? "Vous êtes à jour sur toutes vos alertes académiques."
                : "Vous recevrez ici les alertes lors de la publication d'épreuves ou de la validation de vos dépôts."}
            </p>
            {filterTab === "unread" && notifications.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setFilterTab("all");
                }}
                className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Afficher l'historique complet ({notifications.length})
              </button>
            )}
          </div>
        ) : (
          visibleNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkAsRead(n.id, n.linkTab)}
              className={`p-3.5 sm:px-4 transition-colors cursor-pointer flex items-start gap-3 group relative select-none touch-manipulation ${
                !n.lue
                  ? "bg-blue-50/50 dark:bg-blue-500/10 hover:bg-blue-50/90 dark:hover:bg-blue-500/15"
                  : "bg-white dark:bg-slate-900 hover:bg-slate-50/90 dark:hover:bg-slate-800/60"
              }`}
            >
              {renderIcon(n.type)}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {!n.lue && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                    )}
                    <p
                      className={`text-xs font-bold truncate ${
                        !n.lue
                          ? "text-slate-900 dark:text-white"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {n.titre}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tabular-nums shrink-0">
                    {formatDate(n.date)}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed break-words">
                  {n.message}
                </p>

                {n.linkTab && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 group-hover:underline">
                    <span>Consulter la section</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Touch-friendly delete button */}
              <button
                type="button"
                onClick={(e) => handleDelete(e, n.id)}
                className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 flex items-center justify-center transition-all shrink-0 active:scale-90 cursor-pointer touch-manipulation"
                title="Supprimer cette notification"
                aria-label="Supprimer cette notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Soft Footer */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
        <span className="font-medium">ISJ Revisio • Flux temps réel</span>
        {onNavigateTab && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setIsOpen(false);
              onNavigateTab("settings");
            }}
            className="font-bold text-slate-600 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            Préférences d'alertes
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggleOpen}
        className={`relative h-9 w-9 rounded-xl transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer select-none touch-manipulation active:scale-92 ${
          isOpen
            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/25 border border-blue-200/80 dark:border-blue-500/40"
            : "bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70"
        }`}
        title="Notifications système"
        aria-label="Ouvrir le centre de notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 tabular-nums leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop & Tablet Popover (sm+) */}
      {isOpen && (
        <div className="hidden sm:block">
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-2.5 w-[390px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-900/15 dark:shadow-black/50 z-50 overflow-hidden flex flex-col animate-fadeIn"
            role="dialog"
            aria-label="Centre de notifications"
          >
            {renderPanelContent()}
          </div>
        </div>
      )}

      {/* Mobile Portal (< sm) — Rendered in document.body to escape Navbar's backdrop-blur containing block */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="sm:hidden">
            {/* Dimmed Backdrop */}
            <div
              className="fixed inset-0 z-[70] bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
              onClick={() => setIsOpen(false)}
            />
            {/* Floating Mobile Card right below top Navbar */}
            <div
              className="fixed inset-x-3 top-[4.25rem] z-[75] bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl shadow-slate-950/30 overflow-hidden flex flex-col max-h-[calc(100svh-5.25rem)] animate-fadeIn"
              role="dialog"
              aria-label="Centre de notifications mobile"
            >
              {renderPanelContent()}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
