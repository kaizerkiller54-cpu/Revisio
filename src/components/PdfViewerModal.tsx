import React, { useEffect, useRef, useState } from "react";
import { DocumentModel } from "../types";
import { getAuthHeader } from "../lib/api";
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
  Loader2,
  Info,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function triggerHaptic(pattern: number | number[] = 10) {
  try {
    const raw = localStorage.getItem("revisio_user_preferences_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hapticFeedbackEnabled === false) return;
    }
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
    }
  } catch {
    // Ignore unsupported environments
  }
}

interface PdfViewerModalProps {
  document: DocumentModel | null;
  onClose: () => void;
  onDownload: (doc: DocumentModel) => void;
  isDownloading?: boolean;
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
    <div className="bg-white shadow-md rounded-xl overflow-hidden border border-slate-300/80 dark:border-slate-700 mx-auto">
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
    </div>
  );
};

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  document: doc,
  onClose,
  onDownload,
  isDownloading = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [concealed, setConcealed] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
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
      setShowMobileInfo(false);
      return;
    }

    const controller = new AbortController();
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    setPdfDoc(null);
    setNumPages(0);
    setPreviewError(null);
    setIsLoading(true);
    const previewEndpoint = doc.isContributionPreview
      ? `/api/contributions/${doc.id}/preview`
      : `/api/documents/${doc.id}/preview`;

    fetch(previewEndpoint, {
      credentials: "include",
      headers: { ...getAuthHeader() },
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
    setShowMobileInfo(false);
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

  // Touche Échap pour fermer
  useEffect(() => {
    if (!doc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMobileInfo) {
          setShowMobileInfo(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doc, showMobileInfo, onClose]);

  if (!doc) return null;

  const handleCopyLink = () => {
    triggerHaptic([10, 20, 10]);
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomOut = () => {
    triggerHaptic(8);
    setScale((s) => Math.max(0.45, Number((s - 0.15).toFixed(2))));
  };

  const handleZoomIn = () => {
    triggerHaptic(8);
    setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))));
  };

  const handleZoomReset = () => {
    triggerHaptic(10);
    setScale(window.innerWidth < 640 ? 0.65 : 1.15);
  };

  const renderDocumentInfoContent = () => (
    <div className="space-y-3 text-xs">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase tracking-wider mb-0.5">
          Matière Académique
        </span>
        <span className="font-extrabold text-slate-900 dark:text-white text-sm">
          {doc.matiere}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
            Semestre
          </span>
          <span className="font-bold text-slate-900 dark:text-white">{doc.semestre}</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-slate-500 dark:text-slate-400 block text-[10px] font-semibold uppercase tracking-wider">
            Type d'épreuve
          </span>
          <span className="font-bold text-blue-700 dark:text-blue-400">{doc.typeEpreuve}</span>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Année Académique</span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {doc.anneeAcademique}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Statut</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{doc.statut}</span>
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 dark:text-slate-400">Téléchargements</span>
          <span className="font-mono text-blue-900 dark:text-blue-300 font-bold tabular-nums">
            {doc.telechargementsCount}
          </span>
        </div>
      </div>

      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/25 text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
        <span className="font-bold block text-blue-950 dark:text-blue-100">
          Institut Universitaire Saint Jean
        </span>
        <p className="leading-relaxed text-blue-800/90 dark:text-blue-200/80">
          Document certifié conforme et validé par l'administration académique.
        </p>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-fadeIn select-none print:hidden"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200/80 dark:border-slate-800 rounded-t-[28px] sm:rounded-3xl w-full max-w-5xl h-[94svh] sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Soft Header Bar */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 sm:px-6 py-3 sm:py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/25 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-slate-900 dark:text-white font-extrabold text-xs sm:text-base truncate">
                {doc.titre}
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                <span className="text-blue-700 dark:text-blue-400 font-bold truncate">
                  {doc.matiere}
                </span>
                <span>•</span>
                <span className="shrink-0">{doc.semestre}</span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                  {doc.typeEpreuve} ({doc.anneeAcademique})
                </span>
              </div>
            </div>
          </div>

          {/* Top Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mobile Info Sheet Toggle (< lg) */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setShowMobileInfo((prev) => !prev);
              }}
              className={`lg:hidden h-9 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all active:scale-92 cursor-pointer touch-manipulation ${
                showMobileInfo
                  ? "bg-blue-50 dark:bg-blue-500/20 border-blue-200 dark:border-blue-500/40 text-blue-700 dark:text-blue-300"
                  : "bg-slate-100/90 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              }`}
              title="Informations sur l'épreuve"
            >
              <Info className="w-4 h-4" />
              <span className="hidden xs:inline">Infos</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleCopyLink}
              title="Copier le lien de l'épreuve"
              className="h-9 px-2.5 text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-500/15 border border-slate-200/70 dark:border-slate-700/70 rounded-xl transition-all text-xs flex items-center gap-1 active:scale-92 cursor-pointer touch-manipulation"
            >
              <Share2 className="w-4 h-4" />
              {copied && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                  Copié !
                </span>
              )}
            </button>

            {/* Download PDF CTA */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(12);
                onDownload(doc);
              }}
              disabled={isDownloading}
              className={`h-9 px-3.5 sm:px-4 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer touch-manipulation ${
                isDownloading
                  ? "bg-amber-600 dark:bg-amber-700 cursor-wait animate-pulse"
                  : "bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 active:scale-95"
              }`}
              title={isDownloading ? "Téléchargement en cours..." : "Télécharger le document PDF"}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span className="hidden sm:inline">Téléchargement...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Télécharger PDF</span>
                </>
              )}
            </button>

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                onClose();
              }}
              className="h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer touch-manipulation"
              title="Fermer l'aperçu"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Soft Read-Only Banner */}
        <div className="px-4 sm:px-6 py-1.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="truncate">
              Lecture protégée ISJ Revisio
              {numPages > 0 ? ` • ${numPages} page${numPages > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 tabular-nums shrink-0">
            Zoom {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Content Body: PDF Canvas Area + Desktop Right Info Panel */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950 relative">
          {/* Main PDF View Area */}
          <div className="flex-1 relative bg-slate-200/70 dark:bg-slate-950 flex flex-col overflow-hidden">
            {pdfDoc && numPages > 0 ? (
              <div className="flex-1 overflow-auto p-3 sm:p-6 pb-20 space-y-5">
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
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                {isLoading && (
                  <Loader2 className="w-7 h-7 text-blue-700 dark:text-blue-400 animate-spin" />
                )}
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-md">
                  {previewError
                    ? previewError
                    : isLoading
                    ? "Chargement des pages de l'épreuve..."
                    : "Impossible de charger ce document. Réessayez ou téléchargez le PDF."}
                </p>
              </div>
            )}

            {/* Floating Thumb-Zone Zoom & Page Control Bar */}
            {pdfDoc && numPages > 0 && !concealed && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2.5 py-1.5 rounded-2xl bg-slate-900/90 dark:bg-slate-900/95 text-white backdrop-blur-md shadow-xl border border-white/15">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="w-8 h-8 rounded-xl hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                  title="Zoom arrière"
                  aria-label="Zoom arrière"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="px-2.5 h-8 rounded-xl hover:bg-white/15 active:scale-95 font-mono text-xs font-bold tabular-nums flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                  title="Réinitialiser l'échelle"
                >
                  {Math.round(scale * 100)}%
                </button>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="w-8 h-8 rounded-xl hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                  title="Zoom avant"
                  aria-label="Zoom avant"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <div className="w-px h-4 bg-white/20 mx-0.5" />

                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="w-8 h-8 rounded-xl hover:bg-white/15 active:scale-90 flex items-center justify-center transition-all cursor-pointer touch-manipulation"
                  title="Ajuster à l'écran"
                  aria-label="Ajuster à l'écran"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <span className="hidden xs:inline-flex items-center pl-2 pr-1.5 text-[11px] font-semibold text-slate-300 border-l border-white/15 tabular-nums">
                  {numPages} p.
                </span>
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
                  type="button"
                  onClick={() => setConcealed(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Réafficher l'aperçu
                </button>
              </div>
            )}
          </div>

          {/* Desktop Right Info Panel (lg+) */}
          <div className="hidden lg:block w-72 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 p-5 space-y-4 overflow-y-auto shrink-0">
            <h4 className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Informations Épreuve
            </h4>
            {renderDocumentInfoContent()}
          </div>

          {/* Mobile Collapsible Info Bottom Sheet (< lg) */}
          {showMobileInfo && (
            <>
              <div
                className="lg:hidden absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-[2px]"
                onClick={() => setShowMobileInfo(false)}
              />
              <div className="lg:hidden absolute inset-x-0 bottom-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl p-4 pb-6 shadow-2xl space-y-3 animate-fadeIn max-h-[75%] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Détails de l'épreuve
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowMobileInfo(false)}
                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {renderDocumentInfoContent()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
