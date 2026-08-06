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
        return <Info className="w-5 h-5 text-indigo-600 shrink-0" />;
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
            ? "bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500/30"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700"
        }`}
        title="Notifications système"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ring-2 ring-white animate-pulse">
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
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
            {/* Panel Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <h3 className="font-extrabold text-sm tracking-wide">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
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
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-600">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="hover:text-indigo-700 font-bold flex items-center space-x-1 disabled:opacity-40 transition-colors"
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
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">Aucune notification</p>
                  <p className="text-[11px] text-slate-400">
                    Vous recevrez des alertes en cas de validation de sujet ou changement de statut.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.linkTab)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start space-x-3 group relative ${
                      !n.lue ? "bg-indigo-50/60 hover:bg-indigo-50" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    {!n.lue && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-4 left-1" />
                    )}

                    <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-white transition-colors">
                      {renderIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-xs font-bold truncate ${!n.lue ? "text-slate-900" : "text-slate-700"}`}>
                          {n.titre}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                          {formatDate(n.date)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-snug break-words">
                        {n.message}
                      </p>

                      {n.linkTab && (
                        <div className="mt-1.5 inline-flex items-center space-x-1 text-[10px] font-bold text-indigo-700 hover:underline">
                          <span>Voir les détails</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Delete item button */}
                    <button
                      onClick={(e) => handleDelete(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-all rounded hover:bg-rose-50"
                      title="Supprimer la notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
              <p className="text-[10px] text-slate-400 font-medium">
                ISJ Revisio — Système d'Information & Notification en temps réel
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
