import React, { useState, useMemo } from "react";
import { DocumentModel, Semestre, EpreuveType } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { Reveal } from "../components/motion";
import {
  Bookmark,
  Search,
  BookOpen,
  Filter,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Layers,
  X
} from "lucide-react";

interface FavoritesViewProps {
  documents: DocumentModel[];
  favoriteIds: string[];
  onToggleFavorite: (doc: DocumentModel) => void;
  onViewDoc: (doc: DocumentModel) => void;
  onDownloadDoc: (doc: DocumentModel) => void;
  onNavigateToExams: () => void;
  downloadingDocId?: string | null;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  documents,
  favoriteIds,
  onToggleFavorite,
  onViewDoc,
  onDownloadDoc,
  onNavigateToExams,
  downloadingDocId = null,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemestre, setSelectedSemestre] = useState<string>("Tous");
  const [selectedType, setSelectedType] = useState<string>("Tous");
  const [selectedMatiere, setSelectedMatiere] = useState<string>("Toutes");

  // Filter documents to only include those in favorites
  const favoriteDocs = useMemo(() => {
    return documents.filter((doc) => favoriteIds.includes(doc.id));
  }, [documents, favoriteIds]);

  // Extract unique subjects from favorites for smart filtering
  const availableMatieres = useMemo(() => {
    return Array.from(new Set(favoriteDocs.map((d) => d.matiere))).sort();
  }, [favoriteDocs]);

  // Apply in-memory search and filters on favorites
  const filteredFavorites = useMemo(() => {
    return favoriteDocs.filter((doc) => {
      if (selectedSemestre !== "Tous" && doc.semestre !== selectedSemestre) {
        return false;
      }
      if (selectedType !== "Tous" && doc.typeEpreuve !== selectedType) {
        return false;
      }
      if (selectedMatiere !== "Toutes" && doc.matiere !== selectedMatiere) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = doc.titre.toLowerCase().includes(query);
        const matchesMatiere = doc.matiere.toLowerCase().includes(query);
        const matchesYear = doc.anneeAcademique.toLowerCase().includes(query);
        const matchesType = doc.typeEpreuve.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMatiere && !matchesYear && !matchesType) {
          return false;
        }
      }
      return true;
    });
  }, [favoriteDocs, selectedSemestre, selectedType, selectedMatiere, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedSemestre !== "Tous" ||
    selectedType !== "Tous" ||
    selectedMatiere !== "Toutes";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSemestre("Tous");
    setSelectedType("Tous");
    setSelectedMatiere("Toutes");
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header Banner */}
      <Reveal>
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-slate-800/60 dark:to-slate-900 border border-amber-200 dark:border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-500/30">
                <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
                <span>Espace Personnel Étudiant</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Mes Épreuves Favorites
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Votre carnet de révision personnel. Enregistrez les anciennes épreuves dont vous avez le plus besoin pour les retrouver instantanément avant vos sessions d'évaluation.
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white dark:bg-slate-800/90 border border-amber-200/80 dark:border-amber-500/30 rounded-2xl p-4 text-center min-w-[120px] shadow-xs">
                <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                  {favoriteDocs.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {favoriteDocs.length > 1 ? "Épreuves sauvées" : "Épreuve sauvée"}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-center min-w-[120px] shadow-xs">
                <div className="text-2xl font-black text-blue-700 dark:text-blue-400 font-mono">
                  {availableMatieres.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {availableMatieres.length > 1 ? "Matières ciblées" : "Matière ciblée"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Main Content Area */}
      {favoriteDocs.length === 0 ? (
        /* Empty State when no favorites at all */
        <Reveal delay={0.1}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-14 text-center space-y-6 shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-500/15 text-amber-500 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner border border-amber-100 dark:border-amber-500/30">
              <Bookmark className="w-10 h-10" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Vous n'avez pas encore d'épreuves favorites
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Lorsque vous explorez les épreuves du campus ISJ, cliquez sur l'icône de signet{" "}
                <Bookmark className="w-3.5 h-3.5 inline text-amber-500 fill-amber-400 mx-0.5" />{" "}
                sur une fiche pour la retrouver directement ici dans vos révisions.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onNavigateToExams}
                className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                <span>Explorer les épreuves disponibles</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 max-w-2xl mx-auto border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Accès rapide</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Gardez sous la main les sujets types avant chaque évaluation.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Organisation ciblée</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Filtrez vos favoris par matière, session normale ou rattrapage.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Révisions efficaces</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Téléchargement instantané avec filigrane officiel ISJ.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        /* Favorites Grid with Filters */
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search input */}
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher dans mes favoris (matière, titre, année)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subject dropdown */}
              <div>
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="Toutes">Toutes les matières ({availableMatieres.length})</option>
                  {availableMatieres.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam type dropdown */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="Tous">Tous types d'épreuves</option>
                  <option value="SN">Session Normale (SN)</option>
                  <option value="CC">Contrôle Continu (CC)</option>
                  <option value="SR">Session Rattrapage (SR)</option>
                  <option value="TD">Travaux Dirigés (TD)</option>
                  <option value="TP">Travaux Pratiques (TP)</option>
                  <option value="Cours">Cours</option>
                </select>
              </div>
            </div>

            {/* Filter tags & Semester Switch */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Semestre :</span>
                </span>
                {["Tous", "Semestre 1", "Semestre 2"].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemestre(sem)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedSemestre === sem
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center space-x-1 font-semibold"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>
          </div>

          {/* Results count label */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 font-medium">
            <span>
              Affichage de <strong className="text-slate-800 dark:text-slate-200">{filteredFavorites.length}</strong> sur{" "}
              {favoriteDocs.length} épreuve(s) favorite(s)
            </span>
            <button
              onClick={onNavigateToExams}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold hover:underline flex items-center space-x-1"
            >
              <span>Ajouter d'autres épreuves</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Cards Grid or filtered empty state */}
          {filteredFavorites.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
              <Search className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Aucun favori ne correspond à vos filtres
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Essayez d'ajuster votre recherche ou de réinitialiser les filtres sélectionnés.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              >
                Effacer les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFavorites.map((doc, i) => (
                <Reveal key={doc.id} delay={Math.min(i * 0.05, 0.3)}>
                  <DocumentCard
                    document={doc}
                    onView={onViewDoc}
                    onDownload={onDownloadDoc}
                    isFavorite={true}
                    onToggleFavorite={onToggleFavorite}
                    isDownloading={downloadingDocId === doc.id}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
