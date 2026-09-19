import React from "react";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showSubtitle?: boolean;
  // false = version épurée et statique (sans halo ni reflets), pour les formulaires.
  animated?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = "md",
  variant = "light",
  showSubtitle = true,
  animated = true,
}) => {
  const isDark = variant === "dark";

  const iconContainerSizes = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-12 h-12 rounded-2xl",
  };

  const haloSizes = {
    sm: "-inset-1.5 rounded-2xl",
    md: "-inset-2 rounded-3xl",
    lg: "-inset-2.5 rounded-3xl",
  };

  const svgSizes = {
    sm: "w-4 h-4",
    md: "w-5.5 h-5.5",
    lg: "w-7 h-7",
  };

  const titleSizes = {
    sm: "text-sm",
    md: "text-base sm:text-lg",
    lg: "text-xl sm:text-2xl",
  };

  return (
    <div className="flex items-center space-x-3 select-none group">
      {/* UI/UX Designed Custom Emblem Icon */}
      <div className={`relative shrink-0 ${animated ? "animate-isj-float" : ""}`}>
        {/* Rotating Prism Halo */}
        {animated && (
          <div
            className={`absolute top-1/2 left-1/2 w-[170%] h-[170%] ${haloSizes[size]} animate-isj-halo blur-xl opacity-70 dark:opacity-80 pointer-events-none`}
            style={{
              background:
                "conic-gradient(from 0deg, rgba(99,102,241,0.7), rgba(56,189,248,0.6), rgba(14,165,233,0.6), rgba(251,191,36,0.5), rgba(99,102,241,0.7))",
            }}
          />
        )}
        {/* Breathing Glow */}
        {animated && (
          <div
            className={`absolute ${haloSizes[size]} animate-isj-glow bg-gradient-to-br from-blue-400/40 via-sky-400/30 to-blue-300/40 blur-md pointer-events-none`}
          />
        )}

        {/* Icon Core */}
        <div
          className={`${iconContainerSizes[size]} ${
            animated
              ? "bg-gradient-to-br from-blue-600 via-sky-500 to-blue-950 shadow-lg shadow-blue-900/40 ring-1 ring-white/20 group-hover:scale-110"
              : "bg-blue-600 shadow-sm ring-1 ring-blue-700/30"
          } flex items-center justify-center text-white transition-transform duration-300 relative overflow-hidden`}
        >
          {/* Subtle Ambient Ray Background */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/30 via-sky-400/20 to-blue-300/20 opacity-90" />
          )}

          {/* Animated Sheen Sweep */}
          {animated && (
            <div className="absolute top-0 left-0 h-full w-1/2 animate-isj-sheen bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
          )}

          {/* Custom Emblem: Loupe de recherche au-dessus d'un fichier d'épreuve */}
          <svg
            className={`${svgSizes[size]} relative z-10 text-white transform transition-transform duration-300 ${
              animated ? "group-hover:rotate-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" : ""
            }`}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fichier d'épreuve avec coin plié */}
            <path
              d="M7 7.5C7 6.67157 7.67157 6 8.5 6H18L24 12V25.5C24 26.3284 23.3284 27 22.5 27H8.5C7.67157 27 7 26.3284 7 25.5V7.5Z"
              fill="#0C4A6E"
              stroke="#7DD3FC"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            {/* Coin plié */}
            <path
              d="M18 6V12H24"
              stroke="#7DD3FC"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Lignes de texte */}
            <line x1="10" y1="15.5" x2="18" y2="15.5" stroke="#E0F2FE" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="10" y1="19" x2="16" y2="19" stroke="#BAE6FD" strokeWidth="1.6" strokeLinecap="round" />

            {/* Loupe de recherche */}
            <circle cx="20.5" cy="15.5" r="5.5" fill="#1D4ED8" stroke="white" strokeWidth="1.8" />
            <circle cx="20.5" cy="15.5" r="5.5" fill="url(#glass-grad)" />
            <line x1="24.5" y1="19.5" x2="28" y2="23" stroke="white" strokeWidth="2.4" strokeLinecap="round" />

            {/* Reflet de la loupe */}
            <path
              d="M17.7 12.7C18.6 11.9 19.8 11.5 21 11.8"
              stroke="#BAE6FD"
              strokeWidth="1.3"
              strokeLinecap="round"
            />

            {/* Étoile scintillante */}
            <circle
              cx="11"
              cy="22.5"
              r="1.2"
              fill="#FBBF24"
              className="animate-isj-twinkle"
              style={{ transformOrigin: "11px 22.5px" }}
            />

            <defs>
              <linearGradient
                id="glass-grad"
                x1="16"
                y1="11"
                x2="24"
                y2="20"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#60A5FA" />
                <stop offset="1" stopColor="#1E40AF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Brand Name & Academic Badge */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center space-x-2">
          <span
            className={`${titleSizes[size]} font-black tracking-tight ${
              isDark ? "text-white" : "text-slate-900 dark:text-white"
            }`}
          >
            Revisio
            <span className="text-blue-600 font-extrabold animate-isj-dot">.</span>
          </span>
        </div>

        {showSubtitle && (
          <p
            className={`text-[10px] font-semibold tracking-wide uppercase ${
              isDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Portail Académique des Épreuves
          </p>
        )}
      </div>
    </div>
  );
};

export default AppLogo;