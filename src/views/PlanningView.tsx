import React, { useState, useEffect, useMemo } from "react";
import { User, DocumentModel, MatiereModel } from "../types";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Search,
  ChevronRight,
  Filter,
  Sparkles,
  Award,
  CheckSquare,
  Square,
  FileText,
  CalendarCheck,
  Tag,
  Share2,
  Info,
  ShieldCheck,
  Edit2
} from "lucide-react";
import { Reveal } from "../components/motion";

export interface ExamEvent {
  id: string;
  matiereNom: string;
  typeEpreuve: "CC" | "SN" | "SR";
  semestre: "Semestre 1" | "Semestre 2";
  dateIso: string; // YYYY-MM-DD
  heureDebut: string; // HH:mm
  heureFin: string; // HH:mm
}

export interface UserRevisionTask {
  id: string;
  examEventId?: string;
  matiereNom: string;
  titre: string;
  dateCibleIso: string;
  terminee: boolean;
  rappelActif: boolean;
  notes?: string;
}

interface PlanningViewProps {
  user: User | null;
  documents: DocumentModel[];
  matieres: MatiereModel[];
  onNavigateToExams: (filters?: { matiere?: string; semestre?: string; typeEpreuve?: string }) => void;
  onNavigateToLogin: () => void;
}

