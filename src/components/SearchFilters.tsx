import React from "react";
import { RotateCcw } from "lucide-react";
import { SearchSuggest } from "./SearchSuggest";
import { SearchSuggestion } from "../lib/api";

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
  const isFiltered =
    searchQuery !== "" ||
    selectedMatiere !== "Toutes" ||
    selectedSemestre !== "Tous" ||
    selectedType !== "Tous" ||
    selectedAnnee !== "Toutes";

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Search Bar Input */}
      <SearchSuggest
        value={searchQuery}
        onChange={setSearchQuery}
        onSubmit={() => {/* nothing needed, filter is live */}}
        onPick={onPickSuggestion}
        placeholder="Recherche instantanée : nom d'épreuve, matière, année..."
        inputClassName="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
      />

      {/* Select Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Matière */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Matière
          </label>
          <select
            value={selectedMatiere}
            onChange={(e) => setSelectedMatiere(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Toutes">Toutes les matières</option>
            {matieresOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Semestre */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Semestre
          </label>
          <select
            value={selectedSemestre}
            onChange={(e) => setSelectedSemestre(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Tous">Tous les semestres</option>
            <option value="Semestre 1">Semestre 1 (S1)</option>
            <option value="Semestre 2">Semestre 2 (S2)</option>
          </select>
        </div>

        {/* Type d'épreuve */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Type d'Épreuve
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Tous">Tous les types (CC, SN, SR, TD, TP)</option>
            <option value="CC">Contrôle Continu (CC)</option>
            <option value="SN">Session Normale (SN)</option>
            <option value="SR">Session Rattrapage (SR)</option>
            <option value="TD">Travaux Dirigés (TD)</option>
            <option value="TP">Travaux Pratiques (TP)</option>
          </select>
        </div>

        {/* Année Académique */}
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Année Académique
          </label>
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Toutes">Toutes les années</option>
            {anneesOptions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset Action */}
      {isFiltered && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onReset}
            className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 flex items-center space-x-1 underline font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      )}
    </div>
  );
};
