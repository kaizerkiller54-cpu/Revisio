import React, { useState } from "react";
import { RotateCcw, SlidersHorizontal, X, BookOpen, Calendar, ChevronDown } from "lucide-react";
import { SearchSuggest } from "./SearchSuggest";
import { SearchSuggestion } from "../lib/api";

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

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedMatiere: string;
  setSelectedMatiere: (val: string) => void;
  selectedSemestre: string;
  setSelectedSemestre: (val: string) => void;
  selectedType: string;
  setSelectedType: (val: string) => void;
  selectedAnnee: string;
  setSelectedAnnee: (val: string) => void;
  matieresOptions: string[];
  anneesOptions: string[];
  onReset: () => void;
  onPickSuggestion?: (s: SearchSuggestion) => void;
}

const SEMESTRE_PILLS: Array<{ value: string; shortLabel: string; fullLabel: string }> = [
  { value: "Tous", shortLabel: "Tous sem.", fullLabel: "Tous les semestres" },
  { value: "Semestre 1", shortLabel: "S1", fullLabel: "Semestre 1 (S1)" },
  { value: "Semestre 2", shortLabel: "S2", fullLabel: "Semestre 2 (S2)" },
];

const TYPE_PILLS: Array<{ value: string; label: string; title: string }> = [
  { value: "Tous", label: "Tous types", title: "Tous les types d'épreuves" },
  { value: "CC", label: "CC", title: "Contrôle Continu (CC)" },
  { value: "SN", label: "SN", title: "Session Normale (SN)" },
  { value: "SR", label: "SR", title: "Session Rattrapage (SR)" },
  { value: "TD", label: "TD", title: "Travaux Dirigés (TD)" },
  { value: "TP", label: "TP", title: "Travaux Pratiques (TP)" },
  { value: "Cours", label: "Cours", title: "Support de Cours" },
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  selectedMatiere,
  setSelectedMatiere,
  selectedSemestre,
  setSelectedSemestre,
  selectedType,
  setSelectedType,
  selectedAnnee,
  setSelectedAnnee,
  matieresOptions,
  anneesOptions,
  onReset,
  onPickSuggestion,
}) => {
  const hasAdvancedFilter = selectedMatiere !== "Toutes" || selectedAnnee !== "Toutes";
  const [showMobileAdvanced, setShowMobileAdvanced] = useState(false);

  const activeFiltersCount = [
    searchQuery.trim() !== "",
    selectedMatiere !== "Toutes",
    selectedSemestre !== "Tous",
    selectedType !== "Tous",
    selectedAnnee !== "Toutes",
  ].filter(Boolean).length;

  const isFiltered = activeFiltersCount > 0;
  const isAdvancedExpanded = showMobileAdvanced || hasAdvancedFilter;

  return (
    <div className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-sm space-y-3 sm:space-y-4 transition-all">
      {/* Row 1: Instant Search Bar + Mobile Filter Drawer Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <SearchSuggest
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={() => {
              /* Live filtering */
            }}
            onPick={onPickSuggestion}
            placeholder="Rechercher une épreuve, une matière, une année..."
            inputClassName="w-full h-11 pl-10 pr-10 bg-slate-50/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl sm:rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/60 focus:bg-white dark:focus:bg-slate-800 transition-all"
          />
        </div>

        {/* Mobile (< lg) button to toggle Matière & Année selectors so they don't consume the entire first screen */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setShowMobileAdvanced((prev) => !prev);
          }}
          className={`lg:hidden h-11 px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
            isAdvancedExpanded
              ? "bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300"
              : "bg-slate-50 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200"
          }`}
          title="Afficher les filtres par matière et année"
          aria-expanded={isAdvancedExpanded}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Filtres</span>
          {(selectedMatiere !== "Toutes" || selectedAnnee !== "Toutes") && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold tabular-nums leading-none">
              {(selectedMatiere !== "Toutes" ? 1 : 0) + (selectedAnnee !== "Toutes" ? 1 : 0)}
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isAdvancedExpanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Row 2: Quick Thumb-Friendly Filter Chips (Semestre + Type d'épreuve) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-0.5">
        {/* Semestre Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 lg:pb-0">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1 shrink-0 hidden sm:inline">
            Semestre
          </span>
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            {SEMESTRE_PILLS.map((sem) => {
              const active = selectedSemestre === sem.value;
              return (
                <button
                  key={sem.value}
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setSelectedSemestre(sem.value);
                  }}
                  title={sem.fullLabel}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer whitespace-nowrap ${
                    active
                      ? "bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {sem.shortLabel}
                </button>
              );
            })}
          </div>

          {/* Subtle Divider on mobile/desktop */}
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700/80 mx-0.5 shrink-0" />

          {/* Exam Type Quick Pills */}
          <div className="flex items-center gap-1 shrink-0">
            {TYPE_PILLS.map((tp) => {
              const active = selectedType === tp.value;
              return (
                <button
                  key={tp.value}
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setSelectedType(tp.value);
                  }}
                  title={tp.title}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer whitespace-nowrap border ${
                    active
                      ? "bg-blue-900 dark:bg-blue-600 text-white border-blue-900 dark:border-blue-500 shadow-2xs"
                      : "bg-slate-50/90 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/70 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {tp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Action on Desktop if filtered */}
        {isFiltered && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic([10, 20, 10]);
              onReset();
            }}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-500/10 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser ({activeFiltersCount})</span>
          </button>
        )}
      </div>

      {/* Row 3: Matière & Année Selectors (Always visible on lg+, collapsible on < lg) */}
      <div
        className={`${
          isAdvancedExpanded ? "grid" : "hidden lg:grid"
        } grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80`}
      >
        {/* Matière Selector */}
        <div className="flex items-center gap-2.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600/50 transition-all">
          <BookOpen className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">
              Unité d'Enseignement / Matière
            </label>
            <select
              value={selectedMatiere}
              onChange={(e) => {
                triggerHaptic(8);
                setSelectedMatiere(e.target.value);
              }}
              className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate"
            >
              <option value="Toutes" className="bg-white dark:bg-slate-900">
                Toutes les matières ({matieresOptions.length})
              </option>
              {matieresOptions.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900">
                  {m}
                </option>
              ))}
            </select>
          </div>
          {selectedMatiere !== "Toutes" && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedMatiere("Toutes");
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Effacer le filtre matière"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Année Académique Selector */}
        <div className="flex items-center gap-2.5 bg-slate-50/90 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-blue-600/50 transition-all">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">
              Année Académique
            </label>
            <select
              value={selectedAnnee}
              onChange={(e) => {
                triggerHaptic(8);
                setSelectedAnnee(e.target.value);
              }}
              className="w-full bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer truncate"
            >
              <option value="Toutes" className="bg-white dark:bg-slate-900">
                Toutes les promotions ({anneesOptions.length})
              </option>
              {anneesOptions.map((a) => (
                <option key={a} value={a} className="bg-white dark:bg-slate-900">
                  Promotion {a}
                </option>
              ))}
            </select>
          </div>
          {selectedAnnee !== "Toutes" && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(8);
                setSelectedAnnee("Toutes");
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Effacer le filtre année"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 4: Active Filter Chips Summary (allows 1-tap removal of any active filter) */}
      {isFiltered && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-1">
              Filtres actifs :
            </span>

            {searchQuery.trim() !== "" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <span className="max-w-[160px] truncate">« {searchQuery} »</span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}

            {selectedMatiere !== "Toutes" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedMatiere("Toutes");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <span className="max-w-[180px] truncate">{selectedMatiere}</span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}

            {selectedSemestre !== "Tous" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedSemestre("Tous");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <span>{selectedSemestre}</span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}

            {selectedType !== "Tous" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedType("Tous");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <span>Type : {selectedType}</span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}

            {selectedAnnee !== "Toutes" && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setSelectedAnnee("Toutes");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-200/70 dark:border-blue-500/30 text-[11px] font-bold transition-all active:scale-95 cursor-pointer"
              >
                <span>Année : {selectedAnnee}</span>
                <X className="w-3 h-3 shrink-0" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic([10, 20, 10]);
              onReset();
            }}
            className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tout effacer</span>
          </button>
        </div>
      )}
    </div>
  );
};
