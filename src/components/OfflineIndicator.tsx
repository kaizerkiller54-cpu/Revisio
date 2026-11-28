import React from "react";
import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-amber-400/50 animate-fadeIn"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode hors ligne — Données en cache utilisées</span>
    </div>
  );
};
