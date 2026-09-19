import React, { useState, useEffect } from "react";
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
  Sparkles,
  RefreshCw,
} from "lucide-react";

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
    // Poll for notifications every 20 seconds for real-time reactivity
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const unreadCount = notifications.filter((n) => !n.lue).length;

  const handleMarkAsRead = async (id: string, linkTab?: string) => {
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
    try {
      await markAllNotificationsAsReadApi(currentUser);
      setNotifications((prev) => prev.map((n) => ({ ...n, lue: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteNotificationApi(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
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
        return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case "error":
        return <XCircle className="w-5 h-5 text-rose-600 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
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

  return (
    <div className="relative inline-block text-left">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-all flex items-center justify-center ${
          isOpen
            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-900 dark:text-blue-300 ring-2 ring-blue-500/30"
            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
        }`}
        title="Notifications système"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay Drawer Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
            {/* Panel Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-sm tracking-wide">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nouvelle{unreadCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={fetchNotifications}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="hover:text-blue-700 font-bold flex items-center space-x-1 disabled:opacity-40 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tout marquer comme lu</span>
              </button>

              <button
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="hover:text-rose-600 font-bold flex items-center space-x-1 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Effacer tout</span>
              </button>
            </div>

            {/* Notification List Body */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Aucune notification</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Vous recevrez des alertes en cas de validation de sujet ou changement de statut.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.linkTab)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 group relative ${
                      !n.lue ? "bg-blue-50/60 dark:bg-blue-500/10 hover:bg-blue-50 dark:hover:bg-blue-500/20" : "bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {!n.lue && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 absolute top-4 left-1" />
                    )}

                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                      {renderIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-xs font-bold truncate ${!n.lue ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                          {n.titre}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {formatDate(n.date)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug break-words">
                        {n.message}
                      </p>

                      {n.linkTab && (
                        <div className="mt-1.5 inline-flex items-center space-x-1 text-[10px] font-bold text-blue-700 dark:text-blue-400 hover:underline">
                          <span>Voir les détails</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Delete item button */}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all rounded"
                      title="Supprimer la notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                ISJ Revisio — Système d'Information & Notification en temps réel
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