// Official ING1 Semester 1 Examination Schedule strictly extracted from the provided ISJ PDF
const DEFAULT_ING1_EXAM_SCHEDULE: ExamEvent[] = [
  // Samedi 10/10/2026
  {
    id: "ing1-cc-10-10-analyse1",
    matiereNom: "Analyse 1",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-10-10",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  // Samedi 31/10/2026
  {
    id: "ing1-cc-31-10-electrocinetique",
    matiereNom: "Électrocinétique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-10-31",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  {
    id: "ing1-cc-31-10-mesures",
    matiereNom: "Mesures Physiques",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-10-31",
    heureDebut: "10:30",
    heureFin: "12:30"
  },
  // Samedi 07/11/2026
  {
    id: "ing1-cc-07-11-mecanique",
    matiereNom: "Mécanique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-07",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  {
    id: "ing1-cc-07-11-algebre",
    matiereNom: "Algèbre linéaire",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-07",
    heureDebut: "10:30",
    heureFin: "12:30"
  },
  // Samedi 28/11/2026
  {
    id: "ing1-cc-28-11-analyse1",
    matiereNom: "Analyse 1",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-28",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  {
    id: "ing1-cc-28-11-mecanique",
    matiereNom: "Mécanique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-28",
    heureDebut: "10:30",
    heureFin: "12:30"
  },
  // Samedi 05/12/2026
  {
    id: "ing1-cc-05-12-algebre",
    matiereNom: "Algèbre linéaire",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  {
    id: "ing1-cc-05-12-mesures",
    matiereNom: "Mesures Physiques",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "10:30",
    heureFin: "12:30"
  },
  {
    id: "ing1-cc-05-12-anglais",
    matiereNom: "Anglais",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "13:00",
    heureFin: "15:00"
  },
  // Samedi 12/12/2026
  {
    id: "ing1-cc-12-12-electrocinetique",
    matiereNom: "Électrocinétique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-12",
    heureDebut: "08:00",
    heureFin: "10:00"
  },
  {
    id: "ing1-cc-12-12-communication",
    matiereNom: "Communication",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-12",
    heureDebut: "10:30",
    heureFin: "11:30"
  }
];

export const PlanningView: React.FC<PlanningViewProps> = ({
  user,
  documents,
  matieres,
  onNavigateToExams,
  onNavigateToLogin,
}) => {
  const [selectedSemestre, setSelectedSemestre] = useState<"Semestre 1" | "Semestre 2">("Semestre 1");
  const [selectedType, setSelectedType] = useState<string>("Tous");
  const [selectedMatiere, setSelectedMatiere] = useState<string>("Toutes");
  const [statusFilter, setStatusFilter] = useState<"upcoming" | "all" | "past">("upcoming");
  const [activeTab, setActiveTab] = useState<"calendar" | "personal">("calendar");

  // Always load official ING1 schedule from PDF
  const [examSchedule] = useState<ExamEvent[]>(DEFAULT_ING1_EXAM_SCHEDULE);

  // Helper to check if an exam has ended based on exact date & end time (heureFin)
  const isExamEnded = (ev: ExamEvent) => {
    try {
      const now = new Date();
      const [year, month, day] = ev.dateIso.split("-").map(Number);
      const [hours, minutes] = (ev.heureFin || "23:59").split(":").map(Number);
      const examEndTime = new Date(year, month - 1, day, hours, minutes);
      return now.getTime() >= examEndTime.getTime();
    } catch {
      return false;
    }
  };

  // Load user personalized study tasks
  const storageKeyTasks = `revisio_user_planner_${user?.id || "guest"}`;
  const [userTasks, setUserTasks] = useState<UserRevisionTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyTasks);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "task-1",
        matiereNom: "Algèbre linéaire",
        titre: "Refaire tous les exercices du CC 2024 d'Algèbre",
        dateCibleIso: "2026-11-17",
        terminee: false,
        rappelActif: true,
        notes: "Insister sur le calcul de déterminants et réduction d'endomorphismes."
      },
      {
        id: "task-2",
        matiereNom: "Analyse 1",
        titre: "Fiche récapitulative des DL usuels",
        dateCibleIso: "2026-11-18",
        terminee: true,
        rappelActif: false,
        notes: "Vérifier la formule de Taylor-Young à l'ordre 3."
      }
    ];
  });

  // State for new task creation
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMatiere, setNewTaskMatiere] = useState("Algèbre linéaire");
  const [newTaskDate, setNewTaskDate] = useState("2026-11-18");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);

  // Save tasks to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyTasks, JSON.stringify(userTasks));
    } catch {}
  }, [userTasks, storageKeyTasks]);

  // S1 Matieres list
  const s1MatieresList = useMemo(() => {
    return matieres
      .filter((m) => m.semestre === selectedSemestre)
      .map((m) => m.nom);
  }, [matieres, selectedSemestre]);

  // Filtered Exam Events (hides ended exams by default)
  const filteredEvents = useMemo(() => {
    return examSchedule.filter((ev) => {
      if (ev.semestre !== selectedSemestre) return false;
      if (selectedType !== "Tous" && ev.typeEpreuve !== selectedType) return false;
      if (selectedMatiere !== "Toutes" && ev.matiereNom !== selectedMatiere) return false;

      const ended = isExamEnded(ev);
      if (statusFilter === "upcoming" && ended) return false;
      if (statusFilter === "past" && !ended) return false;

      return true;
    }).sort((a, b) => {
      if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
      return a.heureDebut.localeCompare(b.heureDebut);
    });
  }, [examSchedule, selectedSemestre, selectedType, selectedMatiere, statusFilter]);

  // Next upcoming exam session date and all exams scheduled for that day
  const nextUpcomingExams = useMemo(() => {
    const upcoming = examSchedule
      .filter((ev) => !isExamEnded(ev))
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
        return a.heureDebut.localeCompare(b.heureDebut);
      });

    if (upcoming.length === 0) return [];
    
    // Get the earliest upcoming date
    const earliestDateIso = upcoming[0].dateIso;
    // Return all exams on that date that haven't ended yet
    return upcoming.filter((ev) => ev.dateIso === earliestDateIso);
  }, [examSchedule]);

  // Toggle Task Completion
  const handleToggleTask = (id: string) => {
    setUserTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, terminee: !t.terminee } : t))
    );
  };

  // Toggle Reminder
  const handleToggleReminder = (id: string) => {
    setUserTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, rappelActif: !t.rappelActif } : t))
    );
  };

  // Delete Task
  const handleDeleteTask = (id: string) => {
    setUserTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Add New Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: UserRevisionTask = {
      id: `task-${Date.now()}`,
      matiereNom: newTaskMatiere,
      titre: newTaskTitle.trim(),
      dateCibleIso: newTaskDate || new Date().toISOString().slice(0, 10),
      terminee: false,
      rappelActif: true,
      notes: newTaskNotes.trim() || undefined,
    };
    setUserTasks((prev) => [newTask, ...prev]);
    setNewTaskTitle("");
    setNewTaskNotes("");
    setShowAddTaskForm(false);
  };

  // Quick Add Exam Event to Personal Planner
  const handleAddExamToPlanner = (ev: ExamEvent) => {
    const exists = userTasks.some((t) => t.examEventId === ev.id);
    if (exists) return;
    const task: UserRevisionTask = {
      id: `task-exam-${ev.id}`,
      examEventId: ev.id,
      matiereNom: ev.matiereNom,
      titre: `Révision : ${ev.typeEpreuve} de ${ev.matiereNom}`,
      dateCibleIso: ev.dateIso,
      terminee: false,
      rappelActif: true,
      notes: `Horaire : ${ev.heureDebut} à ${ev.heureFin}`
    };
    setUserTasks((prev) => [task, ...prev]);
    setActiveTab("personal");
  };

  // Count docs per subject for quick link
  const getDocCountForSubject = (matiereNom: string) => {
    return documents.filter((d) => d.matiere === matiereNom && d.statut === "Publié").length;
  };

  // Format date readable
  const formatDateFr = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const tasksCompletedCount = userTasks.filter((t) => t.terminee).length;
  const tasksTotalCount = userTasks.length;
  const progressPercent = tasksTotalCount > 0 ? Math.round((tasksCompletedCount / tasksTotalCount) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 p-6 sm:p-10 border border-blue-800/40 shadow-xl text-white">
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-amber-300 text-xs font-bold">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Planning Académique & Programme de Révision ISJ (ING1)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Calendrier Officiel des Évaluations & Planner
            </h1>

            <p className="text-sm sm:text-base text-blue-200/90 leading-relaxed font-medium">
              Consultez les dates des Contrôles Continus (CC) et Examens de Première Année (ING1),
              planifiez vos révisions et accédez directement aux épreuves correspondantes.
            </p>

            {/* Top Navigation Switcher */}
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setActiveTab("calendar")}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center space-x-2 shadow-md ${
                  activeTab === "calendar"
                    ? "bg-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-slate-800/80 text-blue-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Calendrier Officiel Examens</span>
              </button>

              <button
                onClick={() => setActiveTab("personal")}
                className={`px-5 py-2.5 rounded-2xl font-extrabold text-xs transition-all flex items-center space-x-2 shadow-md ${
                  activeTab === "personal"
                    ? "bg-amber-400 text-slate-950 shadow-amber-500/20"
                    : "bg-slate-800/80 text-blue-200 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Mon Programme de Révision ({userTasks.length})</span>
              </button>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Upcoming Exam Spotlight Banner (Displays all exams scheduled for the next session date) */}
      {nextUpcomingExams.length > 0 && (
        <Reveal delay={0.1}>
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-slate-900 border border-amber-400/30 dark:border-amber-500/20 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 dark:border-amber-500/20 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shrink-0 flex items-center space-x-2 shadow-xs">
                  <Clock className="w-5 h-5" />
                  <span className="text-xs uppercase tracking-wider font-black">
                    {nextUpcomingExams.length > 1 ? `Prochains CC (${nextUpcomingExams.length} Épreuves)` : "Prochain CC"}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm font-extrabold text-amber-700 dark:text-amber-300 capitalize flex items-center space-x-1.5 bg-amber-400/10 px-3.5 py-1.5 rounded-full border border-amber-400/20">
                <span>🗓️ {formatDateFr(nextUpcomingExams[0].dateIso)}</span>
              </p>
            </div>

            <div className={`grid grid-cols-1 ${nextUpcomingExams.length > 1 ? "md:grid-cols-2" : "grid-cols-1"} gap-4`}>
              {nextUpcomingExams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30">
                        {exam.typeEpreuve}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {exam.semestre}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {exam.matiereNom}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 flex items-center space-x-1.5 font-medium">
                      <span>⏰ Horaire :</span>
                      <strong className="text-blue-900 dark:text-blue-300 font-bold">{exam.heureDebut} à {exam.heureFin}</strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onNavigateToExams({ matiere: exam.matiereNom, semestre: exam.semestre })}
                      className="px-3.5 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                      <span>Réviseur Épreuves</span>
                    </button>
                    <button
                      onClick={() => handleAddExamToPlanner(exam)}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold transition-all flex items-center space-x-1.5 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter Planner</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* TAB 1: OFFICIAL EXAM CALENDAR */}
      {activeTab === "calendar" && (
        <div className="space-y-6">
          {/* Controls & Filters */}
          <Reveal delay={0.15}>
            <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Semestre Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Semestre :</span>
                <div className="flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setSelectedSemestre("Semestre 1")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSemestre === "Semestre 1"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    Semestre 1 (ING1)
                  </button>
                  <button
                    onClick={() => setSelectedSemestre("Semestre 2")}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedSemestre === "Semestre 2"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                    }`}
                  >
                    Semestre 2 (ING1)
                  </button>
                </div>
              </div>

              {/* Type Epreuve Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Type :</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Tous">Tous les types (CC, SN, SR)</option>
                  <option value="CC">Contrôle Continu (CC)</option>
                  <option value="SN">Session Normale (SN)</option>
                  <option value="SR">Session Rattrapage (SR)</option>
                </select>
              </div>

              {/* Statut / Période Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Affichage :</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="upcoming">⏳ Épreuves à venir uniquement</option>
                  <option value="all">📅 Toutes les épreuves (CC)</option>
                  <option value="past">✅ Épreuves passées (Historique)</option>
                </select>
              </div>

              {/* Matière Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Matière :</span>
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="Toutes">Toutes les matières</option>
                  {s1MatieresList.map((nom) => (
                    <option key={nom} value={nom}>
                      {nom}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Reveal>

          {/* Schedule List */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
              <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-base">Aucune épreuve à afficher</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {statusFilter === "upcoming"
                    ? "Toutes les épreuves correspondantes sont terminées ou aucunes épreuves à venir ne correspondent."
                    : "Aucune épreuve ne correspond à ces critères de recherche."}
                </p>
              </div>
              {statusFilter === "upcoming" && (
                <button
                  onClick={() => setStatusFilter("all")}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-full transition-colors shadow-xs"
                >
                  Consulter toutes les épreuves
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredEvents.map((ev, index) => {
              const docCount = getDocCountForSubject(ev.matiereNom);
              const isAddedToPlanner = userTasks.some((t) => t.examEventId === ev.id);

              return (
                <Reveal key={ev.id} delay={Math.min(index * 0.05, 0.3)}>
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                          {ev.typeEpreuve === "CC" ? "Contrôle Continu" : ev.typeEpreuve === "SN" ? "Session Normale" : "Rattrapage"}
                        </span>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {ev.semestre}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {ev.matiereNom}
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-bold capitalize mt-0.5">
                          🗓️ {formatDateFr(ev.dateIso)}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <div className="flex items-center space-x-2 font-medium">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>Horaire : {ev.heureDebut} à {ev.heureFin}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onNavigateToExams({ matiere: ev.matiereNom, semestre: ev.semestre })}
                        className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors flex items-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Réviser ({docCount} épreuve{docCount > 1 ? "s" : ""})</span>
                      </button>

                      <button
                        onClick={() => handleAddExamToPlanner(ev)}
                        disabled={isAddedToPlanner}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                          isAddedToPlanner
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 cursor-default"
                            : "bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold active:scale-95 shadow-xs"
                        }`}
                      >
                        {isAddedToPlanner ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Dans mon Planner</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Ajouter Planner</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* TAB 2: PERSONALIZED REVISION PLANNER */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          {/* Progress Overview Card */}
          <Reveal delay={0.15}>
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center space-x-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    <span>Progression de vos Révisions</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tasksCompletedCount} sur {tasksTotalCount} objectif{tasksTotalCount > 1 ? "s" : ""} validé{tasksCompletedCount > 1 ? "s" : ""}
                  </p>
                </div>

                <button
                  onClick={() => setShowAddTaskForm(!showAddTaskForm)}
                  className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition-all flex items-center space-x-2 shadow-md self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un objectif de révision</span>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Avancement</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Add Task Form Modal / Inline */}
          {showAddTaskForm && (
            <Reveal>
              <form onSubmit={handleAddTask} className="p-6 rounded-3xl bg-blue-950/90 text-white border border-blue-800/60 shadow-xl space-y-4 text-xs">
                <h3 className="text-base font-bold flex items-center space-x-2 text-amber-300">
                  <Plus className="w-4 h-4" />
                  <span>Nouvel objectif de révision</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold">Matière</label>
                    <select
                      value={newTaskMatiere}
                      onChange={(e) => setNewTaskMatiere(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-blue-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {s1MatieresList.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold">Titre de l'objectif</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Refaire les exercices du Chapitre 2"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-blue-800 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold">Date cible</label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-blue-800 text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold">Notes / Remarques (optionnel)</label>
                  <textarea
                    rows={2}
                    placeholder="Points de cours importants, formules à retenir..."
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-blue-800 text-white placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm"
                  >
                    Enregistrer l'objectif
                  </button>
                </div>
              </form>
            </Reveal>
          )}

          {/* User Tasks List */}
          <div className="space-y-3">
            {userTasks.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                <CalendarCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Aucun objectif de révision enregistré
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Consultez le calendrier officiel ci-dessus pour ajouter directement des épreuves à votre programme personnel !
                </p>
              </div>
            ) : (
              userTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    task.terminee
                      ? "bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-75"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 text-blue-600 dark:text-blue-400 hover:scale-110 transition-transform shrink-0"
                      title={task.terminee ? "Marquer comme non terminé" : "Marquer comme terminé"}
                    >
                      {task.terminee ? (
                        <CheckSquare className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/20">
                          {task.matiereNom}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          📅 {formatDateFr(task.dateCibleIso)}
                        </span>
                      </div>

                      <h4
                        className={`text-sm font-bold text-slate-900 dark:text-white leading-snug ${
                          task.terminee ? "line-through text-slate-500 dark:text-slate-500" : ""
                        }`}
                      >
                        {task.titre}
                      </h4>

                      {task.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onNavigateToExams({ matiere: task.matiereNom })}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center space-x-1"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                      <span>Épreuves</span>
                    </button>

                    <button
                      onClick={() => handleToggleReminder(task.id)}
                      className={`p-2 rounded-xl transition-colors ${
                        task.rappelActif
                          ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      }`}
                      title={task.rappelActif ? "Rappel actif" : "Activer le rappel"}
                    >
                      {task.rappelActif ? <Bell className="w-4 h-4 fill-amber-400" /> : <BellOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="Supprimer cet objectif"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
