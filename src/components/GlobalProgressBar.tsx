import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, CheckCircle2, FileUp, Database } from "lucide-react";

export interface GlobalProgressBarProps {
  /** Indique si une opération globale (chargement ou soumission) est active */
  active: boolean;
  /** Libellé principal affiché dans l'indicateur d'état */
  label?: string;
  /** Contexte d'opération ("load" | "submit" | "refresh") */
  variant?: "load" | "submit" | "refresh";
}

export const GlobalProgressBar: React.FC<GlobalProgressBarProps> = ({
  active,
  label,
  variant = "load",
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active) {
      setIsVisible(true);
      setIsFinishing(false);
      setProgress((prev) => (prev > 0 && prev < 90 ? prev : 12));

      if (timerRef.current) clearInterval(timerRef.current);

      // Incrémentation réaliste et progressive jusqu'à 92%
      timerRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 92) return current;
          // Progression plus rapide au début, puis plus douce
          const remaining = 92 - current;
          const delta = Math.max(0.6, remaining * 0.08);
          return Math.min(92, current + delta);
        });
      }, 140);
    } else if (isVisible) {
      // Transition finale vers 100% lors de la complétion
      if (timerRef.current) clearInterval(timerRef.current);
      setIsFinishing(true);
      setProgress(100);

      const finishTimer = setTimeout(() => {
        setIsVisible(false);
        setIsFinishing(false);
        setTimeout(() => setProgress(0), 200);
      }, 450);

      return () => clearTimeout(finishTimer);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [active, isVisible]);

  if (!isVisible && progress === 0) return null;

  const defaultLabel =
    variant === "submit"
      ? "Transmission de votre épreuve en cours..."
      : variant === "refresh"
      ? "Actualisation des ressources..."
      : "Chargement initial des ressources ISJ...";

  const displayLabel = label || defaultLabel;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] pointer-events-none select-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={displayLabel}
    >
      {/* 1. Barre de progression supérieure ultra-fine (1.5 - 2px) */}
      <div className="w-full h-1 sm:h-1.5 bg-transparent overflow-hidden">
        <div
          className={`h-full transition-all duration-200 ease-out bg-gradient-to-r from-blue-900 via-blue-600 to-sky-400 relative shadow-[0_0_12px_rgba(37,99,235,0.8),0_0_4px_rgba(56,189,248,0.9)] ${
            isFinishing ? "opacity-90" : "opacity-100"
          }`}
          style={{ width: `${progress}%` }}
        >
          {/* Lueur brillante à la tête de la barre */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-r from-transparent to-white/70 shadow-[0_0_8px_white]" />
        </div>
      </div>

      {/* 2. Badge flottant discret et informatif sous la barre */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex justify-center pt-2 px-4"
          >
            <div className="pointer-events-auto backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 shadow-md text-slate-800 dark:text-slate-100 text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2.5 max-w-sm sm:max-w-md">
              {/* Icône d'état */}
              <div className="shrink-0 flex items-center justify-center">
                {isFinishing ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : variant === "submit" ? (
                  <FileUp className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400 animate-bounce" />
                ) : (
                  <Loader2 className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400 animate-spin" />
                )}
              </div>

              {/* Texte descriptif */}
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {isFinishing
                  ? variant === "submit"
                    ? "Épreuve transmise avec succès !"
                    : "Ressources chargées avec succès !"
                  : displayLabel}
              </span>

              {/* Pourcentage chiffré */}
              <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-sky-400 tabular-nums shrink-0">
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
