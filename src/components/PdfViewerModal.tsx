import React, { useEffect, useMemo, useState } from "react";
import { DocumentModel, User } from "../types";
import {
  X,
  Download,
  FileText,
  CheckCircle,
  Share2,
  ShieldCheck,
  EyeOff,
} from "lucide-react";

interface PdfViewerModalProps {
  document: DocumentModel | null;
  user?: User | null;
  onClose: () => void;
  onDownload: (doc: DocumentModel) => void;
}

const escapeXml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  document: doc,
  user,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);
  const [concealed, setConcealed] = useState(false);

  // Réaffiche l'aperçu à chaque changement de document
  useEffect(() => {
    setConcealed(false);
  }, [doc?.id]);

  // Masque l'aperçu dès que l'onglet perd le focus (anti-capture)
  useEffect(() => {
    const onVisibility = () => setConcealed(document.hidden);
    const onBlur = () => setConcealed(true);
    const onFocus = () => setConcealed(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Filigrane "REVISIO" en mosaïque + e-mail discret (traçabilité anti-fuite)
  const watermarkUrl = useMemo(() => {
    if (!doc) return null;
    const line2 = user?.email || "Apercu protege";
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='380' height='260'>` +
      `<text x='50%' y='44%' font-size='30' font-family='sans-serif' font-weight='900' ` +
      `fill='#1e3a8a' fill-opacity='0.20' text-anchor='middle' letter-spacing='4' ` +
      `transform='rotate(-28 190 114)'>REVISIO</text>` +
      `<text x='50%' y='58%' font-size='11' font-family='sans-serif' ` +
      `fill='#1e3a8a' fill-opacity='0.15' text-anchor='middle' ` +
      `transform='rotate(-28 190 151)'>${escapeXml(line2)}</text>` +
      `</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }, [doc, user]);

  if (!doc) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn select-none print:hidden"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="bg-white dark:bg-slate-900 px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-slate-900 font-extrabold text-sm sm:text-base truncate">
                {doc.titre}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-blue-700 font-bold">{doc.matiere}</span>
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
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-colors text-xs flex items-center space-x-1"
            >
              <Share2 className="w-4 h-4" />
              {copied && <span className="text-emerald-600 font-bold text-[10px]">Copié !</span>}
            </button>
            <button
              onClick={() => onDownload(doc)}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-full transition-all flex items-center space-x-1.5 shadow-sm"
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

        {/* Bandeau anti-capture */}
        <div className="px-4 sm:px-6 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 flex items-center space-x-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span className="truncate">
            Aperçu en lecture seule — Revisio
          </span>
        </div>

        {/* Content Body: PDF Iframe + Metadata Drawer */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* Main PDF View Area */}
          <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 flex flex-col overflow-hidden">
            <iframe
              src={doc.fichierUrl}
              title={doc.titre}
              className="w-full h-full border-none"
            />
            {/* Filigrane nominatif en mosaïque par-dessus l'aperçu */}
            {watermarkUrl && !concealed && (
              <div
                aria-hidden
                className="absolute inset-0 z-10 pointer-events-none"
                style={{ backgroundImage: watermarkUrl, backgroundRepeat: "repeat" }}
              />
            )}
            {/* Voile de masquage quand l'onglet perd le focus */}
            {concealed && (
              <div className="absolute inset-0 z-20 bg-slate-900/95 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <EyeOff className="w-8 h-8 text-amber-400" />
                <p className="text-white font-bold text-sm">
                  Aperçu masqué pour protéger le document
                </p>
                <p className="text-slate-300 text-xs">
                  Revenez sur cet onglet, puis réaffichez l'aperçu.
                </p>
                <button
                  onClick={() => setConcealed(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full transition-colors"
                >
                  Réafficher l'aperçu
                </button>
              </div>
            )}
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
                    <span className="font-bold text-blue-700">{doc.typeEpreuve}</span>
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
                    <span className="font-mono text-blue-900 font-bold">{doc.telechargementsCount}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/30 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <span className="font-bold block text-blue-950">Institut Universitaire Saint Jean</span>
                  <p className="leading-relaxed">
                    Document certifié conforme et validé par l'administration académique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
