import React, { useState } from "react";
import { DocumentModel } from "../types";
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Printer,
  CheckCircle,
  Share2
} from "lucide-react";

interface PdfViewerModalProps {
  document: DocumentModel | null;
  onClose: () => void;
  onDownload: (doc: DocumentModel) => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  document: doc,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open(doc.fichierUrl, "_blank");
    if (printWindow) {
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-slate-900 font-extrabold text-sm sm:text-base truncate">
                {doc.titre}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-indigo-700 font-bold">{doc.matiere}</span>
                <span>•</span>
                <span>{doc.semestre}</span>
                <span>•</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-700 dark:text-slate-200 font-bold uppercase">
                  {doc.typeEpreuve} ({doc.anneeAcademique})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyLink}
              title="Copier le lien de l'épreuve"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors text-xs flex items-center space-x-1"
            >
              <Share2 className="w-4 h-4" />
              {copied && <span className="text-emerald-600 font-bold text-[10px]">Copié !</span>}
            </button>
            <button
              onClick={handlePrint}
              title="Imprimer"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors hidden sm:flex"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(doc)}
              className="px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-full transition-all flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Télécharger PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: PDF Iframe + Metadata Drawer */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* Main PDF View Area */}
          <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 flex flex-col">
            <iframe
              src={doc.fichierUrl}
              title={doc.titre}
              className="w-full h-full border-none"
            />
          </div>

          {/* Right Info Panel */}
          <div className="w-full lg:w-72 bg-white dark:bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-700 p-5 space-y-4 overflow-y-auto">
            <div>
              <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                Informations Épreuve
              </h4>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium uppercase mb-0.5">Matière Académique</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">{doc.matiere}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium uppercase">Semestre</span>
                    <span className="font-bold text-slate-900">{doc.semestre}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium uppercase">Type d'épreuve</span>
                    <span className="font-bold text-indigo-700">{doc.typeEpreuve}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Année Académique:</span>
                    <span className="font-bold text-slate-900">{doc.anneeAcademique}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Statut:</span>
                    <span className="text-emerald-700 font-bold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{doc.statut}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Téléchargements:</span>
                    <span className="font-mono text-indigo-900 font-bold">{doc.telechargementsCount}</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-50/70 dark:bg-indigo-500/10 rounded-2xl border border-indigo-100 dark:border-indigo-500/30 text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1">
                  <span className="font-bold block text-indigo-950">Institut Universitaire Saint Jean</span>
                  <p className="leading-relaxed">
                    Document certifié conforme et validé par l'administration académique.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={doc.fichierUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir en plein écran</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
