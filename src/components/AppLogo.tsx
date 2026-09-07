import React from "react";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  showSubtitle?: boolean;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = "md",
  variant = "light",
  showSubtitle = true,
}) => {
  const isDark = variant === "dark";

  const iconContainerSizes = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-12 h-12 rounded-2xl",
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
      <div
        className={`${iconContainerSizes[size]} bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 flex items-center justify-center text-white shadow-md border border-indigo-700/60 transition-transform duration-300 group-hover:scale-105 shrink-0 relative overflow-hidden`}
      >
        {/* Subtle Ambient Ray Background */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/30 via-sky-400/20 to-indigo-300/10 opacity-90" />
        
        {/* Custom UI/UX Vector Emblem: Academic Shield + Folded Exam Sheet + Graduation Spark */}
        <svg
          className={`${svgSizes[size]} relative z-10 text-white transform transition-transform group-hover:rotate-2`}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Shield Boundary */}
          <path
            d="M16 29C16 29 26 23.5 26 15.5V6.5L16 2.5L6 6.5V15.5C6 23.5 16 29 16 29Z"
            fill="url(#shield-grad)"
            stroke="#6366F1"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Academic Exam Document with Folded Corner */}
          <path
            d="M10.5 9.5C10.5 8.94772 10.9477 8.5 11.5 8.5H18.5L21.5 11.5V20.5C21.5 21.0523 21.0523 21.5 20.5 21.5H11.5C10.9477 21.5 10.5 21.0523 10.5 20.5V9.5Z"
            fill="#1E1B4B"
            stroke="#93C5FD"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />

          {/* Folded corner detail */}
          <path
            d="M18.5 8.5V11.5H21.5"
            stroke="#93C5FD"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Exam text line indicators */}
          <line
            x1="13"
            y1="13.5"
            x2="19"
            y2="13.5"
            stroke="white"
            strokeWidth="1.25"
            strokeLinecap="round"
          />
          <line
            x1="13"
            y1="16"
            x2="17"
            y2="16"
            stroke="#A5B4FC"
            strokeWidth="1.25"
            strokeLinecap="round"
          />

          {/* Graduation Cap Diamond Emblem Top */}
          <path
            d="M16 4.5L9 8L16 11.5L23 8L16 4.5Z"
            fill="#38BDF8"
            stroke="white"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Gold Academic Star Accent */}
          <circle cx="21" cy="20" r="1.5" fill="#FBBF24" />

          <defs>
            <linearGradient
              id="shield-grad"
              x1="6"
              y1="2.5"
              x2="26"
              y2="29"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#1E1B4B" />
              <stop offset="1" stopColor="#020617" />
            </linearGradient>
          </defs>
        </svg>
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
            <span className="text-indigo-600 font-extrabold">.</span>
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

