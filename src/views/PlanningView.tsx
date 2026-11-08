import React, { useState, useEffect, useMemo } from "react";
import { User, DocumentModel, MatiereModel } from "../types";
import {
  Calendar as CalendarIcon,
  Clock,
  BookOpen,
  CheckCircle2,
  Plus,
  Trash2,
  Bell,
  BellOff,
  CheckSquare,
  Square,
  FileText,
  CalendarCheck,
  Award,
  ArrowRight,
  RotateCcw,
  Layers,
  GraduationCap,
  X,
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

export interface ExamReminder {
  examId: string;
  matiereNom: string;
  typeEpreuve: "CC" | "SN" | "SR";
  dateExamIso: string; // YYYY-MM-DD
  dateRappelIso: string; // YYYY-MM-DD (2 days before)
  heureDebut: string;
  heureFin: string;
  actif: boolean;
  createdAt: string;
  notified?: boolean;
}

// Calcule la date exacte 2 jours avant l'épreuve (J-2)
export function getReminderDateIso(dateIso: string): string {
  try {
    const [year, month, day] = dateIso.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 2);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return dateIso;
  }
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
    heureFin: "10:00",
  },
  // Samedi 31/10/2026
  {
    id: "ing1-cc-31-10-electrocinetique",
    matiereNom: "Électrocinétique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-10-31",
    heureDebut: "08:00",
    heureFin: "10:00",
  },
  {
    id: "ing1-cc-31-10-mesures",
    matiereNom: "Mesures Physiques",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-10-31",
    heureDebut: "10:30",
    heureFin: "12:30",
  },
  // Samedi 07/11/2026
  {
    id: "ing1-cc-07-11-mecanique",
    matiereNom: "Mécanique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-07",
    heureDebut: "08:00",
    heureFin: "10:00",
  },
  {
    id: "ing1-cc-07-11-algebre",
    matiereNom: "Algèbre linéaire",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-07",
    heureDebut: "10:30",
    heureFin: "12:30",
  },
  // Samedi 28/11/2026
  {
    id: "ing1-cc-28-11-analyse1",
    matiereNom: "Analyse 1",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-28",
    heureDebut: "08:00",
    heureFin: "10:00",
  },
  {
    id: "ing1-cc-28-11-mecanique",
    matiereNom: "Mécanique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-11-28",
    heureDebut: "10:30",
    heureFin: "12:30",
  },
  // Samedi 05/12/2026
  {
    id: "ing1-cc-05-12-algebre",
    matiereNom: "Algèbre linéaire",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "08:00",
    heureFin: "10:00",
  },
  {
    id: "ing1-cc-05-12-mesures",
    matiereNom: "Mesures Physiques",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "10:30",
    heureFin: "12:30",
  },
  {
    id: "ing1-cc-05-12-anglais",
    matiereNom: "Anglais",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-05",
    heureDebut: "13:00",
    heureFin: "15:00",
  },
  // Samedi 12/12/2026
  {
    id: "ing1-cc-12-12-electrocinetique",
    matiereNom: "Électrocinétique",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-12",
    heureDebut: "08:00",
    heureFin: "10:00",
  },
  {
    id: "ing1-cc-12-12-communication",
    matiereNom: "Communication",
    typeEpreuve: "CC",
    semestre: "Semestre 1",
    dateIso: "2026-12-12",
    heureDebut: "10:30",
    heureFin: "11:30",
  },
];

