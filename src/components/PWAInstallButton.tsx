import React, { useState } from "react";
import { Download, Share, Monitor, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "../hooks/usePWAInstall";

interface PWAInstallButtonProps {
  variant?: "navbar" | "mobile-menu";
  onClickAfter?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = "navbar",
  onClickAfter,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (result === "unavailable") {
        setShowGuide(true);
      } else {
        onClickAfter?.();
      }
      return;
    }
    setShowGuide(true);
  };

  return (
    <>
      {variant === "mobile-menu" ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-500/15 hover:bg-blue-100/90 dark:hover:bg-blue-500/25 border border-blue-200/80 dark:border-blue-500/30 flex items-center justify-center gap-2 transition-all duration-150 select-none touch-manipulation active:scale-[0.97] cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Installer l'application (PWA)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          title="Installer Revisio sur votre bureau ou écran d'accueil"
          className="h-9 px-2.5 rounded-xl text-xs font-semibold transition-all duration-150 select-none active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/30"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">Installer</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4"
            role="dialog"
            aria-modal="true"
            aria-label="Installer Revisio"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
                  {isIOS ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {isIOS ? "Installer sur iPhone / iPad" : "Enregistrer Revisio sur le bureau"}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Application Web Progressive (PWA)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
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
                    Appuyez sur le bouton{" "}
                    <strong className="inline-flex items-center gap-1 text-slate-900 dark:text-white">
                      Partager <Share className="w-3.5 h-3.5 inline" />
                    </strong>{" "}
                    dans la barre Safari.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">2.</span>
                  <span>
                    Faites défiler et touchez{" "}
                    <strong className="text-slate-900 dark:text-white">Sur l'écran d'accueil</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">3.</span>
                  <span>
                    Validez avec <strong className="text-slate-900 dark:text-white">Ajouter</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200/70 dark:border-slate-700/70">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">1.</span>
                  <span>
                    Sur <strong className="text-slate-900 dark:text-white">Chrome / Edge</strong>, cliquez sur l'icône d'installation dans la barre d'adresse ou ouvrez le menu du navigateur.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-blue-700 dark:text-blue-400">2.</span>
                  <span>
                    Sélectionnez{" "}
                    <strong className="text-slate-900 dark:text-white">Installer Revisio</strong> (ou{" "}
                    <strong className="text-slate-900 dark:text-white">Ajouter au Dock / Bureau</strong> sur Safari macOS).
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => {
                setShowGuide(false);
                onClickAfter?.();
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
