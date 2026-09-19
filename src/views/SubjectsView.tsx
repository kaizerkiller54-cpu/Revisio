import React, { useState } from "react";
import { MatiereModel } from "../types";
import { BookOpen, ArrowRight, Search } from "lucide-react";
import { Reveal } from "../components/motion";

interface SubjectsViewProps {
  matieres: MatiereModel[];
  onSelectMatiere: (matiereNom: string, semestre: string) => void;
}

function MatiereCard({
  m,
  index,
  onSelect,
}: {
  m: MatiereModel;
  index: number;
  onSelect: (matiereNom: string, semestre: string) => void;
}) {
  return (
    <Reveal delay={Math.min(index * 0.05, 0.4)} className="h-full">
      <div
        onClick={() => onSelect(m.nom, m.semestre)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-md h-full"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-500/30 shrink-0">
              {m.code}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 shrink-0">
              {m.semestre}
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors mb-2 break-words">
            {m.nom}
          </h3>

          <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">
            {m.description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <span className="text-slate-600 font-medium">
            <strong className="text-blue-900 dark:text-blue-300 font-bold">{m.countDocs}</strong> épreuve(s)
          </span>
          <span className="text-blue-700 font-bold group-hover:translate-x-1 transition-transform flex items-center space-x-1">
            <span>Consulter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function SemestreBlock({
  title,
  count,
  list,
  onSelect,
}: {
  title: string;
  count: number;
  list: MatiereModel[];
  onSelect: (matiereNom: string, semestre: string) => void;
}) {
  if (list.length === 0) return null;
  return (
    <section className="space-y-4">
      <Reveal>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
            <span>{title}</span>
          </h2>
          <span className="text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full font-bold shrink-0">
            {count} Matière{count > 1 ? "s" : ""}
          </span>
        </div>
      </Reveal>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((m, i) => (
          <MatiereCard key={m.id} m={m} index={i} onSelect={onSelect} />
        ))}
      </div>
    </section>
  );
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

  const showS1 = activeSemestreFilter === "Tous" || activeSemestreFilter === "Semestre 1";
  const showS2 = activeSemestreFilter === "Tous" || activeSemestreFilter === "Semestre 2";
  const s1List = filtered.filter((m) => m.semestre === "Semestre 1");
  const s2List = filtered.filter((m) => m.semestre === "Semestre 2");

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <Reveal>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center space-x-3 text-blue-900 dark:text-blue-300">
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
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-full text-slate-900 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveSemestreFilter("Tous")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Tous"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tous ({matieres.length})
            </button>
            <button
              onClick={() => setActiveSemestreFilter("Semestre 1")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Semestre 1"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semestre 1 ({s1Count})
            </button>
            <button
              onClick={() => setActiveSemestreFilter("Semestre 2")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeSemestreFilter === "Semestre 2"
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Semestre 2 ({s2Count})
            </button>
          </div>
        </div>
      </div>
      </Reveal>

      {/* Matières regroupées par semestre */}
      {showS1 && (
        <SemestreBlock
          title="Semestre 1 (S1)"
          count={s1List.length}
          list={s1List}
          onSelect={onSelectMatiere}
        />
      )}
      {showS2 && (
        <SemestreBlock
          title="Semestre 2 (S2)"
          count={s2List.length}
          list={s2List}
          onSelect={onSelectMatiere}
        />
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-900 font-bold">Aucune matière ne correspond à votre recherche.</p>
          <p className="text-xs text-slate-500 mt-1">Essayez de modifier votre filtre ou réinitialisez le terme de recherche.</p>
        </div>
      )}
    </div>
  );
};
