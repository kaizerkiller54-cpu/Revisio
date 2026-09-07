import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-[3px]",
  lg: "w-9 h-9 border-4",
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = "sm", className = "" }) => {
  return (
    <span
      role="status"
      aria-label="Chargement en cours..."
      className={`inline-block rounded-full border-slate-300 border-t-current border-r-transparent animate-spin ${sizeMap[size]} ${className}`}
    />
  );
};
