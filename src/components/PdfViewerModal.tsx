import React, { useEffect, useRef, useState } from "react";
import { DocumentModel } from "../types";
import {
  X,
  Download,
  FileText,
  CheckCircle,
  Share2,
  ShieldCheck,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface PdfViewerModalProps {
  document: DocumentModel | null;
  onClose: () => void;
  onDownload: (doc: DocumentModel) => void;
}

const PdfPageCanvas: React.FC<{
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  scale: number;
}> = ({ pdfDoc, pageNumber, scale }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: pdfjsLib.RenderTask | null = null;

    pdfDoc
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled || !canvasRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const outputViewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = Math.floor(outputViewport.width);
        canvas.height = Math.floor(outputViewport.height);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: ctx,
          viewport: outputViewport,
          canvas,
        });
        return renderTask.promise;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {
          // ignore cancellation
        }
      }
    };
  }, [pdfDoc, pageNumber, scale]);

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 mx-auto">
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
    </div>
  );
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  document: doc,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);
  const [concealed, setConcealed] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) {
      setPdfDoc(null);
      setNumPages(0);
      setPreviewError(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    setPdfDoc(null);
    setNumPages(0);
    setPreviewError(null);
    setIsLoading(true);
    const token = localStorage.getItem("isj_auth_token");

    const previewEndpoint = doc.isContributionPreview
      ? `/api/contributions/${doc.id}/preview`
      : `/api/documents/${doc.id}/preview`;

    fetch(previewEndpoint, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || `Erreur HTTP ${response.status}`);
        }
        if (!response.headers.get("content-type")?.includes("application/pdf")) {
          throw new Error("Le serveur n’a pas renvoyé un fichier PDF.");
        }
        return response.arrayBuffer();
      })
      .then(async (buffer) => {
        if (controller.signal.aborted) return;
        loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
        const loadedPdf = await loadingTask.promise;
        if (controller.signal.aborted) {
          loadingTask.destroy().catch(() => undefined);
          return;
        }
        setPdfDoc(loadedPdf);
        setNumPages(loadedPdf.numPages);
        setIsLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          console.error("Échec du chargement de l’aperçu PDF :", error);
          setPreviewError(
            error.message || "Impossible de charger ce document. Réessayez ou téléchargez le PDF."
          );
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
      if (loadingTask) {
        loadingTask.destroy().catch(() => undefined);
      }
    };
  }, [doc?.id, doc?.isContributionPreview]);

  // Réaffiche l'aperçu à chaque changement de document
  useEffect(() => {
    setConcealed(false);
    setScale(window.innerWidth < 640 ? 0.65 : 1.15);
  }, [doc?.id]);

  // Masque l'aperçu dès que l'onglet perd la visibilité (anti-capture)
  useEffect(() => {
    const onVisibility = () => setConcealed(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

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
              <h3 className="text-slate-900 dark:text-white font-extrabold text-sm sm:text-base truncate">
                {doc.titre}
              </h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="text-blue-700 dark:text-blue-400 font-bold">{doc.matiere}</span>
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

        {/* Bandeau anti-capture + contrôles de zoom */}
        <div className="px-4 sm:px-6 py-2 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 flex items-center justify-between gap-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
          <div className="flex items-center space-x-2 truncate">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="truncate">
              Aperçu en lecture seule — Revisio {numPages > 0 ? `(${numPages} page${numPages > 1 ? "s" : ""})` : ""}
            </span>
          </div>
          {pdfDoc && (
            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => setScale((s) => Math.max(0.5, Number((s - 0.2).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-500/20 transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[10px]">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-500/20 transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScale(window.innerWidth < 640 ? 0.65 : 1.15)}
                className="p-1 rounded-lg hover:bg-amber-200/60 dark:hover:bg-amber-500/20 transition-colors"
                title="Réinitialiser le zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Content Body: PDF Canvas Pages + Metadata Drawer */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
          {/* Main PDF View Area */}
          <div className="flex-1 relative bg-slate-200 dark:bg-slate-800 flex flex-col overflow-hidden">
            {pdfDoc && numPages > 0 ? (
              <div className="flex-1 overflow-auto p-3 sm:p-6 space-y-6">
                {Array.from({ length: numPages }, (_, idx) => (
                  <PdfPageCanvas
                    key={idx + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={idx + 1}
                    scale={scale}
                  />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {previewError
                    ? previewError
                    : isLoading
                      ? "Chargement du document…"
                      : "Impossible de charger ce document. Réessayez ou téléchargez le PDF."}
                </p>
              </div>
            )}
            {/* Voile de masquage quand l'onglet perd la visibilité */}
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
                    <span className="font-bold text-slate-900 dark:text-white">{doc.semestre}</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-medium uppercase">Type d'épreuve</span>
                    <span className="font-bold text-blue-700 dark:text-blue-400">{doc.typeEpreuve}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Année Académique:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{doc.anneeAcademique}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Statut:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center space-x-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{doc.statut}</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Téléchargements:</span>
                    <span className="font-mono text-blue-900 dark:text-blue-300 font-bold">{doc.telechargementsCount}</span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/30 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <span className="font-bold block text-blue-950 dark:text-blue-100">Institut Universitaire Saint Jean</span>
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

