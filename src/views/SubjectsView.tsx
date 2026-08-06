import React, { useState } from "react";
import { MatiereModel } from "../types";
import { BookOpen, ArrowRight, Search } from "lucide-react";

interface SubjectsViewProps {
  matieres: MatiereModel[];
  onSelectMatiere: (matiereNom: string, semestre: string) => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({
  matieres,
  onSelectMatiere,
}) => {
  const [activeSemestreFilter, setActiveSemestreFilter] = useState<string>("Tous");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filtered = matieres.filter((m) => {
    const matchesSemestre =
      activeSemestreFilter === "Tous" || m.semestre === activeSemestreFilter;
    const matchesSearch =
      m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSemestre && matchesSearch;
  });

  const s1Count = matieres.filter((m) => m.semestre === "Semestre 1").length;
  const s2Count = matieres.filter((m) => m.semestre === "Semestre 2").length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center space-x-3 text-indigo-900">
          <BookOpen className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Matières du Niveau 1 Ingénieur
          </h1>
        </div>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Explorez l'arborescence des cours et modules d'enseignement du Niveau 1. Cliquez sur une matière pour filtrer ses épreuves d'examen.
        </p>

        {/* Filters and Search */}
        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrer une matière par nom ou code..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-slate-900 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              onClick={() => setActiveSemestreFilter("Tous")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Tous"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous ({matieres.length})
            </button>
            <button
              onClick={() => setActiveSemestreFilter("Semestre 1")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Semestre 1"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semestre 1 ({s1Count})
            </button>
            <button
              onClick={() => setActiveSemestreFilter("Semestre 2")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Semestre 2"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Semestre 2 ({s2Count})
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Subjects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelectMatiere(m.nom, m.semestre)}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                  {m.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.semestre === "Semestre 1"
                      ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}
                >
                  {m.semestre}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors mb-2">
                {m.nom}
              </h3>

              <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
                {m.description}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">
                <strong className="text-indigo-900 font-bold">{m.countDocs}</strong> épreuve(s)
              </span>
              <span className="text-indigo-700 font-bold group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                <span>Consulter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-900 font-bold">Aucune matière ne correspond à votre recherche.</p>
          <p className="text-xs text-slate-500 mt-1">Essayez de modifier votre filtre ou réinitialisez le terme de recherche.</p>
        </div>
      )}
    </div>
  );
};
