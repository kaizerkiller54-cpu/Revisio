import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, CheckCircle2, AlertCircle, Loader2, X, FileText } from "lucide-react";

export interface DownloadToastState {
  id: string;
  title: string;
  filename?: string;
  status: "preparing" | "success" | "error";
  error?: string;
}

interface DownloadStatusToastProps {
  toast: DownloadToastState | null;
  onDismiss: () => void;
}

export const DownloadStatusToast: React.FC<DownloadStatusToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (toast?.status === "success" || toast?.status === "error") {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast?.status, onDismiss]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-auto"
        >
          <div
            className={`rounded-2xl p-4 shadow-2xl backdrop-blur-lg border transition-all ${
              toast.status === "preparing"
                ? "bg-slate-900/95 text-white border-blue-500/40 shadow-blue-950/50"
                : toast.status === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/50"
                : "bg-slate-900/95 text-white border-red-500/50 shadow-red-950/50"
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3.5">
              {/* Status Icon */}
              <div
                className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  toast.status === "preparing"
                    ? "bg-blue-500/20 text-amber-300 border border-blue-500/30"
                    : toast.status === "success"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {toast.status === "preparing" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : toast.status === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs sm:text-sm font-bold tracking-tight text-white truncate">
                    {toast.status === "preparing" && "Téléchargement en cours..."}
                    {toast.status === "success" && "Téléchargement démarré !"}
                    {toast.status === "error" && "Échec du téléchargement"}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${
                      toast.status === "preparing"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                        : toast.status === "success"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-red-500/20 text-red-300 border border-red-500/30"
                    }`}
                  >
                    {toast.status === "preparing" ? "En cours" : toast.status === "success" ? "Prêt" : "Erreur"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                  {toast.status === "preparing" && (
                    <>
                      Préparation et sécurisation de l'épreuve :{" "}
                      <span className="font-semibold text-white">{toast.title}</span>
                    </>
                  )}
                  {toast.status === "success" && (
                    <>
                      L'épreuve <span className="font-semibold text-white">{toast.filename || toast.title}</span> a
                      été enregistrée dans vos téléchargements.
                    </>
                  )}
                  {toast.status === "error" && (
                    toast.error || "Impossible de récupérer le document. Veuillez vérifier votre connexion et réessayer."
                  )}
                </p>

                {/* Animated progress bar while preparing */}
                {toast.status === "preparing" && (
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 h-full rounded-full"
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.4,
                        ease: "easeInOut",
                      }}
                      style={{ width: "60%" }}
                    />
                  </div>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={onDismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors shrink-0"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
