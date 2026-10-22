import React from "react";
import { DocumentModel, MatiereModel } from "../types";
import { DocumentCard } from "../components/DocumentCard";
import { BackgroundCarousel } from "../components/BackgroundCarousel";
import { SearchSuggest } from "../components/SearchSuggest";
import { Reveal } from "../components/motion";
import {
  BookOpen,
  GraduationCap,
  Upload,
  FileText,
  ArrowRight,
  ShieldCheck,
  Layers,
  Clock,
  Download
} from "lucide-react";

interface HomeViewProps {
  documents: DocumentModel[];
  matieres: MatiereModel[];
  onNavigate: (tab: string, filterState?: any) => void;
  onViewDoc: (doc: DocumentModel) => void;
  onDownloadDoc: (doc: DocumentModel) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  documents,
  matieres,
  onNavigate,
  onViewDoc,
  onDownloadDoc,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate("exams", { search: searchTerm });
  };

  const recentDocs = documents.slice(0, 6);
  const totalDownloads = documents.reduce((acc, d) => acc + (d.telechargementsCount || 0), 0);

  const s1Matieres = matieres.filter((m) => m.semestre === "Semestre 1");
  const s2Matieres = matieres.filter((m) => m.semestre === "Semestre 2");

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section - Scrolling Background Carousel */}
      <Reveal y={10}>
      <section className="relative rounded-3xl shadow-lg">
        <BackgroundCarousel
          className="text-white rounded-3xl"
          overlayClassName="bg-gradient-to-b from-slate-950/30 via-slate-950/15 to-slate-950/35"
        >
          <div className="relative max-w-3xl space-y-6 p-6 sm:p-10 lg:p-12">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur max-w-full overflow-hidden">
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span className="truncate min-w-0">Institut Universitaire Saint Jean • Première Année Ingénieur</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight drop-shadow-lg">
              Plateforme des Anciennes Épreuves Académiques
            </h1>

            <p className="text-blue-50 text-sm sm:text-base leading-relaxed max-w-2xl">
              Consultez et téléchargez les épreuves de <strong className="text-white font-bold">Contrôle Continu (CC)</strong>, <strong className="text-white font-bold">Session Normale (SN)</strong>, <strong className="text-white font-bold">Session de Rattrapage (SR)</strong>, <strong className="text-white font-bold">Travaux Dirigés (TD)</strong> et <strong className="text-white font-bold">Travaux Pratiques (TP)</strong> ainsi que les <strong className="text-white font-bold">Cours</strong> pour optimiser vos révisions.
            </p>

            <form onSubmit={handleSearchSubmit} className="pt-2">
              <div className="flex flex-col sm:flex-row gap-2 max-w-2xl bg-white/95 p-1.5 sm:p-2 rounded-full shadow-xl text-slate-900 backdrop-blur-sm">
                <div className="flex-1 min-w-0">
                  <SearchSuggest
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSubmit={() => onNavigate("exams", { search: searchTerm })}
                    onPick={(s) => onNavigate("exams", { search: s.titre })}
                    placeholder="Rechercher une épreuve, une matière..."
                    inputClassName="w-full pl-9 pr-3 py-2 bg-transparent text-slate-900 placeholder-slate-400 text-sm focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <span className="hidden xs:inline">Rechercher</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Key Quick Tags */}
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs text-blue-100">
              <span className="font-semibold text-white">Sujets fréquents:</span>
              {["Analyse 1", "Algorithmique", "Électrocinétique", "Mécanique", "Géométrie"].map((tag) => (
                <button
                  key={tag}
                  onClick={() => onNavigate("exams", { search: tag })}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-all text-xs font-medium backdrop-blur-sm"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </BackgroundCarousel>
      </section>
      </Reveal>

      {/* Stats Counter Section */}
      <Reveal>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-900 dark:text-blue-300 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{documents.length}</div>
            <div className="text-xs text-slate-500 uppercase font-medium">Épreuves Archivées</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{matieres.length}</div>
            <div className="text-xs text-slate-500 uppercase font-medium">Matières Niveau 1</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalDownloads}</div>
            <div className="text-xs text-slate-500 uppercase font-medium">Téléchargements</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">100%</div>
            <div className="text-xs text-slate-500 uppercase font-medium">Certifié ISJ</div>
          </div>
        </div>

      </section>
      </Reveal>

      {/* Navigation Tree Section (Arborescence MVP) */}
      <section className="space-y-6">
        <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <Layers className="w-6 h-6 text-blue-700" />
              <span>Arborescence des Matières</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Explorez les matières réparties entre le premier et le second semestre.
            </p>
          </div>
          <button
            onClick={() => onNavigate("subjects")}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center space-x-1"
          >
            <span>Voir toutes les matières</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Semestre 1 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Semestre 1 (S1)</h3>
              </div>
              <span className="text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full font-bold">
                {s1Matieres.length} Matières
              </span>
            </div>
            <div className="space-y-2.5">
              {s1Matieres.map((m, i) => (
                <Reveal key={m.id} delay={Math.min(i * 0.05, 0.3)} y={14}>
                <div
                  onClick={() => onNavigate("exams", { matiere: m.nom, semestre: "Semestre 1" })}
                  className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-mono shrink-0">
                      {m.code}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors min-w-0 truncate">
                      {m.nom}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {m.countDocs} épreuves
                  </span>
                </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Semestre 2 */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div className="flex items-center space-x-3">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Semestre 2 (S2)</h3>
              </div>
              <span className="text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-3 py-1 rounded-full font-bold">
                {s2Matieres.length} Matières
              </span>
            </div>
            <div className="space-y-2.5">
              {s2Matieres.map((m, i) => (
                <Reveal key={m.id} delay={Math.min(i * 0.05, 0.3)} y={14}>
                <div
                  onClick={() => onNavigate("exams", { matiere: m.nom, semestre: "Semestre 2" })}
                  className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-200 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-mono shrink-0">
                      {m.code}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors min-w-0 truncate">
                      {m.nom}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {m.countDocs} épreuves
                  </span>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Exams Section */}
      <section className="space-y-6">
        <Reveal>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
              <Clock className="w-6 h-6 text-blue-700" />
              <span>Dernières Épreuves Publiées</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Documents récents validés par l'administration ISJ.
            </p>
          </div>
          <button
            onClick={() => onNavigate("exams")}
            className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center space-x-1"
          >
            <span>Tout consulter</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentDocs.map((doc, i) => (
            <Reveal key={doc.id} delay={Math.min(i * 0.06, 0.36)}>
              <DocumentCard
                document={doc}
                onView={onViewDoc}
                onDownload={onDownloadDoc}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contribute Banner */}
      <Reveal>
      <section className="bg-blue-900 text-white rounded-3xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg">
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-blue-200">
            Entraide Académique
          </span>
          <h3 className="text-xl sm:text-2xl font-bold">
            Vous disposez d'une épreuve récente ?
          </h3>
          <p className="text-sm text-blue-100 max-w-xl">
            Proposez vos épreuves de CC, SN, SR ou vos Cours à la communauté des étudiants ISJ. Chaque sujet est relu et validé avant sa publication.
          </p>
        </div>
        <button
          onClick={() => onNavigate("contribute")}
          className="px-6 py-3 bg-white text-blue-900 font-bold text-sm rounded-full transition-all shadow hover:bg-blue-50 shrink-0 flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>Partager une épreuve</span>
        </button>
      </section>
      </Reveal>
    </div>
  );
};