export const PlanningView: React.FC<PlanningViewProps> = ({
  user,
  documents,
  matieres,
  onNavigateToExams,
}) => {
  const [selectedSemestre, setSelectedSemestre] = useState<"Semestre 1" | "Semestre 2">("Semestre 1");
  const [selectedMatiere, setSelectedMatiere] = useState<string>("Toutes");
  const [statusFilter, setStatusFilter] = useState<"upcoming" | "all" | "past">("upcoming");
  // On mobile/tablet (< lg), "split" acts like "calendar" so the user doesn't have to scroll past everything,
  // while on desktop (lg+) "split" shows both columns side-by-side.
  const [activeView, setActiveView] = useState<"split" | "calendar" | "personal">("split");
  const [mobileSection, setMobileSection] = useState<"calendar" | "personal">("calendar");

  const [examSchedule] = useState<ExamEvent[]>(DEFAULT_ING1_EXAM_SCHEDULE);

  // Check if an exam has ended based on exact date & end time (heureFin)
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
        titre: "Refaire les exercices du CC d'Algèbre linéaire",
        dateCibleIso: "2026-11-25",
        terminee: false,
        rappelActif: true,
        notes: "Insister sur le calcul de déterminants et la réduction d'endomorphismes.",
      },
      {
        id: "task-2",
        matiereNom: "Analyse 1",
        titre: "Réviser les développements limités et suites numériques",
        dateCibleIso: "2026-11-26",
        terminee: true,
        rappelActif: false,
        notes: "Revoir la formule de Taylor-Young.",
      },
    ];
  });

  // State for new task creation
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskMatiere, setNewTaskMatiere] = useState("Analyse 1");
  const [newTaskDate, setNewTaskDate] = useState("2026-11-28");
  const [newTaskNotes, setNewTaskNotes] = useState("");
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyTasks, JSON.stringify(userTasks));
    } catch {}
  }, [userTasks, storageKeyTasks]);

  // Load and persist exam reminders in localStorage
  const storageKeyReminders = `revisio_exam_reminders_${user?.id || "guest"}`;
  const [examReminders, setExamReminders] = useState<ExamReminder[]>(() => {
    try {
      const saved = localStorage.getItem(storageKeyReminders);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        examId: "ing1-cc-28-11-analyse1",
        matiereNom: "Analyse 1",
        typeEpreuve: "CC",
        dateExamIso: "2026-11-28",
        dateRappelIso: "2026-11-26",
        heureDebut: "08:00",
        heureFin: "10:00",
        actif: true,
        createdAt: "2026-11-01T08:00:00.000Z",
        notified: false,
      },
    ];
  });

  // Toast feedback state for reminder actions
  const [reminderToast, setReminderToast] = useState<{
    message: string;
    type: "success" | "info" | "warning";
  } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!reminderToast) return;
    const timer = setTimeout(() => {
      setReminderToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [reminderToast]);

  // Persist reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKeyReminders, JSON.stringify(examReminders));
    } catch {}
  }, [examReminders, storageKeyReminders]);

  // Today in YYYY-MM-DD
  const todayIso = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Check if reminder is due or approaching
  const isReminderDue = (r: ExamReminder) => {
    return r.actif && todayIso >= r.dateRappelIso && todayIso <= r.dateExamIso;
  };

  const dueReminders = useMemo(() => {
    return examReminders.filter(isReminderDue);
  }, [examReminders, todayIso]);

  const activeRemindersCount = useMemo(() => {
    return examReminders.filter((r) => r.actif).length;
  }, [examReminders]);

  const getExamReminder = (examId: string): ExamReminder | undefined => {
    return examReminders.find((r) => r.examId === examId);
  };

  const isExamReminderActive = (examId: string): boolean => {
    const r = getExamReminder(examId);
    return Boolean(r && r.actif);
  };

  // Toggle reminder with Web Notification support
  const handleToggleExamReminder = async (ev: ExamEvent) => {
    const currentReminder = getExamReminder(ev.id);
    const dateRappel = getReminderDateIso(ev.dateIso);
    const isActivating = !currentReminder || !currentReminder.actif;

    if (isActivating) {
      let notifGranted = false;
      let notifSupported = false;

      if (typeof window !== "undefined" && "Notification" in window) {
        notifSupported = true;
        try {
          if (Notification.permission === "granted") {
            notifGranted = true;
          } else if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            notifGranted = permission === "granted";
          }
        } catch (err) {
          console.warn("Notification permission error:", err);
        }
      }

      const newReminder: ExamReminder = {
        examId: ev.id,
        matiereNom: ev.matiereNom,
        typeEpreuve: ev.typeEpreuve,
        dateExamIso: ev.dateIso,
        dateRappelIso: dateRappel,
        heureDebut: ev.heureDebut,
        heureFin: ev.heureFin,
        actif: true,
        createdAt: new Date().toISOString(),
        notified: false,
      };

      setExamReminders((prev) => {
        const filtered = prev.filter((r) => r.examId !== ev.id);
        return [newReminder, ...filtered];
      });

      if (notifGranted) {
        try {
          new Notification(`Rappel programmé : ${ev.typeEpreuve} de ${ev.matiereNom}`, {
            body: `Vous recevrez une alerte le ${formatDateFr(dateRappel)} (2 jours avant l'examen prévu le ${formatDateFr(ev.dateIso)}).`,
            icon: "/assets/aistudio/image_6ed15396.png",
          });
        } catch {}
        setReminderToast({
          message: `Rappel J-2 activé pour ${ev.typeEpreuve} ${ev.matiereNom} (Alerte prévue le ${formatDateFr(dateRappel)}).`,
          type: "success",
        });
      } else if (!notifSupported) {
        setReminderToast({
          message: `Rappel J-2 programmé en local pour ${ev.matiereNom} (le ${formatDateFr(dateRappel)}).`,
          type: "info",
        });
      } else {
        setReminderToast({
          message: `Rappel J-2 programmé en local pour ${ev.matiereNom}. Les notifications push du navigateur sont bloquées ou désactivées.`,
          type: "warning",
        });
      }
    } else {
      setExamReminders((prev) =>
        prev.map((r) => (r.examId === ev.id ? { ...r, actif: false } : r))
      );
      setReminderToast({
        message: `Rappel J-2 désactivé pour ${ev.typeEpreuve} ${ev.matiereNom}.`,
        type: "info",
      });
    }
  };

  // Periodic check for due notifications
  useEffect(() => {
    const checkDueReminders = () => {
      if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const now = new Date();
      const currentIso = now.toISOString().slice(0, 10);

      setExamReminders((prev) => {
        let changed = false;
        const updated = prev.map((rem) => {
          if (rem.actif && !rem.notified && currentIso >= rem.dateRappelIso && currentIso <= rem.dateExamIso) {
            try {
              new Notification(`⚠️ Rappel Épreuve J-2 : ${rem.typeEpreuve} de ${rem.matiereNom}`, {
                body: `L'épreuve aura lieu le ${formatDateFr(rem.dateExamIso)} de ${rem.heureDebut} à ${rem.heureFin}. Consultez vos annales sur Revisio !`,
                icon: "/assets/aistudio/image_6ed15396.png",
              });
              changed = true;
              return { ...rem, notified: true };
            } catch {
              return rem;
            }
          }
          return rem;
        });
        return changed ? updated : prev;
      });
    };

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 60000);
    return () => clearInterval(interval);
  }, []);

  const semesterMatieresList = useMemo(() => {
    const list = matieres
      .filter((m) => m.semestre === selectedSemestre)
      .map((m) => m.nom);
    return list.length > 0
      ? list
      : [
          "Analyse 1",
          "Algèbre linéaire",
          "Électrocinétique",
          "Mécanique",
          "Mesures Physiques",
          "Mécatronique",
          "Communication",
          "Anglais",
        ];
  }, [matieres, selectedSemestre]);

  // Filtered Exam Events (hides ended exams by default)
  const filteredEvents = useMemo(() => {
    return examSchedule
      .filter((ev) => {
        if (ev.semestre !== selectedSemestre) return false;
        if (selectedMatiere !== "Toutes" && ev.matiereNom !== selectedMatiere) return false;

        const ended = isExamEnded(ev);
        if (statusFilter === "upcoming" && ended) return false;
        if (statusFilter === "past" && !ended) return false;

        return true;
      })
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
        return a.heureDebut.localeCompare(b.heureDebut);
      });
  }, [examSchedule, selectedSemestre, selectedMatiere, statusFilter]);

  // Group filtered events by dateIso for clean visual structure
  const groupedEventsByDate = useMemo(() => {
    const groups: Array<{ dateIso: string; events: ExamEvent[] }> = [];
    for (const ev of filteredEvents) {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.dateIso === ev.dateIso) {
        lastGroup.events.push(ev);
      } else {
        groups.push({ dateIso: ev.dateIso, events: [ev] });
      }
    }
    return groups;
  }, [filteredEvents]);

  // Next upcoming exam session date and all exams scheduled for that day
  const nextUpcomingExams = useMemo(() => {
    const upcoming = examSchedule
      .filter((ev) => !isExamEnded(ev))
      .sort((a, b) => {
        if (a.dateIso !== b.dateIso) return a.dateIso.localeCompare(b.dateIso);
        return a.heureDebut.localeCompare(b.heureDebut);
      });

    if (upcoming.length === 0) return [];
    const earliestDateIso = upcoming[0].dateIso;
    return upcoming.filter((ev) => ev.dateIso === earliestDateIso);
  }, [examSchedule]);

  const handleToggleTask = (id: string) => {
    setUserTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, terminee: !t.terminee } : t))
    );
  };

  const handleToggleReminder = (id: string) => {
    setUserTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, rappelActif: !t.rappelActif } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setUserTasks((prev) => prev.filter((t) => t.id !== id));
  };

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
      notes: `Horaire de l'épreuve : ${ev.heureDebut} à ${ev.heureFin}`,
    };
    setUserTasks((prev) => [task, ...prev]);
  };

  const getDocCountForSubject = (matiereNom: string) => {
    return documents.filter(
      (d) =>
        d.matiere?.toLowerCase().trim() === matiereNom.toLowerCase().trim() &&
        d.statut === "Publié"
    ).length;
  };

  const getMatiereCode = (matiereNom: string) => {
    const found = matieres.find(
      (m) => m.nom.toLowerCase().trim() === matiereNom.toLowerCase().trim()
    );
    return found?.code || "ING1";
  };

  const formatDateFr = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return dateStr;
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const tasksCompletedCount = userTasks.filter((t) => t.terminee).length;
  const tasksTotalCount = userTasks.length;
  const progressPercent =
    tasksTotalCount > 0 ? Math.round((tasksCompletedCount / tasksTotalCount) * 100) : 0;

  const isFiltered = selectedMatiere !== "Toutes" || statusFilter !== "upcoming";

  const handleResetFilters = () => {
    setSelectedMatiere("Toutes");
    setStatusFilter("upcoming");
  };

  return (
    <div className="space-y-5 sm:space-y-8 pb-10 sm:pb-12">
      {/* Institutional Header Card */}
      <Reveal>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-5">
            <div className="space-y-1.5 sm:space-y-2">
              <div className="inline-flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 border border-blue-100 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 text-[11px] sm:text-xs font-bold">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="truncate">Organisation & Planning Académique • ING1</span>
              </div>
              <div className="flex items-center space-x-2.5 sm:space-x-3 text-blue-900 dark:text-blue-300">
                <CalendarIcon className="w-6 h-6 sm:w-7 sm:h-7 shrink-0" />
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                  Planning des CC & Révisions
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Consultez le calendrier officiel des contrôles continus de Première Année Ingénieur, accédez aux anciennes épreuves et organisez vos objectifs de révision.
              </p>

              {/* Active Reminders Indicator */}
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {activeRemindersCount > 0 ? (
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                    <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 fill-amber-500/30" />
                    <span>
                      {activeRemindersCount} rappel{activeRemindersCount > 1 ? "s" : ""} d'examen J-2 activé{activeRemindersCount > 1 ? "s" : ""}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Activez un « Rappel J-2 » sur une épreuve pour être notifié 2 jours avant l'examen</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile 2-Tab Switcher (Full-width, ergonomic on phones/tablets) */}
            <div className="grid grid-cols-2 lg:hidden bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full">
              <button
                type="button"
                onClick={() => setMobileSection("calendar")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  mobileSection === "calendar"
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Calendrier ({filteredEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileSection("personal")}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                  mobileSection === "personal"
                    ? "bg-blue-900 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Mon Planner ({userTasks.length})</span>
              </button>
            </div>

            {/* Desktop 3-Mode Pill Switcher */}
            <div className="hidden lg:flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-full border border-slate-200 dark:border-slate-700 self-center shrink-0">
              <button
                type="button"
                onClick={() => setActiveView("split")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeView === "split"
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Vue globale
              </button>
              <button
                type="button"
                onClick={() => setActiveView("calendar")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeView === "calendar"
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendrier ({filteredEvents.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("personal")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeView === "personal"
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Mon Planner ({userTasks.length})</span>
              </button>
            </div>
          </div>

          {/* Compact Responsive Filter Bar (2-col on mobile, 3-col on tablet/desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* Semestre */}
            <div className="col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 truncate">
                Semestre
              </label>
              <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-600 h-[38px]">
                <button
                  type="button"
                  onClick={() => setSelectedSemestre("Semestre 1")}
                  className={`flex-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    selectedSemestre === "Semestre 1"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">S1</span>
                  <span className="hidden sm:inline">Semestre 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSemestre("Semestre 2")}
                  className={`flex-1 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                    selectedSemestre === "Semestre 2"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <span className="sm:hidden">S2</span>
                  <span className="hidden sm:inline">Semestre 2</span>
                </button>
              </div>
            </div>

            {/* Période / Statut */}
            <div className="col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 truncate">
                Sessions
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "upcoming" | "all" | "past")}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer font-medium h-[38px]"
              >
                <option value="upcoming">À venir uniquement</option>
                <option value="all">Toutes les sessions</option>
                <option value="past">Sessions terminées</option>
              </select>
            </div>

            {/* Matière (Full width on mobile row 2, 1 col on sm+) */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 truncate">
                Filtrer par matière
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMatiere}
                  onChange={(e) => setSelectedMatiere(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer font-medium h-[38px]"
                >
                  <option value="Toutes">Toutes les matières ({semesterMatieresList.length})</option>
                  {semesterMatieresList.map((nom) => (
                    <option key={nom} value={nom}>
                      {nom}
                    </option>
                  ))}
                </select>
                {isFiltered && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    title="Réinitialiser les filtres"
                    className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center shrink-0 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Due Reminders Alert Banner (J-2 Approaching or Today) */}
      {dueReminders.length > 0 && (
        <Reveal delay={0.04}>
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
            <div className="flex items-start sm:items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bell className="w-5 h-5 fill-white animate-pulse" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-400/20 text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                    Alerte Rappel J-2
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-100">
                    {dueReminders.length} épreuve{dueReminders.length > 1 ? "s" : ""} imminente{dueReminders.length > 1 ? "s" : ""} programmée{dueReminders.length > 1 ? "s" : ""} !
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300 line-clamp-1">
                  {dueReminders
                    .map((r) => `${r.typeEpreuve} ${r.matiereNom} (${formatDateFr(r.dateExamIso)})`)
                    .join(" • ")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const firstDue = dueReminders[0];
                onNavigateToExams({ matiere: firstDue.matiereNom });
              }}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center space-x-1.5 cursor-pointer self-start sm:self-center"
            >
              <span>Réviser les annales</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Reveal>
      )}

      {/* Spotlight Banner: Next Upcoming CC Session */}
      {nextUpcomingExams.length > 0 && (
        <Reveal delay={0.08}>
          <section className="bg-blue-900 text-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-lg space-y-3.5 sm:space-y-5">
            <div className="flex items-center justify-between gap-2 border-b border-blue-800 pb-3 sm:pb-4">
              <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/15">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-200" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-blue-200 block truncate">
                    Prochaine journée d'évaluation
                  </span>
                  <h2 className="text-sm sm:text-lg lg:text-xl font-extrabold text-white capitalize truncate">
                    {formatDateFr(nextUpcomingExams[0].dateIso)}
                  </h2>
                </div>
              </div>

              <span className="inline-flex items-center space-x-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] sm:text-xs font-bold text-blue-100 shrink-0">
                <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-200 shrink-0" />
                <span>
                  {nextUpcomingExams.length > 1
                    ? `${nextUpcomingExams.length} CC`
                    : "1 CC"}
                </span>
              </span>
            </div>

            <div
              className={`grid grid-cols-1 ${
                nextUpcomingExams.length > 1 ? "md:grid-cols-2" : "grid-cols-1"
              } gap-3 sm:gap-4`}
            >
              {nextUpcomingExams.map((exam) => {
                const isAdded = userTasks.some((t) => t.examEventId === exam.id);
                const docCount = getDocCountForSubject(exam.matiereNom);
                const isReminderActive = isExamReminderActive(exam.id);
                const reminderDateIso = getReminderDateIso(exam.dateIso);

                return (
                  <div
                    key={exam.id}
                    className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-blue-100 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-3 sm:gap-4"
                  >
                    <div className="space-y-2">
                      {/* Top row: Badges on left, Time pill on right */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20 shrink-0">
                            {exam.typeEpreuve}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-500/30 shrink-0">
                            {getMatiereCode(exam.matiereNom)}
                          </span>
                        </div>

                        <div className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 shrink-0">
                          <Clock className="w-3 h-3 text-blue-700 dark:text-blue-400 shrink-0" />
                          <span>
                            {exam.heureDebut} – {exam.heureFin}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                            {exam.matiereNom}
                          </h3>
                          {isReminderActive && (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0">
                              <Bell className="w-3 h-3 fill-amber-500 text-amber-600 dark:text-amber-400" />
                              <span>Rappel J-2 actif ({formatDateFr(reminderDateIso)})</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons: 3 responsive actions */}
                    <div className="pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToExams({ matiere: exam.matiereNom, semestre: exam.semestre })
                        }
                        className="px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-500/15 text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                        <span className="truncate">Épreuves ({docCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleExamReminder(exam)}
                        title={
                          isReminderActive
                            ? "Désactiver le rappel J-2"
                            : "Activer un rappel 2 jours avant l'examen"
                        }
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isReminderActive
                            ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <Bell className={`w-3.5 h-3.5 shrink-0 ${isReminderActive ? "fill-white" : ""}`} />
                        <span className="truncate">{isReminderActive ? "Rappel actif" : "Rappel J-2"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAddExamToPlanner(exam)}
                        disabled={isAdded}
                        className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                          isAdded
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 cursor-default"
                            : "bg-blue-900 hover:bg-blue-800 text-white shadow-xs active:scale-95"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">Planifié</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Planifier</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* Main Content Area: Responsive Mobile Tabbing & Desktop Split Layout */}
      <div
        className={`grid grid-cols-1 ${
          activeView === "split" ? "lg:grid-cols-12" : "lg:grid-cols-1"
        } gap-6 sm:gap-8 items-start`}
      >
        {/* LEFT / MAIN COLUMN: Official Exam Schedule grouped by Date */}
        <div
          className={`${
            mobileSection === "calendar" ? "block" : "hidden"
          } ${
            activeView === "personal"
              ? "lg:hidden"
              : activeView === "split"
                ? "lg:block lg:col-span-7"
                : "lg:block"
          } space-y-4 sm:space-y-6`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5 sm:pb-3">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2 min-w-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 dark:text-blue-400 shrink-0" />
              <span className="truncate">Calendrier Officiel ({selectedSemestre})</span>
            </h2>
            <span className="text-[11px] sm:text-xs bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full font-bold shrink-0">
              {filteredEvents.length} Épreuve{filteredEvents.length > 1 ? "s" : ""}
            </span>
          </div>

          {groupedEventsByDate.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 sm:p-8 text-center space-y-3 shadow-sm">
              <CalendarIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-slate-900 dark:text-white font-bold text-sm">
                  Aucune épreuve à afficher pour cette sélection
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {statusFilter === "upcoming"
                    ? "Toutes les épreuves correspondantes sont déjà passées ou aucune session n'est programmée pour ce filtre."
                    : "Aucune épreuve ne correspond aux critères sélectionnés."}
                </p>
              </div>
              {statusFilter === "upcoming" && (
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-full transition-colors shadow-xs cursor-pointer"
                >
                  Afficher toutes les épreuves du semestre
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {groupedEventsByDate.map((group, groupIdx) => (
                <Reveal key={group.dateIso} delay={Math.min(groupIdx * 0.05, 0.25)}>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-sm">
                    {/* Date Header */}
                    <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                        <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white capitalize truncate">
                          {formatDateFr(group.dateIso)}
                        </h3>
                      </div>
                      <span className="text-[10px] sm:text-[11px] bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 px-2 sm:px-2.5 py-0.5 rounded-full font-bold shrink-0">
                        {group.events.length} {group.events.length > 1 ? "Épreuves" : "Épreuve"}
                      </span>
                    </div>

                    {/* Exams on this date */}
                    <div className="grid grid-cols-1 gap-3">
                      {group.events.map((ev) => {
                        const docCount = getDocCountForSubject(ev.matiereNom);
                        const isAddedToPlanner = userTasks.some((t) => t.examEventId === ev.id);
                        const ended = isExamEnded(ev);
                        const isReminderActive = isExamReminderActive(ev.id);
                        const reminderDateIso = getReminderDateIso(ev.dateIso);

                        return (
                          <div
                            key={ev.id}
                            className="p-3.5 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 hover:bg-blue-50/40 dark:hover:bg-blue-500/10 border border-slate-200/80 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              {/* Top metadata row */}
                              <div className="flex items-center justify-between sm:justify-start gap-2">
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-300 border-red-100 dark:border-red-500/20">
                                    {ev.typeEpreuve}
                                  </span>
                                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200">
                                    {getMatiereCode(ev.matiereNom)}
                                  </span>
                                  {ended && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                      Terminée
                                    </span>
                                  )}
                                </div>

                                <span className="inline-flex items-center space-x-1 text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 shrink-0">
                                  <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                  <span>
                                    {ev.heureDebut} – {ev.heureFin}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                                  {ev.matiereNom}
                                </h4>
                                {isReminderActive && (
                                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 shrink-0">
                                    <Bell className="w-3 h-3 fill-amber-500 text-amber-600 dark:text-amber-400" />
                                    <span>Rappel J-2 : {formatDateFr(reminderDateIso)}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Action buttons: Responsive actions */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-200/70 dark:border-slate-700/70">
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigateToExams({
                                    matiere: ev.matiereNom,
                                    semestre: ev.semestre,
                                  })
                                }
                                className="px-3 py-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-700 dark:text-blue-300 shrink-0" />
                                <span className="truncate">
                                  {docCount} {docCount > 1 ? "épreuves" : "épreuve"}
                                </span>
                              </button>

                              {!ended && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleExamReminder(ev)}
                                    title={
                                      isReminderActive
                                        ? "Désactiver le rappel J-2"
                                        : "Activer un rappel 2 jours avant l'examen"
                                    }
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                      isReminderActive
                                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                                        : "bg-white dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-500/15 text-slate-700 dark:text-slate-200 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-600"
                                    }`}
                                  >
                                    <Bell className={`w-3.5 h-3.5 shrink-0 ${isReminderActive ? "fill-white" : ""}`} />
                                    <span className="truncate">{isReminderActive ? "Rappel actif" : "Rappel J-2"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAddExamToPlanner(ev)}
                                    disabled={isAddedToPlanner}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                      isAddedToPlanner
                                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 cursor-default"
                                        : "bg-blue-900 hover:bg-blue-800 text-white shadow-xs active:scale-95"
                                    }`}
                                  >
                                    {isAddedToPlanner ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        <span className="truncate">Planifié</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">Planifier</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Personalized Revision Planner */}
        <div
          className={`${
            mobileSection === "personal" ? "block" : "hidden"
          } ${
            activeView === "calendar"
              ? "lg:hidden"
              : activeView === "split"
                ? "lg:block lg:col-span-5"
                : "lg:block"
          } space-y-4 sm:space-y-6`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2.5 sm:pb-3">
            <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center space-x-2 min-w-0">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700 dark:text-blue-400 shrink-0" />
              <span className="truncate">Mon Programme de Révision</span>
            </h2>
            <button
              type="button"
              onClick={() => setShowAddTaskForm(!showAddTaskForm)}
              className="px-3 sm:px-3.5 py-1.5 rounded-full bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>Objectif</span>
            </button>
          </div>

          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    Progression des révisions
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                    {tasksCompletedCount} sur {tasksTotalCount} objectif{tasksTotalCount > 1 ? "s" : ""} complété{tasksCompletedCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <span className="text-base sm:text-lg font-extrabold text-blue-900 dark:text-blue-300 shrink-0">
                {progressPercent}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
              <div
                className="h-full bg-blue-700 dark:bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Add Objective Form */}
          {showAddTaskForm && (
            <Reveal>
              <form
                onSubmit={handleAddTask}
                className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 sm:space-y-4 text-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Plus className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                    <span>Ajouter un objectif de révision</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Matière
                    </label>
                    <select
                      value={newTaskMatiere}
                      onChange={(e) => setNewTaskMatiere(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {semesterMatieresList.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Date cible
                    </label>
                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={(e) => setNewTaskDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Titre de l'objectif
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Traiter le sujet de CC 2025-2026"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700 dark:text-slate-300">
                    Notes personnelles (optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Chapitres ou exercices prioritaires..."
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddTaskForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-center cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold shadow-xs text-center cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </Reveal>
          )}

          {/* User Tasks List */}
          <div className="space-y-3">
            {userTasks.length === 0 ? (
              <div className="text-center py-8 sm:py-10 px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2.5 shadow-sm">
                <CalendarCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Aucun objectif dans votre programme
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Cliquez sur « Planifier » sur une épreuve du calendrier officiel pour l'ajouter à vos révisions.
                </p>
              </div>
            ) : (
              userTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    task.terminee
                      ? "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500"
                  }`}
                >
                  <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className="mt-0.5 text-blue-700 dark:text-blue-400 hover:scale-105 transition-transform shrink-0 cursor-pointer"
                      title={
                        task.terminee ? "Marquer comme non terminé" : "Marquer comme terminé"
                      }
                    >
                      {task.terminee ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30">
                          {task.matiereNom}
                        </span>
                        <span className="inline-flex items-center space-x-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="capitalize truncate">{formatDateFr(task.dateCibleIso)}</span>
                        </span>
                      </div>

                      <h4
                        className={`text-xs sm:text-sm font-bold leading-snug ${
                          task.terminee
                            ? "line-through text-slate-400 dark:text-slate-500"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {task.titre}
                      </h4>

                      {task.notes && (
                        <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigateToExams({ matiere: task.matiereNom })}
                      className="text-xs font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 shrink-0" />
                      <span>Épreuves associées</span>
                      <ArrowRight className="w-3 h-3 shrink-0" />
                    </button>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleToggleReminder(task.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          task.rappelActif
                            ? "bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                        title={task.rappelActif ? "Rappel activé" : "Activer le rappel"}
                      >
                        {task.rappelActif ? (
                          <Bell className="w-3.5 h-3.5" />
                        ) : (
                          <BellOff className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Supprimer cet objectif"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Feedback Toast for Exam Reminders */}
      {reminderToast && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-slate-700 dark:border-slate-200 flex items-start space-x-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              reminderToast.type === "success"
                ? "bg-emerald-500/20 text-emerald-400 dark:text-emerald-600"
                : reminderToast.type === "warning"
                ? "bg-amber-500/20 text-amber-400 dark:text-amber-600"
                : "bg-blue-500/20 text-blue-400 dark:text-blue-600"
            }`}
          >
            <Bell className="w-4 h-4 fill-current" />
          </div>
          <div className="flex-1 min-w-0 pr-1">
            <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
              Rappel d'épreuve
            </h5>
            <p className="text-xs font-semibold leading-relaxed">
              {reminderToast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReminderToast(null)}
            className="text-slate-400 hover:text-white dark:hover:text-slate-900 shrink-0 cursor-pointer p-0.5 rounded-lg transition-colors"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
