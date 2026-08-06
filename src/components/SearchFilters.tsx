import React from "react";
import { Search, RotateCcw } from "lucide-react";

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
}) => {
  const isFiltered =
    searchQuery !== "" ||
    selectedMatiere !== "Toutes" ||
    selectedSemestre !== "Tous" ||
    selectedType !== "Tous" ||
    selectedAnnee !== "Toutes";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Search Bar Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher une épreuve par nom, sujet, code matière..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
        />
      </div>

      {/* Select Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Matière */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Matière
          </label>
          <select
            value={selectedMatiere}
            onChange={(e) => setSelectedMatiere(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
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
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Semestre
          </label>
          <select
            value={selectedSemestre}
            onChange={(e) => setSelectedSemestre(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Tous">Tous les semestres</option>
            <option value="Semestre 1">Semestre 1 (S1)</option>
            <option value="Semestre 2">Semestre 2 (S2)</option>
          </select>
        </div>

        {/* Type d'épreuve */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Type d'Épreuve
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
          >
            <option value="Tous">Tous les types (CC, SN, SR)</option>
            <option value="CC">Contrôle Continu (CC)</option>
            <option value="SN">Session Normale (SN)</option>
            <option value="SR">Session Rattrapage (SR)</option>
          </select>
        </div>

        {/* Année Académique */}
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Année Académique
          </label>
          <select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer font-medium"
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
            className="text-xs text-indigo-700 hover:text-indigo-900 flex items-center space-x-1 underline font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      )}
    </div>
  );
};
