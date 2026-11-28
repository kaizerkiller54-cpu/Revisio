import React, { useEffect, useState } from "react";
import { Download, Monitor, Share, Smartphone, X, CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

const NEVER_ASK_KEY = "revisio_pwa_never_ask";
const SESSION_ARRIVAL_DISMISSED_KEY = "revisio_pwa_arrival_dismissed";

interface PWAInstallPromptProps {
  /** Incrémenté à chaque connexion ou inscription réussie pour afficher la notification d'enregistrement sur le bureau. */
  loginPromptKey?: number;
  userName?: string | null;
}

type PromptReason = "arrival" | "login";

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  loginPromptKey = 0,
  userName,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<PromptReason>("arrival");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  const isNeverAsk = () => {
    try {
      return localStorage.getItem(NEVER_ASK_KEY) === "true";
    } catch {
      return false;
    }
  };

  // 1. Proposition automatique à l'arrivée sur la plateforme
  useEffect(() => {
    if (isInstalled || isNeverAsk()) return;
    try {
      if (sessionStorage.getItem(SESSION_ARRIVAL_DISMISSED_KEY) === "true") {
        return;
      }
    } catch {}

    const timer = window.setTimeout(() => {
      setReason("arrival");
      setVisible(true);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [isInstalled]);

  // 2. Petite notification dédiée lors de la connexion pour enregistrer l'app sur le bureau
  useEffect(() => {
    if (loginPromptKey <= 0 || isInstalled || isNeverAsk()) return;

    const timer = window.setTimeout(() => {
      setReason("login");
      setVisible(true);
    }, 650);

    return () => window.clearTimeout(timer);
  }, [loginPromptKey, isInstalled]);

  // Ferme automatiquement si l'application vient d'être installée
  useEffect(() => {
    if (isInstalled && !justInstalled) {
      setVisible(false);
    }
  }, [isInstalled, justInstalled]);

  const dismissForNow = () => {
    setVisible(false);
    if (reason === "arrival") {
      try {
        sessionStorage.setItem(SESSION_ARRIVAL_DISMISSED_KEY, "true");
      } catch {}
    }
  };

  const dismissForever = () => {
    setVisible(false);
    try {
      localStorage.setItem(NEVER_ASK_KEY, "true");
      sessionStorage.setItem(SESSION_ARRIVAL_DISMISSED_KEY, "true");
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === "accepted") {
        setJustInstalled(true);
        window.setTimeout(() => {
          setVisible(false);
          setJustInstalled(false);
        }, 2800);
        return;
      }
      if (outcome === "dismissed") {
        dismissForNow();
        return;
      }
    }
    setShowGuideModal(true);
  };

  if (!visible && !showGuideModal) return null;

  return (
    <>
      {visible && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={
            reason === "login"
              ? "Enregistrer Revisio sur votre bureau"
              : "Télécharger l'application Revisio en PWA"
          }
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[60] sm:w-[370px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/50 p-4 animate-fadeIn"
        >
          {justInstalled ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Application installée !
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Revisio est maintenant disponible sur votre appareil.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="Icône Revisio"
                    className="w-10 h-10 rounded-xl shadow-xs border border-slate-200/60 dark:border-slate-700 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-snug">
                      {reason === "login"
                        ? "Enregistrer Revisio sur votre bureau ?"
                        : "Télécharger l'application Revisio"}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {reason === "login"
                        ? `${userName ? `${userName}, s` : "S"}ouhaitez-vous enregistrer cette application sur votre bureau pour y accéder en un clic ?`
                        : "Installez la version PWA de Revisio sur votre appareil pour un accès rapide, même hors ligne."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissForNow}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                  aria-label="Fermer la notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={dismissForever}
                  className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Ne plus demander
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={dismissForNow}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Plus tard
                  </button>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{reason === "login" ? "Enregistrer" : "Installer"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Guide d'installation PWA Revisio"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                  {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isIOS ? "Installer sur iPhone / iPad" : "Enregistrer sur votre bureau"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Installation en 2 étapes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/70">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">1.</span>
                  <span>
                    Touchez{" "}
                    <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                      Partager <Share className="w-3.5 h-3.5 inline" />
                    </strong>{" "}
                    dans la barre Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">2.</span>
                  <span>
                    Sélectionnez{" "}
                    <strong className="text-slate-900 dark:text-white">Sur l'écran d'accueil</strong>{" "}
                    puis <strong className="text-slate-900 dark:text-white">Ajouter</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/70">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">1.</span>
                  <span>
                    Dans <strong className="text-slate-900 dark:text-white">Chrome ou Edge</strong>, cliquez sur l'icône d'installation à droite de la barre d'adresse.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">2.</span>
                  <span>
                    Validez <strong className="text-slate-900 dark:text-white">Installer Revisio</strong> pour placer le raccourci sur votre bureau.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => {
                setShowGuideModal(false);
                dismissForNow();
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
};
