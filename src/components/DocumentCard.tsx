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
          color: "bg-red-50 text-red-700 border-red-100",
        };
      case "SN":
        return {
          label: "SN",
          fullLabel: "Session Normale",
          color: "bg-blue-50 text-blue-700 border-blue-100",
        };
      case "SR":
        return {
          label: "SR",
          fullLabel: "Session Rattrapage",
          color: "bg-emerald-50 text-emerald-700 border-emerald-100",
        };
      default:
        return {
          label: type,
          fullLabel: type,
          color: "bg-slate-100 text-slate-700 border-slate-200",
        };
    }
  };

  const badge = getTypeBadge(doc.typeEpreuve);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.color}`}
            title={badge.fullLabel}
          >
            {badge.label} • {badge.fullLabel}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center space-x-1">
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
        <div className="space-y-1.5 mb-4 text-xs text-slate-600">
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
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
        <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
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
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1"
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
