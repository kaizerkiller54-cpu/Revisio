import React, { useState, useEffect } from "react";
import { DocumentModel } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { SearchFilters } from "../components/SearchFilters";
import { FileText } from "lucide-react";

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

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.search !== undefined) setSearchQuery(initialFilters.search);
      if (initialFilters.matiere !== undefined) setSelectedMatiere(initialFilters.matiere);
      if (initialFilters.semestre !== undefined) setSelectedSemestre(initialFilters.semestre);
      if (initialFilters.typeEpreuve !== undefined) setSelectedType(initialFilters.typeEpreuve);
      if (initialFilters.anneeAcademique !== undefined) setSelectedAnnee(initialFilters.anneeAcademique);
    }
  }, [initialFilters]);

  // Extract unique options
  const matieresOptions = Array.from(new Set(documents.map((d) => d.matiere))).sort();
  const anneesOptions = Array.from(new Set(documents.map((d) => d.anneeAcademique))).sort().reverse();

  // Filter client-side
  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      searchQuery === "" ||
      d.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.matiere.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.anneeAcademique.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMatiere = selectedMatiere === "Toutes" || d.matiere === selectedMatiere;
    const matchesSemestre = selectedSemestre === "Tous" || d.semestre === selectedSemestre;
    const matchesType = selectedType === "Tous" || d.typeEpreuve === selectedType;
    const matchesAnnee = selectedAnnee === "Toutes" || d.anneeAcademique === selectedAnnee;

    return matchesSearch && matchesMatiere && matchesSemestre && matchesType && matchesAnnee;
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedMatiere("Toutes");
    setSelectedSemestre("Tous");
    setSelectedType("Tous");
    setSelectedAnnee("Toutes");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center space-x-2">
            <FileText className="w-7 h-7 text-indigo-700" />
            <span>Catalogue des Épreuves</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez et téléchargez les sujets d'examens de l'ISJ Ingénieur Niveau 1.
          </p>
        </div>
        <div className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full text-slate-700 font-medium self-start sm:self-auto shadow-sm">
          <strong className="text-indigo-900 font-bold">{filteredDocs.length}</strong> épreuve(s) affichée(s)
        </div>
      </div>

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
      />

      {/* Active Filter Chips */}
      {(selectedMatiere !== "Toutes" || selectedSemestre !== "Tous" || selectedType !== "Tous" || selectedAnnee !== "Toutes") && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-bold">Filtres actifs:</span>
          {selectedMatiere !== "Toutes" && (
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full font-semibold">
              Matière: {selectedMatiere}
            </span>
          )}
          {selectedSemestre !== "Tous" && (
            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-full font-semibold">
              Semestre: {selectedSemestre}
            </span>
          )}
          {selectedType !== "Tous" && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full font-semibold">
              Type: {selectedType}
            </span>
          )}
          {selectedAnnee !== "Toutes" && (
            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full font-semibold">
              Année: {selectedAnnee}
            </span>
          )}
        </div>
      )}

      {/* Exams Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onView={onViewDoc}
              onDownload={onDownloadDoc}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-900 font-bold text-lg">Aucune épreuve trouvée</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Aucun document ne correspond à vos critères actuels. Essayez d'élargir votre recherche.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 px-4 py-2 bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold rounded-full transition-colors shadow-sm"
          >
            Réinitialiser tous les filtres
          </button>
        </div>
      )}
    </div>
  );
};
