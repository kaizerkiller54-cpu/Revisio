import React, { useState, useEffect } from "react";
import { Cookie, X, Check, Settings } from "lucide-react";

const CONSENT_KEY = "isj_cookie_consent";

export type CookieConsentState = "accepted" | "refused" | null;

export interface CookiePreferences {
  necessary: boolean;
  preferences: boolean;
  statistics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true,
  preferences: false,
  statistics: false,
  marketing: false,
};

function getStoredConsent(): { state: CookieConsentState; preferences: CookiePreferences } | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

function clearNonEssentialCookies() {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name && name !== "isj_app_theme") {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  });
}

interface CookieConsentProps {
  onDecide?: (state: CookieConsentState, preferences: CookiePreferences) => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onDecide }) => {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      setVisible(true);
    } else {
      setPreferences((prev) => ({ ...prev, ...stored.preferences }));
    }
  }, []);

  const persist = (state: CookieConsentState, prefs: CookiePreferences) => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ state, preferences: prefs }));
    setVisible(false);
    onDecide?.(state, prefs);
  };

  const acceptAll = () => {
    const prefs: CookiePreferences = {
      necessary: true,
      preferences: true,
      statistics: true,
      marketing: true,
    };
    setCookie("isj_consent", "all", 365);
    persist("accepted", prefs);
  };

  const acceptEssential = () => {
    setCookie("isj_consent", "essential", 365);
    persist("refused", DEFAULT_PREFERENCES);
  };

  const savePreferences = () => {
    setCookie("isj_consent", preferences.preferences || preferences.statistics || preferences.marketing ? "partial" : "essential", 365);
    persist(preferences.preferences || preferences.statistics || preferences.marketing ? "accepted" : "refused", preferences);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowDetails(false)} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-t sm:border border-slate-200 dark:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center">
              <Cookie className="w-5 h-5 text-indigo-700 dark:text-indigo-300" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              Nous respectons votre vie privée
            </h2>
          </div>
          <button
            onClick={acceptEssential}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-3 pb-2 text-sm text-slate-600 dark:text-slate-300 space-y-3">
          <p className="leading-relaxed">
            Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. Vous pouvez choisir quels cookies nous autorisons.
          </p>

          {showDetails && (
            <div className="space-y-3 pt-1">
              {[
                { key: "necessary" as const, title: "Strictement nécessaires", desc: "Essentiels au fonctionnement du site (authentification, sécurité). Non désactivables." },
                { key: "preferences" as const, title: "Préférences", desc: "Mémorisent vos choix comme la langue ou le thème." },
                { key: "statistics" as const, title: "Statistiques", desc: "Nous aident à comprendre comment le site est utilisé." },
                { key: "marketing" as const, title: "Marketing", desc: "Utilisés pour vous proposer du contenu et des offres pertinents." },
              ].map((cat) => (
                <div
                  key={cat.key}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{cat.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{cat.desc}</p>
                    </div>
                    {cat.key === "necessary" ? (
                      <span className="text-[10px] uppercase font-bold px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                        Requis
                      </span>
                    ) : (
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={preferences[cat.key]}
                          onChange={(e) =>
                            setPreferences((prev) => ({ ...prev, [cat.key]: e.target.checked }))
                          }
                        />
                        <div className="w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                      </label>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
          {showDetails ? (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={savePreferences}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                <Check className="w-4 h-4" />
                Enregistrer mes choix
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Retour
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={acceptAll}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
              >
                Tout accepter
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Personnaliser
              </button>
            </div>
          )}
        </div>

        <p className="px-5 pb-4 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Conformité RGPD / Loi Informatique et Libertés. Consultez nos conditions d'utilisation.
        </p>
      </div>
    </div>
  );
};

export default CookieConsent;
