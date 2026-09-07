import React from "react";
import { DocumentModel } from "../types";
import { FileText, Download, Eye, Calendar, BookOpen, Tag } from "lucide-react";

interface DocumentCardProps {
  document: DocumentModel;
  onView: (doc: DocumentModel) => void;
  onDownload: (doc: DocumentModel) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onView,
  onDownload,
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
          color: "bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-100 dark:border-purple-500/20",
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}
            title={badge.fullLabel}
          >
            {badge.label} • {badge.fullLabel}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 flex items-center space-x-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{doc.anneeAcademique}</span>
          </span>
        </div>

        {/* Title */}
        <h3
          onClick={() => onView(doc)}
          className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors cursor-pointer mb-2 line-clamp-2 leading-snug"
        >
          {doc.titre}
        </h3>

        {/* Details tags */}
        <div className="space-y-1.5 mb-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold text-slate-900">{doc.matiere}</span>
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
            <FileText className="w-3.5 h-3.5 text-indigo-500" />
            <span>PDF</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(doc)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-600" />
            <span>Voir</span>
          </button>
          <button
            onClick={() => onDownload(doc)}
            className="px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold transition-all flex items-center space-x-1 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
