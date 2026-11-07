import React from "react";
import { DocumentModel } from "../types";
import { FileText, Download, Eye, Calendar, BookOpen, Tag, Bookmark, Loader2 } from "lucide-react";

interface DocumentCardProps {
  document: DocumentModel;
  onView: (doc: DocumentModel) => void;
  onDownload: (doc: DocumentModel) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (doc: DocumentModel) => void;
  isDownloading?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onView,
  onDownload,
  isFavorite = false,
  onToggleFavorite,
  isDownloading = false,
}) => {
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "CC":
        return {
          label: "CC",
          fullLabel: "Contrôle Continu",
          color: "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20",
        };
      case "SN":
        return {
          label: "SN",
          fullLabel: "Session Normale",
          color: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-500/20",
        };
      case "SR":
        return {
          label: "SR",
          fullLabel: "Session Rattrapage",
          color: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-500/20",
        };
      case "TD":
        return {
          label: "TD",
          fullLabel: "Travaux Dirigés",
          color: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-500/20",
        };
      case "TP":
        return {
          label: "TP",
          fullLabel: "Travaux Pratiques",
          color: "bg-sky-50 dark:bg-sky-400/15 text-sky-600 dark:text-sky-300 border-sky-100 dark:border-sky-400/20",
        };
      case "Cours":
        return {
          label: "Cours",
          fullLabel: "Cours",
          color: "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-500/20",
        };
      default:
        return {
          label: type,
          fullLabel: type,
          color: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
        };
    }
  };

  const badge = getTypeBadge(doc.typeEpreuve);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider min-w-0 truncate whitespace-nowrap overflow-hidden ${badge.color}`}
            title={badge.fullLabel}
          >
            {badge.label} • {badge.fullLabel}
          </span>
          <div className="flex items-center space-x-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center space-x-1 shrink-0">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{doc.anneeAcademique}</span>
            </span>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(doc);
                }}
                aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
                className={`p-1 rounded-full transition-all active:scale-90 cursor-pointer ${
                  isFavorite
                    ? "bg-amber-50 dark:bg-amber-500/20 text-amber-500 border border-amber-300 dark:border-amber-500/40 shadow-xs"
                    : "text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <Bookmark
                  className={`w-3.5 h-3.5 transition-transform ${
                    isFavorite ? "fill-amber-400 text-amber-500 scale-105" : ""
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => onView(doc)}
          className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors cursor-pointer mb-2 line-clamp-2 leading-snug"
        >
          {doc.titre}
        </h3>

        {/* Details tags */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-900 min-w-0 break-words">{doc.matiere}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-slate-500">{doc.semestre}</span>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mt-2">
        <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="flex items-center space-x-1" title="Téléchargements">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>{doc.telechargementsCount || 0}</span>
          </span>
          <span className="flex items-center space-x-1" title="Format PDF">
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>PDF</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(doc)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" />
            <span>Voir</span>
          </button>
          <button
            onClick={() => onDownload(doc)}
            disabled={isDownloading}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm ${
              isDownloading
                ? "bg-amber-600 dark:bg-amber-700 text-white cursor-wait animate-pulse"
                : "bg-blue-900 hover:bg-blue-800 text-white active:scale-95"
            }`}
            title={isDownloading ? "Téléchargement en cours..." : "Télécharger l'épreuve PDF"}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>En cours...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
