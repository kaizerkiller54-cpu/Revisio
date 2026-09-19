import React, { useState, useEffect } from "react";
import { DocumentModel } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { SearchFilters } from "../components/SearchFilters";
import { FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { searchDocumentsApi, SearchSuggestion } from "../lib/api";
import { useDebounce } from "../hooks/useDebounce";
import { Reveal } from "../components/motion";

interface ExamsViewProps {
  documents: DocumentModel[];
  onViewDoc: (doc: DocumentModel) => void;
  onDownloadDoc: (doc: DocumentModel) => void;
  initialFilters?: {
    search?: string;
    matiere?: string;
    semestre?: string;
    typeEpreuve?: string;
    anneeAcademique?: string;
  };
}

const PAGE_SIZE = 12;

export const ExamsView: React.FC<ExamsViewProps> = ({
  documents,
  onViewDoc,
  onDownloadDoc,
  initialFilters,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialFilters?.search || "");
  const [selectedMatiere, setSelectedMatiere] = useState(initialFilters?.matiere || "Toutes");
  const [selectedSemestre, setSelectedSemestre] = useState(initialFilters?.semestre || "Tous");
  const [selectedType, setSelectedType] = useState(initialFilters?.typeEpreuve || "Tous");
  const [selectedAnnee, setSelectedAnnee] = useState(initialFilters?.anneeAcademique || "Toutes");

  const [results, setResults] = useState<DocumentModel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.search !== undefined) setSearchQuery(initialFilters.search);
      if (initialFilters.matiere !== undefined) setSelectedMatiere(initialFilters.matiere);
      if (initialFilters.semestre !== undefined) setSelectedSemestre(initialFilters.semestre);
      if (initialFilters.typeEpreuve !== undefined) setSelectedType(initialFilters.typeEpreuve);
      if (initialFilters.anneeAcademique !== undefined) setSelectedAnnee(initialFilters.anneeAcademique);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilters?.matiere, initialFilters?.semestre, initialFilters?.typeEpreuve, initialFilters?.anneeAcademique, initialFilters?.search]);

  // Extract unique options (from the preloaded catalog for select dropdowns)
  const matieresOptions = Array.from(new Set(documents.map((d) => d.matiere))).sort();
  const anneesOptions = Array.from(new Set(documents.map((d) => d.anneeAcademique))).sort().reverse();

  // Server-side FTS search (debounced, hyper rapide)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    searchDocumentsApi({
      search: debouncedSearch || undefined,
      matiere: selectedMatiere,
      semestre: selectedSemestre,
      typeEpreuve: selectedType,
      anneeAcademique: selectedAnnee,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => {
        if (cancelled) return;
        setResults(res.data);
        setTotal(res.total);
        setLoading(false);
        setHasFetched(true);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setTotal(0);
        setLoading(false);
        setHasFetched(true);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedMatiere, selectedSemestre, selectedType, selectedAnnee, page]);

  const goToPage = (p: number) => {
    setPage(Math.max(1, Math.min(p, Math.max(1, Math.ceil(total / PAGE_SIZE)))));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMatiere("Toutes");
    setSelectedSemestre("Tous");
    setSelectedType("Tous");
    setSelectedAnnee("Toutes");
    setPage(1);
  };

  const handlePickSuggestion = (s: SearchSuggestion) => {
    setSearchQuery(s.titre);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <Reveal>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center space-x-2">
            <FileText className="w-7 h-7 text-blue-700" />
            <span>Catalogue des Épreuves</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez et téléchargez les sujets d'examens de l'ISJ Ingénieur Niveau 1.
          </p>
        </div>
        <div className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full text-slate-700 dark:text-slate-300 font-medium self-start sm:self-auto shadow-sm">
          {loading ? (
            <span className="flex items-center space-x-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              <span>Recherche en cours...</span>
            </span>
          ) : (
            <>
              <strong className="text-blue-900 font-bold">{total}</strong> épreuve(s) trouvée(s)
            </>
          )}
        </div>
      </div>
      </Reveal>

      {/* Multi-criteria Search Bar & Filters */}
      <SearchFilters
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedMatiere={selectedMatiere}
        setSelectedMatiere={setSelectedMatiere}
        selectedSemestre={selectedSemestre}
        setSelectedSemestre={setSelectedSemestre}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedAnnee={selectedAnnee}
        setSelectedAnnee={setSelectedAnnee}
        matieresOptions={matieresOptions}
        anneesOptions={anneesOptions}
        onReset={handleResetFilters}
        onPickSuggestion={handlePickSuggestion}
      />

      {/* Active Filter Chips */}
      {(selectedMatiere !== "Toutes" || selectedSemestre !== "Tous" || selectedType !== "Tous" || selectedAnnee !== "Toutes") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Filtres actifs:</span>
          {selectedMatiere !== "Toutes" && (
            <span className="bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full font-semibold">
              Matière: {selectedMatiere}
            </span>
          )}
          {selectedSemestre !== "Tous" && (
            <span className="bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full font-semibold">
              Semestre: {selectedSemestre}
            </span>
          )}
          {selectedType !== "Tous" && (
            <span className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-500/30 px-3 py-1 rounded-full font-semibold">
              Type: {selectedType}
            </span>
          )}
          {selectedAnnee !== "Toutes" && (
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full font-semibold">
              Année: {selectedAnnee}
            </span>
          )}
        </div>
      )}

      {/* Exams Grid */}
      {loading && !hasFetched ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-semibold">Recherche en cours...</p>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {results.map((doc, i) => (
              <Reveal key={doc.id} delay={Math.min(i * 0.06, 0.4)}>
                <DocumentCard
                  document={doc}
                  onView={onViewDoc}
                  onDownload={onDownloadDoc}
                />
              </Reveal>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Page {page} / {totalPages}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
                className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-900 font-bold text-lg">Aucune épreuve trouvée</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Aucun document ne correspond à vos critères actuels. Essayez d'élargir votre recherche.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-full transition-colors shadow-sm"
          >
            Réinitialiser tous les filtres
          </button>
        </div>
      )}
    </div>
  );
};