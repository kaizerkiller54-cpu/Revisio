import React, { useState, useMemo } from "react";
import { DocumentModel } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { Reveal } from "../components/motion";
import {
  Bookmark,
  Search,
  BookOpen,
  Filter,
  ArrowRight,
  GraduationCap,
  Layers,
  FileCheck2,
  X,
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

  const s1Count = useMemo(
    () => favoriteDocs.filter((d) => d.semestre === "Semestre 1").length,
    [favoriteDocs]
  );
  const s2Count = useMemo(
    () => favoriteDocs.filter((d) => d.semestre === "Semestre 2").length,
    [favoriteDocs]
  );

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
    <div className="space-y-6 pb-12">
      {/* En-tête Institutionnel aligné sur Matières & Épreuves */}
      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 text-[11px] font-bold mb-2">
              <Bookmark className="w-3 h-3 fill-blue-700 dark:fill-blue-300" />
              <span>Bibliothèque Personnelle • Niveau 1 Ingénieur</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
              <Bookmark className="w-7 h-7 text-blue-700 dark:text-blue-400 shrink-0" />
              <span>Mes Épreuves Favorites</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Retrouvez et organisez les sujets d'examens (CC, SN, SR, TD, TP) sélectionnés pour vos séances de révision.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-xl text-slate-700 dark:text-slate-300 font-medium shadow-xs flex items-center gap-2">
              <Bookmark className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 fill-blue-700 dark:fill-blue-400" />
              <span>
                <strong className="text-blue-900 dark:text-blue-300 font-bold tabular-nums">
                  {favoriteDocs.length}
                </strong>{" "}
                épreuve{favoriteDocs.length > 1 ? "s" : ""} enregistrée{favoriteDocs.length > 1 ? "s" : ""}
              </span>
            </div>
            {favoriteDocs.length > 0 && (
              <button
                onClick={onNavigateToExams}
                className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* Contenu Principal */}
      {favoriteDocs.length === 0 ? (
        /* État vide institutionnel sobre et professionnel */
        <Reveal delay={0.08}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-12 text-center space-y-6 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-500/30 shadow-xs">
              <Bookmark className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                Aucune épreuve enregistrée dans vos favoris
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Lors de votre consultation du catalogue d'épreuves ISJ, cliquez sur l'icône de signet{" "}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 align-middle mx-0.5">
                  <Bookmark className="w-3 h-3 fill-blue-700 dark:fill-blue-300" />
                </span>{" "}
                située en haut à droite d'une fiche pour l'ajouter à votre sélection personnelle.
              </p>
            </div>

            <div>
              <button
                onClick={onNavigateToExams}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:scale-95 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
              >
                <span>Parcourir le catalogue des épreuves</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 max-w-3xl mx-auto border-t border-slate-100 dark:border-slate-800 text-left">
              <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span>Accès direct</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Centralisez les annales prioritaires pour préparer vos Contrôles Continus et Sessions Normales.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span>Classement par UE</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Filtrez votre sélection par matière, semestre ou type d'évaluation en un clic.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 rounded-xl space-y-1">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-3.5 h-3.5" />
                  </div>
                  <span>Consultation & PDF</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Visualisez les sujets dans la liseuse intégrée ou téléchargez les PDF certifiés ISJ.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      ) : (
        /* Grille des favoris avec indicateurs et barre de filtres institutionnelle */
        <div className="space-y-5">
          {/* Bandeau de synthèse statistique */}
          <Reveal delay={0.05}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                  <Bookmark className="w-5 h-5 fill-blue-700 dark:fill-blue-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                    {favoriteDocs.length}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Épreuve{favoriteDocs.length > 1 ? "s" : ""} favorite{favoriteDocs.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                    {availableMatieres.length}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Matière{availableMatieres.length > 1 ? "s" : ""} couverte{availableMatieres.length > 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  S1
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                    {s1Count}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Semestre 1
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 font-mono font-bold text-xs">
                  S2
                </div>
                <div className="min-w-0">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums leading-tight">
                    {s2Count}
                  </div>
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    Semestre 2
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Barre de recherche et filtres harmonisée */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Recherche textuelle */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Rechercher dans mes favoris (matière, titre, année)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Effacer la recherche"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sélecteur de matière */}
              <div>
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="Toutes">Toutes les matières ({availableMatieres.length})</option>
                  {availableMatieres.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sélecteur de type d'épreuve */}
              <div>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="Tous">Tous types d'épreuves</option>
                  <option value="CC">Contrôle Continu (CC)</option>
                  <option value="SN">Session Normale (SN)</option>
                  <option value="SR">Session Rattrapage (SR)</option>
                  <option value="TD">Travaux Dirigés (TD)</option>
                  <option value="TP">Travaux Pratiques (TP)</option>
                  <option value="Cours">Cours</option>
                </select>
              </div>
            </div>

            {/* Filtre par semestre & Réinitialisation */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Semestre :</span>
                </span>
                {["Tous", "Semestre 1", "Semestre 2"].map((sem) => (
                  <button
                    key={sem}
                    onClick={() => setSelectedSemestre(sem)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      selectedSemestre === sem
                        ? "bg-blue-900 text-white dark:bg-blue-600 shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  <strong className="text-blue-900 dark:text-blue-300 font-bold tabular-nums">
                    {filteredFavorites.length}
                  </strong>{" "}
                  sur {favoriteDocs.length} affichée{filteredFavorites.length > 1 ? "s" : ""}
                </span>

                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Grille de résultats ou message aucun résultat filtré */}
          {filteredFavorites.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Aucune épreuve favorite ne correspond à ces critères
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Modifiez vos mots-clés ou réinitialisez les filtres de semestre et de matière pour afficher toutes vos épreuves sauvegardées.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-1 px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
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
