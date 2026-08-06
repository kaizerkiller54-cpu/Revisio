import React from "react";
import { FileSearch } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  dark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", showText = true, dark = false }) => {
  const containerSizes = {
    sm: "w-8 h-8 rounded-lg",
    md: "w-10 h-10 rounded-xl",
    lg: "w-12 h-12 rounded-2xl",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div className="flex items-center space-x-3 select-none">
      {/* Loupe + Document Icon Container */}
      <div
        className={`${containerSizes[size]} bg-indigo-900 text-white flex items-center justify-center shadow-sm border border-indigo-800 shrink-0 relative`}
      >
        <FileSearch className={`${iconSizes[size]} text-indigo-100`} />
      </div>

      {showText && (
        <div>
          <div className="flex items-center space-x-2">
            <span className={`font-extrabold leading-tight tracking-tight ${dark ? "text-white text-lg" : "text-slate-900 text-base"}`}>
              Revisio
            </span>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-bold uppercase tracking-wide">
              ISJ N1
            </span>
          </div>
          <p className={`text-[10px] uppercase font-medium hidden sm:block ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Portail Académique des Épreuves
          </p>
        </div>
      )}
    </div>
  );
};
