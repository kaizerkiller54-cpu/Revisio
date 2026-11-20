import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { User } from "../types";
import {
  updateUserProfileApi,
  sendContactMessageApi,
  downloadFeedbackApi,
  getActiveDeviceSessionsApi,
  revokeDeviceSessionApi,
  logoutAllDevicesApi,
  ActiveDeviceSessionInfo,
} from "../lib/api";
import {
  User as UserIcon,
  Lock,
  Mail,
  Palette,
  Send,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Shield,
  LifeBuoy,
  Download,
  Upload,
  Check,
  Bookmark,
  Smartphone,
  LogOut,
  RefreshCw,
  Bell,
  BellOff,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Database,
  Trash2,
  Copy,
  Calendar,
  History,
  FileUp,
  Vibrate,
} from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";

interface SettingsViewProps {
  user: User | null;
  currentTheme: "light" | "dark" | "system";
  onChangeTheme: (theme: "light" | "dark" | "system") => void;
  onUpdateUser: (updatedUser: User) => void;
  onNavigateToRegister: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToFavorites?: () => void;
  onNavigateToActivityLog?: () => void;
  onNavigateToPlanning?: () => void;
  onNavigateToContributions?: () => void;
  onLogout?: () => void;
  favoritesCount?: number;
  contributionsCount?: number;
}

type SettingsSectionId = "profile" | "appearance" | "security" | "data" | "support";

type HapticPattern = "light" | "toggle" | "medium" | "success" | "warning";

interface UserStudyPreferences {
  defaultSemestre: "Tous" | "Semestre 1" | "Semestre 2";
  notificationsEnabled: boolean;
  compactCards: boolean;
  autoPreviewPdf: boolean;
  hapticFeedbackEnabled: boolean;
}

const PREFS_STORAGE_KEY = "revisio_user_preferences_v1";

function loadStudyPreferences(): UserStudyPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        defaultSemestre:
          parsed.defaultSemestre === "Semestre 1" || parsed.defaultSemestre === "Semestre 2"
            ? parsed.defaultSemestre
            : "Tous",
        notificationsEnabled: parsed.notificationsEnabled !== false,
        compactCards: Boolean(parsed.compactCards),
        autoPreviewPdf: parsed.autoPreviewPdf !== false,
        hapticFeedbackEnabled: parsed.hapticFeedbackEnabled !== false,
      };
    }
  } catch {}
  return {
    defaultSemestre: "Semestre 1",
    notificationsEnabled: true,
    compactCards: false,
    autoPreviewPdf: true,
    hapticFeedbackEnabled: true,
  };
}

function extractLocalCameroonDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00237") && digits.length > 5) {
    return digits.slice(5, 14);
  }
  if (digits.startsWith("237") && digits.length > 9) {
    return digits.slice(3, 12);
  }
  return digits.slice(0, 9);
}

function formatLocalCameroonPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 9);
  if (d.length <= 1) return d;
  if (d.length <= 3) return `${d.slice(0, 1)} ${d.slice(1)}`;
  if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3)}`;
  if (d.length <= 7) return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

// Reusable tactile switch with pronounced press feedback (thumb stretch + scale + ring)
interface TactileSwitchProps {
  checked: boolean;
  onChange: () => void;
  labelOn?: string;
  labelOff?: string;
  iconOn?: React.ReactNode;
  iconOff?: React.ReactNode;
  ariaLabel: string;
}

const TactileSwitch: React.FC<TactileSwitchProps> = ({
  checked,
  onChange,
  labelOn = "Activé",
  labelOff = "Désactivé",
  iconOn,
  iconOff,
  ariaLabel,
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`group min-h-[44px] px-3.5 py-2 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 transition-all duration-150 ease-out select-none touch-manipulation cursor-pointer active:scale-[0.95] active:ring-4 ${
        checked
          ? "bg-blue-50/80 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/40 text-blue-900 dark:text-blue-200 active:ring-blue-500/20"
          : "bg-slate-100/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 active:ring-slate-400/20"
      }`}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {checked ? iconOn : iconOff}
        <span>{checked ? labelOn : labelOff}</span>
      </span>

      {/* Physical Switch Track & Animated Thumb */}
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 ${
          checked
            ? "bg-blue-700 dark:bg-blue-500"
            : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-200 ease-out group-active:w-6 ${
            checked
              ? "translate-x-5 group-active:translate-x-4"
              : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  currentTheme,
  onChangeTheme,
  onUpdateUser,
  onNavigateToRegister,
  onNavigateToLogin,
  onNavigateToFavorites,
  onNavigateToActivityLog,
  onNavigateToPlanning,
  onNavigateToContributions,
  onLogout,
  favoritesCount = 0,
  contributionsCount = 0,
}) => {
  // Desktop active section + Mobile drill-down view (null = mobile main hub)
  const [activeSection, setActiveSection] = useState<SettingsSectionId>("profile");
  const [mobileSection, setMobileSection] = useState<SettingsSectionId | null>(null);

  // Study & Interface Preferences
  const [preferences, setPreferences] = useState<UserStudyPreferences>(() =>
    loadStudyPreferences()
  );
  const [prefsSavedNotice, setPrefsSavedNotice] = useState<string | null>(null);
  const [browserNotifPermission, setBrowserNotifPermission] = useState<string>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });

  const isVibrationSupported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  // Web Vibration API haptic dispatcher
  const triggerHaptic = useCallback(
    (pattern: HapticPattern = "light", forceEvenIfDisabled = false) => {
      if (!forceEvenIfDisabled && !preferences.hapticFeedbackEnabled) return;
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") {
        return;
      }
      try {
        switch (pattern) {
          case "light":
            navigator.vibrate(10);
            break;
          case "toggle":
            navigator.vibrate(18);
            break;
          case "medium":
            navigator.vibrate(28);
            break;
          case "success":
            navigator.vibrate([14, 45, 22]);
            break;
          case "warning":
            navigator.vibrate([30, 50, 35]);
            break;
        }
      } catch {
        // Ignore if blocked by user-agent policy
      }
    },
    [preferences.hapticFeedbackEnabled]
  );

  // Profile fields
  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneDigits, setPhoneDigits] = useState(() =>
    extractLocalCameroonDigits(user?.telephone || "")
  );
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Password fields (in Security tab)
  const [currentMotDePasse, setCurrentMotDePasse] = useState("");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmNouveauMotDePasse, setConfirmNouveauMotDePasse] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Planner local tasks stats & data management
  const plannerStorageKey = `revisio_user_planner_${user?.id || "guest"}`;
  const [plannerStats, setPlannerStats] = useState<{ total: number; completed: number }>({
    total: 0,
    completed: 0,
  });
  const [dataActionNotice, setDataActionNotice] = useState<string | null>(null);
  const fileImportInputRef = useRef<HTMLInputElement | null>(null);

  // Active device sessions state
  const [deviceSessions, setDeviceSessions] = useState<ActiveDeviceSessionInfo[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [isRevokingAllOther, setIsRevokingAllOther] = useState(false);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);

  // Contact / Support state
  const [contactNom, setContactNom] = useState(user ? `${user.prenom} ${user.nom}` : "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactSujet, setContactSujet] = useState("");
  const [contactCategorie, setContactCategorie] = useState("Demande d'épreuve");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState<string | null>(null);
  const [contactErrorMsg, setContactErrorMsg] = useState<string | null>(null);

  // Admin feedback download
  const isAdminOrSuper =
    user?.role === "Administrateur" || user?.role === "SuperAdministrateur";
  const [isDownloadingFeedback, setIsDownloadingFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Keep form fields synced if user prop changes
  useEffect(() => {
    if (user) {
      setNom(user.nom || "");
      setPrenom(user.prenom || "");
      setEmail(user.email || "");
      setPhoneDigits(extractLocalCameroonDigits(user.telephone || ""));
      setContactNom(`${user.prenom} ${user.nom}`.trim());
      setContactEmail(user.email || "");
    }
  }, [user?.id, user?.nom, user?.prenom, user?.email, user?.telephone]);

  // Refresh planner tasks count
  const refreshPlannerStats = () => {
    try {
      const saved = localStorage.getItem(plannerStorageKey);
      if (!saved) {
        setPlannerStats({ total: 0, completed: 0 });
        return;
      }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setPlannerStats({
          total: parsed.length,
          completed: parsed.filter((t) => Boolean(t?.terminee)).length,
        });
      }
    } catch {
      setPlannerStats({ total: 0, completed: 0 });
    }
  };

  useEffect(() => {
    refreshPlannerStats();
  }, [plannerStorageKey, activeSection, mobileSection]);

  const loadDeviceSessions = async () => {
    if (!user) return;
    setIsLoadingSessions(true);
    try {
      const list = await getActiveDeviceSessionsApi();
      setDeviceSessions(list);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDeviceSessions();
    } else {
      setDeviceSessions([]);
    }
  }, [user?.id]);

  // Validation helpers
  const cleanPhoneDigits = phoneDigits.replace(/\D/g, "");
  const isPhoneValid =
    cleanPhoneDigits.length === 0 ||
    (cleanPhoneDigits.length === 9 && cleanPhoneDigits.startsWith("6"));
  const fullTelephoneValue =
    cleanPhoneDigits.length === 9 ? `+237${cleanPhoneDigits}` : "";

  const emailChanged =
    !!user && email.trim().toLowerCase() !== user.email.toLowerCase();

  const hasMinLength = nouveauMotDePasse.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(nouveauMotDePasse);
  const hasDigit = /[0-9]/.test(nouveauMotDePasse);
  const hasSpecial = /[^a-zA-Z0-9]/.test(nouveauMotDePasse);
  const isNewPasswordValid = hasMinLength && hasLetter && hasDigit;

  const userInitials = useMemo(() => {
    if (!user) return "ISJ";
    const p = (user.prenom || "").trim().charAt(0).toUpperCase();
    const n = (user.nom || "").trim().charAt(0).toUpperCase();
    return `${p}${n}` || "ET";
  }, [user]);

  const handleSelectSection = (sectionId: SettingsSectionId) => {
    triggerHaptic("light");
    setActiveSection(sectionId);
    setMobileSection(sectionId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleThemeSelect = (themeVal: "light" | "dark" | "system") => {
    triggerHaptic("toggle");
    onChangeTheme(themeVal);
  };

  const handleUpdatePreference = <K extends keyof UserStudyPreferences>(
    key: K,
    value: UserStudyPreferences[K]
  ) => {
    // If enabling haptics, vibrate immediately to confirm
    if (key === "hapticFeedbackEnabled" && value === true) {
      triggerHaptic("toggle", true);
    } else {
      triggerHaptic("toggle");
    }

    setPreferences((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setPrefsSavedNotice("Préférence enregistrée automatiquement.");
    setTimeout(() => setPrefsSavedNotice(null), 2500);
  };

  const handleRequestNotificationPermission = async () => {
    triggerHaptic("medium");
    if (typeof Notification === "undefined") return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserNotifPermission(perm);
      if (perm === "granted") {
        triggerHaptic("success");
        handleUpdatePreference("notificationsEnabled", true);
      }
    } catch {}
  };

  const handleCopyEmail = async () => {
    if (!user?.email) return;
    triggerHaptic("light");
    try {
      await navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch {}
  };

  // Submit personal profile info (name, email, phone)
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      triggerHaptic("medium");
      onNavigateToRegister();
      return;
    }
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!nom.trim() || !prenom.trim()) {
      triggerHaptic("warning");
      setProfileErrorMsg("Veuillez renseigner votre nom et votre prénom.");
      return;
    }
    if (!isPhoneValid) {
      triggerHaptic("warning");
      setProfileErrorMsg(
        "Le numéro de téléphone doit comporter 9 chiffres commençant par 6 (ex: 6 55 12 34 56) ou être laissé vide."
      );
      return;
    }
    if (emailChanged && !emailConfirmPassword) {
      triggerHaptic("warning");
      setProfileErrorMsg(
        "Veuillez saisir votre mot de passe actuel pour confirmer le changement d'adresse e-mail."
      );
      return;
    }

    triggerHaptic("medium");
    setIsUpdatingProfile(true);
    try {
      const res = await updateUserProfileApi({
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        telephone: fullTelephoneValue || null,
        currentMotDePasse: emailChanged ? emailConfirmPassword : undefined,
      });
      onUpdateUser(res.user);
      setEmailConfirmPassword("");
      triggerHaptic("success");
      setProfileSuccessMsg(res.message || "Vos informations ont été mises à jour.");
    } catch (err: any) {
      triggerHaptic("warning");
      setProfileErrorMsg(
        err?.message || "Impossible de mettre à jour vos informations pour le moment."
      );
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Submit password change (in Security section)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!currentMotDePasse) {
      triggerHaptic("warning");
      setPasswordErrorMsg("Veuillez saisir votre mot de passe actuel.");
      return;
    }
    if (!isNewPasswordValid) {
      triggerHaptic("warning");
      setPasswordErrorMsg(
        "Le nouveau mot de passe doit contenir au moins 8 caractères avec des lettres et des chiffres."
      );
      return;
    }
    if (nouveauMotDePasse !== confirmNouveauMotDePasse) {
      triggerHaptic("warning");
      setPasswordErrorMsg("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }

    triggerHaptic("medium");
    setIsUpdatingPassword(true);
    try {
      const res = await updateUserProfileApi({
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        telephone: user.telephone || null,
        nouveauMotDePasse,
        currentMotDePasse,
      });
      onUpdateUser(res.user);
      setCurrentMotDePasse("");
      setNouveauMotDePasse("");
      setConfirmNouveauMotDePasse("");
      triggerHaptic("success");
      setPasswordSuccessMsg("Votre mot de passe a été modifié avec succès.");
    } catch (err: any) {
      triggerHaptic("warning");
      setPasswordErrorMsg(
        err?.message || "Erreur lors de la modification du mot de passe."
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, isCurrentDevice: boolean) => {
    triggerHaptic("warning");
    setRevokingSessionId(sessionId);
    setSessionsNotice(null);
    try {
      const res = await revokeDeviceSessionApi(sessionId);
      if (isCurrentDevice || res.revokedCurrentDevice) {
        onLogout?.();
        return;
      }
      triggerHaptic("success");
      setSessionsNotice(res.message || "Appareil déconnecté avec succès.");
      await loadDeviceSessions();
    } catch (err: any) {
      setSessionsNotice(err?.message || "Impossible de révoquer cette session.");
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleLogoutOtherDevices = async () => {
    triggerHaptic("warning");
    setIsRevokingAllOther(true);
    setSessionsNotice(null);
    try {
      const res = await logoutAllDevicesApi(true);
      triggerHaptic("success");
      setSessionsNotice(res.message || "Tous les autres appareils ont été déconnectés.");
      await loadDeviceSessions();
    } catch (err: any) {
      setSessionsNotice(err?.message || "Impossible de déconnecter les autres appareils.");
    } finally {
      setIsRevokingAllOther(false);
    }
  };

  // Data Backup & Cleanup handlers
  const handleExportPersonalData = () => {
    triggerHaptic("medium");
    try {
      const tasksRaw = localStorage.getItem(plannerStorageKey);
      const tasks = tasksRaw ? JSON.parse(tasksRaw) : [];
      const favsRaw = user?.id
        ? localStorage.getItem(`revisio_user_favs_${user.id}`)
        : null;
      const favs = favsRaw ? JSON.parse(favsRaw) : [];

      const payload = {
        plateforme: "Revisio ISJ - Première Année Ingénieur (ING1)",
        exportDate: new Date().toISOString(),
        utilisateur: user
          ? {
              nom: user.nom,
              prenom: user.prenom,
              email: user.email,
              role: user.role,
            }
          : { statut: "Visiteur" },
        preferences,
        theme: currentTheme,
        favorisIds: favs,
        objectifsRevision: tasks,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `revisio-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerHaptic("success");
      setDataActionNotice("Votre sauvegarde personnelle (JSON) a été téléchargée.");
    } catch {
      triggerHaptic("warning");
      setDataActionNotice("Impossible de générer le fichier de sauvegarde.");
    }
  };

  const handleImportPersonalData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        if (Array.isArray(parsed.objectifsRevision)) {
          localStorage.setItem(
            plannerStorageKey,
            JSON.stringify(parsed.objectifsRevision)
          );
        }
        if (parsed.preferences && typeof parsed.preferences === "object") {
          const nextPrefs: UserStudyPreferences = {
            defaultSemestre:
              parsed.preferences.defaultSemestre === "Semestre 1" ||
              parsed.preferences.defaultSemestre === "Semestre 2"
                ? parsed.preferences.defaultSemestre
                : "Tous",
            notificationsEnabled: parsed.preferences.notificationsEnabled !== false,
            compactCards: Boolean(parsed.preferences.compactCards),
            autoPreviewPdf: parsed.preferences.autoPreviewPdf !== false,
            hapticFeedbackEnabled: parsed.preferences.hapticFeedbackEnabled !== false,
          };
          setPreferences(nextPrefs);
          localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(nextPrefs));
        }
        refreshPlannerStats();
        triggerHaptic("success");
        setDataActionNotice("Sauvegarde restaurée avec succès dans votre espace.");
      } catch {
        triggerHaptic("warning");
        setDataActionNotice("Le fichier sélectionné n'est pas une sauvegarde Revisio valide.");
      } finally {
        if (fileImportInputRef.current) {
          fileImportInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearCompletedTasks = () => {
    triggerHaptic("warning");
    try {
      const saved = localStorage.getItem(plannerStorageKey);
      if (!saved) return;
      const tasks = JSON.parse(saved);
      if (!Array.isArray(tasks)) return;
      const remaining = tasks.filter((t) => !t?.terminee);
      localStorage.setItem(plannerStorageKey, JSON.stringify(remaining));
      refreshPlannerStats();
      triggerHaptic("success");
      setDataActionNotice("Les objectifs de révision terminés ont été nettoyés.");
    } catch {
      setDataActionNotice("Impossible de nettoyer les objectifs terminés.");
    }
  };

  const handleDownloadFeedback = async () => {
    triggerHaptic("medium");
    setIsDownloadingFeedback(true);
    setFeedbackMsg(null);
    try {
      const result = await downloadFeedbackApi();
      if (!result) {
        setFeedbackMsg("Aucun retour utilisateur enregistré pour le moment.");
        return;
      }
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerHaptic("success");
      setFeedbackMsg("Archive JSON des retours téléchargée avec succès.");
    } catch {
      triggerHaptic("warning");
      setFeedbackMsg("Erreur lors du téléchargement des retours.");
    } finally {
      setIsDownloadingFeedback(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic("medium");
    setIsSendingContact(true);
    setContactSuccessMsg(null);
    setContactErrorMsg(null);

    try {
      const res = await sendContactMessageApi({
        nom: contactNom.trim(),
        email: contactEmail.trim(),
        sujet: contactSujet.trim(),
        categorie: contactCategorie,
        message: contactMessage.trim(),
      });
      triggerHaptic("success");
      setContactSuccessMsg(res.message || "Votre message a bien été transmis à l'équipe.");
      setContactSujet("");
      setContactMessage("");
    } catch (err: any) {
      triggerHaptic("warning");
      setContactErrorMsg(err?.message || "Erreur lors de l'envoi du message.");
    } finally {
      setIsSendingContact(false);
    }
  };

  // Shared button classes with pronounced mobile tactile click feedback
  const primaryButtonClass =
    "min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all duration-150 ease-out select-none touch-manipulation active:scale-[0.95] active:brightness-90 active:ring-4 active:ring-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer";

  const secondaryButtonClass =
    "min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all duration-150 ease-out select-none touch-manipulation active:scale-[0.95] active:bg-slate-200/80 dark:active:bg-slate-700 active:ring-4 active:ring-slate-400/20 flex items-center justify-center gap-2 cursor-pointer";

  const sectionsMeta: Array<{
    id: SettingsSectionId;
    title: string;
    shortTitle: string;
    subtitle: string;
    icon: React.FC<{ className?: string }>;
    summaryValue?: string;
  }> = [
    {
      id: "profile",
      title: "Profil & Identité",
      shortTitle: "Profil",
      subtitle: "Informations personnelles, coordonnées et raccourcis",
      icon: UserIcon,
      summaryValue: user ? `${user.prenom} ${user.nom}` : "Non connecté",
    },
    {
      id: "appearance",
      title: "Apparence & Préférences",
      shortTitle: "Apparence",
      subtitle: "Thème visuel, notifications, haptique et confort d'étude",
      icon: Palette,
      summaryValue:
        currentTheme === "dark"
          ? "Mode Sombre"
          : currentTheme === "light"
          ? "Mode Clair"
          : "Système",
    },
    {
      id: "security",
      title: "Sécurité & Appareils",
      shortTitle: "Sécurité",
      subtitle: "Mot de passe et sessions persistantes actives",
      icon: Shield,
      summaryValue: user
        ? `${Math.max(deviceSessions.length, 1)} appareil${
            deviceSessions.length > 1 ? "s" : ""
          }`
        : "Authentification",
    },
    {
      id: "data",
      title: "Données & Sauvegarde",
      shortTitle: "Données",
      subtitle: "Export JSON du planner, synchronisation et stockage",
      icon: Database,
      summaryValue: `${plannerStats.total} objectif${plannerStats.total > 1 ? "s" : ""}`,
    },
    {
      id: "support",
      title: "Assistance & Contact ISJ",
      shortTitle: "Assistance",
      subtitle: "Signaler une erreur, demander un sujet ou écrire à l'équipe",
      icon: LifeBuoy,
      summaryValue: "Support direct",
    },
  ];

  const currentSectionMeta =
    sectionsMeta.find((s) => s.id === (mobileSection || activeSection)) ||
    sectionsMeta[0];

  // Shared section renderers so Desktop Content Pane and Mobile Drill-Down View stay 100% consistent
  const renderProfileSection = () => (
    <div className="space-y-6">
      {/* User Identity Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7">
        {user ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center text-lg sm:text-xl font-bold tracking-tight shrink-0 shadow-xs">
                  {userInitials}
                </div>
                <div className="min-w-0 space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                    {user.prenom} {user.nom}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span>
                      {user.role === "SuperAdministrateur"
                        ? "Super Administrateur"
                        : user.role === "Administrateur"
                        ? "Administrateur"
                        : "Étudiant ING1"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyEmail}
                className={`${secondaryButtonClass} shrink-0 self-start sm:self-center`}
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>E-mail copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copier l'e-mail</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Personal Activity Metrics & Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onNavigateToFavorites?.();
                }}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 active:scale-[0.96] active:bg-slate-100 dark:active:bg-slate-800 text-left transition-all duration-150 select-none touch-manipulation cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
                  <Bookmark className="w-4 h-4 text-amber-500" />
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-active:translate-x-1 transition-transform" />
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {favoritesCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Épreuves favorites
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onNavigateToPlanning?.();
                }}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 active:scale-[0.96] active:bg-slate-100 dark:active:bg-slate-800 text-left transition-all duration-150 select-none touch-manipulation cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-active:translate-x-1 transition-transform" />
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {plannerStats.total}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Objectifs planning
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onNavigateToContributions?.();
                }}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 active:scale-[0.96] active:bg-slate-100 dark:active:bg-slate-800 text-left transition-all duration-150 select-none touch-manipulation cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
                  <FileUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-active:translate-x-1 transition-transform" />
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {contributionsCount}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Sujets déposés
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  onNavigateToActivityLog?.();
                }}
                className="p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 active:scale-[0.96] active:bg-slate-100 dark:active:bg-slate-800 text-left transition-all duration-150 select-none touch-manipulation cursor-pointer group"
              >
                <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 mb-1.5">
                  <History className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-active:translate-x-1 transition-transform" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white truncate pt-0.5">
                  Historique
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Journal d'activité
                </div>
              </button>
            </div>

            {/* Personal Info Form */}
            <form onSubmit={handleProfileSubmit} className="space-y-5 pt-2">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Coordonnées personnelles
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mettez à jour votre identité et votre numéro de contact académique.
                </p>
              </div>

              {profileSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}

              {profileErrorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Prénom
                  </label>
                  <input
                    type="text"
                    required
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Nom de famille
                  </label>
                  <input
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Téléphone mobile (optionnel)
                  </label>
                  <div
                    className={`flex items-center min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 transition-all ${
                      !isPhoneValid
                        ? "border-rose-400 dark:border-rose-500"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 select-none tabular-nums">
                      +237
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={18}
                      value={formatLocalCameroonPhone(phoneDigits)}
                      onChange={(e) =>
                        setPhoneDigits(extractLocalCameroonDigits(e.target.value))
                      }
                      placeholder="6 XX XX XX XX"
                      className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none tabular-nums"
                    />
                    {phoneDigits.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setPhoneDigits("");
                        }}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-transform cursor-pointer"
                        title="Effacer le numéro"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {emailChanged && (
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 space-y-2">
                  <label className="block text-xs font-semibold text-amber-950 dark:text-amber-200">
                    Confirmation de sécurité requise pour modifier l'adresse e-mail
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Saisissez votre mot de passe actuel"
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    className="w-full min-h-[44px] bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-500/40 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pour modifier votre mot de passe, rendez-vous dans l'onglet{" "}
                  <button
                    type="button"
                    onClick={() => handleSelectSection("security")}
                    className="font-semibold text-blue-700 dark:text-blue-400 hover:underline active:opacity-75 cursor-pointer"
                  >
                    Sécurité & Appareils
                  </button>
                  .
                </p>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className={`${primaryButtonClass} shrink-0`}
                >
                  {isUpdatingProfile ? (
                    <>
                      <LoadingSpinner className="text-white" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer les modifications</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="py-6 sm:py-8 text-center space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center mx-auto">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Vous naviguez en mode visiteur
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Connectez-vous ou créez un compte étudiant pour synchroniser vos épreuves favorites, télécharger les sujets PDF et personnaliser votre profil.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              {onNavigateToLogin && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("light");
                    onNavigateToLogin();
                  }}
                  className={`w-full sm:w-auto ${secondaryButtonClass}`}
                >
                  Se connecter
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("medium");
                  onNavigateToRegister();
                }}
                className={`w-full sm:w-auto ${primaryButtonClass}`}
              >
                Créer un compte étudiant
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      {/* Theme Selection Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Thème de l'interface
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choisissez une ambiance lumineuse pour la journée ou sombre pour vos révisions nocturnes.
            </p>
          </div>
          {prefsSavedNotice && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0">
              <Check className="w-3.5 h-3.5" />
              <span>Enregistré</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                id: "light",
                label: "Mode Clair",
                desc: "Contraste élevé sur fond clair",
                icon: Sun,
                previewBg: "bg-slate-100 border-slate-200",
                previewCard: "bg-white border-slate-200",
                previewText: "bg-slate-800",
              },
              {
                id: "dark",
                label: "Mode Sombre",
                desc: "Confort visuel pour la nuit",
                icon: Moon,
                previewBg: "bg-slate-950 border-slate-800",
                previewCard: "bg-slate-900 border-slate-800",
                previewText: "bg-slate-200",
              },
              {
                id: "system",
                label: "Automatique",
                desc: "Suit le réglage de l'appareil",
                icon: Laptop,
                previewBg:
                  "bg-gradient-to-r from-slate-100 to-slate-900 border-slate-300 dark:border-slate-700",
                previewCard:
                  "bg-white/90 dark:bg-slate-800/90 border-slate-300 dark:border-slate-700",
                previewText: "bg-blue-600",
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = currentTheme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleThemeSelect(item.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-150 ease-out select-none touch-manipulation cursor-pointer flex flex-col justify-between gap-4 active:scale-[0.96] ${
                  active
                    ? "border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-500/10 ring-2 ring-blue-600/25 dark:ring-blue-400/25"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800 active:ring-2 active:ring-slate-400/20"
                }`}
              >
                {/* Mini Visual UI Preview */}
                <div
                  className={`w-full h-16 rounded-xl border p-2.5 flex flex-col justify-between ${item.previewBg}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500/80" />
                    <span
                      className={`h-1.5 w-12 rounded-full ${item.previewText} opacity-70`}
                    />
                  </div>
                  <div
                    className={`h-6 w-full rounded-lg border px-2 flex items-center ${item.previewCard}`}
                  >
                    <span
                      className={`h-1.5 w-16 rounded-full ${item.previewText} opacity-40`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {item.desc}
                    </p>
                  </div>
                  {active && (
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Study, Notifications & Tactile Haptics Preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Préférences d'étude, Notifications & Tactile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adaptez le comportement de Revisio et les retours tactiles à votre appareil.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Default Semester */}
          <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Semestre d'étude prioritaire
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Période sélectionnée par défaut dans votre espace de révision.
              </p>
            </div>
            <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 self-start sm:self-center">
              {(["Semestre 1", "Semestre 2", "Tous"] as const).map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => handleUpdatePreference("defaultSemestre", sem)}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer whitespace-nowrap ${
                    preferences.defaultSemestre === sem
                      ? "bg-white dark:bg-slate-900 text-blue-900 dark:text-blue-300 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Haptic Feedback Switch (Web Vibration API) */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Retours haptiques sur mobile (Vibration)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isVibrationSupported
                  ? "Émet une légère impulsion tactile lors de l'activation des boutons et interrupteurs."
                  : "Activé (les vibrations physiques s'exécutent sur les smartphones compatibles)."}
              </p>
            </div>

            <div className="self-start sm:self-center shrink-0">
              <TactileSwitch
                checked={preferences.hapticFeedbackEnabled}
                onChange={() =>
                  handleUpdatePreference(
                    "hapticFeedbackEnabled",
                    !preferences.hapticFeedbackEnabled
                  )
                }
                ariaLabel="Activer ou désactiver les retours haptiques"
                labelOn="Haptique actif"
                labelOff="Désactivé"
                iconOn={<Vibrate className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                iconOff={<Vibrate className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
          </div>

          {/* Browser notifications */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Alertes de nouvelles épreuves publiées</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {browserNotifPermission === "granted"
                  ? "Les notifications du navigateur sont autorisées sur cet appareil."
                  : browserNotifPermission === "denied"
                  ? "Les notifications sont bloquées dans les paramètres de votre navigateur."
                  : "Recevez une notification discrète lorsqu'un nouveau sujet ou corrigé est publié."}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
              {browserNotifPermission === "default" && (
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="min-h-[44px] px-3.5 py-2 rounded-2xl bg-blue-50 dark:bg-blue-500/15 hover:bg-blue-100 dark:hover:bg-blue-500/25 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-xs font-semibold transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer"
                >
                  Autoriser sur l'appareil
                </button>
              )}

              <TactileSwitch
                checked={preferences.notificationsEnabled}
                onChange={() =>
                  handleUpdatePreference(
                    "notificationsEnabled",
                    !preferences.notificationsEnabled
                  )
                }
                ariaLabel="Activer ou désactiver les alertes de nouvelles épreuves"
                labelOn="Alertes actives"
                labelOff="Désactivées"
                iconOn={<Bell className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                iconOff={<BellOff className="w-3.5 h-3.5 text-slate-400" />}
              />
            </div>
          </div>

          {/* PDF Viewer preference */}
          <div className="py-4 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Lecteur PDF intégré rapide
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Prévisualiser les sujets directement dans l'application avant téléchargement.
              </p>
            </div>

            <div className="self-start sm:self-center shrink-0">
              <TactileSwitch
                checked={preferences.autoPreviewPdf}
                onChange={() =>
                  handleUpdatePreference("autoPreviewPdf", !preferences.autoPreviewPdf)
                }
                ariaLabel="Activer ou désactiver l'aperçu PDF intégré"
                labelOn="Aperçu intégré"
                labelOff="Direct"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      {/* Password Change Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Mot de passe & Authentification
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Mettez à jour votre mot de passe pour protéger l'accès à votre compte étudiant.
          </p>
        </div>

        {!user ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            Connectez-vous à votre compte pour gérer votre mot de passe et vos appareils autorisés.
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            {passwordErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Mot de passe actuel
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={currentMotDePasse}
                  onChange={(e) => setCurrentMotDePasse(e.target.value)}
                  placeholder="Saisissez votre mot de passe actuel"
                  className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-11 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("toggle");
                    setShowCurrentPassword(!showCurrentPassword);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-transform cursor-pointer"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    placeholder="8 caractères minimum"
                    className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("toggle");
                      setShowNewPassword(!showNewPassword);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-90 transition-transform cursor-pointer"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Confirmer le nouveau mot de passe
                </label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmNouveauMotDePasse}
                  onChange={(e) => setConfirmNouveauMotDePasse(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {nouveauMotDePasse.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div
                  className={`flex items-center gap-1.5 ${
                    hasMinLength
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>8+ caractères</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasLetter
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Lettres (A-z)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasDigit
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Chiffres (0-9)</span>
                </div>
                <div
                  className={`flex items-center gap-1.5 ${
                    hasSpecial
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>Symbole (bonus)</span>
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword || !nouveauMotDePasse}
                className={primaryButtonClass}
              >
                {isUpdatingPassword ? (
                  <>
                    <LoadingSpinner className="text-white" />
                    <span>Mise à jour...</span>
                  </>
                ) : (
                  <span>Mettre à jour le mot de passe</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Active Devices & Persistent Sessions Card */}
      {user && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Appareils connectés & Sessions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chaque appareil conserve sa session indépendante jusqu'à déconnexion explicite.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  loadDeviceSessions();
                }}
                disabled={isLoadingSessions}
                className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 flex items-center justify-center transition-all duration-150 select-none touch-manipulation cursor-pointer"
                title="Actualiser les sessions"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingSessions ? "animate-spin" : ""}`}
                />
              </button>

              {deviceSessions.filter((s) => !s.isCurrentDevice).length > 0 && (
                <button
                  type="button"
                  onClick={handleLogoutOtherDevices}
                  disabled={isRevokingAllOther}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 font-semibold text-xs transition-all duration-150 select-none touch-manipulation active:scale-95 active:ring-4 active:ring-rose-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isRevokingAllOther
                    ? "Déconnexion..."
                    : "Déconnecter les autres appareils"}
                </button>
              )}
            </div>
          </div>

          {sessionsNotice && (
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{sessionsNotice}</span>
            </div>
          )}

          {isLoadingSessions && deviceSessions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Chargement des appareils connectés...
            </div>
          ) : deviceSessions.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Laptop className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Session persistante active sur cet appareil.</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                Appareil actuel
              </span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deviceSessions.map((sess) => {
                const lastSeen = new Date(sess.lastActiveAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isMobileDevice = /Android|iPhone|iPad|Mobile/i.test(
                  sess.deviceName || ""
                );
                const DeviceIcon = isMobileDevice ? Smartphone : Laptop;

                return (
                  <div
                    key={sess.sessionId}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          sess.isCurrentDevice
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        <DeviceIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {sess.deviceName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap tabular-nums">
                          {sess.isCurrentDevice && (
                            <>
                              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                Cet appareil
                              </span>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>
                            {sess.persistent ? "Session persistante" : "Session standard"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>Activité : {lastSeen}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleRevokeSession(sess.sessionId, sess.isCurrentDevice)
                      }
                      disabled={revokingSessionId === sess.sessionId}
                      className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer disabled:opacity-50 self-end sm:self-center ${
                        sess.isCurrentDevice
                          ? "bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300"
                          : "border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 active:ring-2 active:ring-rose-500/20"
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>
                        {revokingSessionId === sess.sessionId
                          ? "Révocation..."
                          : sess.isCurrentDevice
                          ? "Se déconnecter"
                          : "Révoquer"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDataSection = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Sauvegarde & Données locales
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Exportez ou restaurez vos objectifs du Planning et gérez les données stockées sur cet appareil.
          </p>
        </div>

        {dataActionNotice && (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-900 dark:text-blue-200 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{dataActionNotice}</span>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* Export JSON */}
          <div className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Exporter mes données de révision (JSON)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Télécharge une copie de vos {plannerStats.total} objectif(s) de planning, vos {favoritesCount} favori(s) et vos préférences.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportPersonalData}
              className="self-start sm:self-center min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition-all duration-150 select-none touch-manipulation active:scale-95 active:ring-4 active:ring-blue-500/20 cursor-pointer shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter (JSON)</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Restaurer une sauvegarde
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Importez un fichier JSON Revisio précédemment sauvegardé pour récupérer votre planning.
              </p>
            </div>
            <div className="self-start sm:self-center shrink-0">
              <input
                ref={fileImportInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportPersonalData}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  fileImportInputRef.current?.click();
                }}
                className={secondaryButtonClass}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importer un fichier</span>
              </button>
            </div>
          </div>

          {/* Clean completed tasks */}
          <div className="py-4 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                Nettoyer les objectifs terminés
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {plannerStats.completed} objectif(s) marqué(s) comme terminé(s) sur {plannerStats.total} dans votre planning.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearCompletedTasks}
              disabled={plannerStats.completed === 0}
              className="self-start sm:self-center min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-300 text-xs font-semibold flex items-center gap-2 transition-all duration-150 select-none touch-manipulation active:scale-95 active:ring-4 active:ring-rose-500/20 cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Archiver les terminés</span>
            </button>
          </div>
        </div>
      </div>

      {/* Admin Feedback Archive Download */}
      {isAdminOrSuper && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Outil d'administration
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Archive des retours & messages étudiants
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Téléchargez l'historique complet au format JSON des messages envoyés via le support.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadFeedback}
              disabled={isDownloadingFeedback}
              className="self-start sm:self-center min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 transition-all duration-150 select-none touch-manipulation active:scale-95 active:ring-4 active:ring-emerald-500/25 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>
                {isDownloadingFeedback
                  ? "Téléchargement..."
                  : "Exporter les retours (JSON)"}
              </span>
            </button>
          </div>
          {feedbackMsg && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {feedbackMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const renderSupportSection = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-6">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Contacter l'équipe & Support académique
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Une épreuve manquante, une coquille dans un sujet ou une suggestion pour Revisio ? Écrivez-nous directement.
          </p>
        </div>

        {/* Quick Subject Suggestions */}
        <div className="space-y-2">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400">
            Sujets fréquents (cliquez pour pré-remplir) :
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Demande d'un ancien sujet de CC",
                cat: "Demande d'épreuve",
                subj: "Demande d'épreuve manquante en ING1",
              },
              {
                label: "Signaler une erreur sur un PDF",
                cat: "Signalement d'erreur",
                subj: "Signalement d'erreur sur une épreuve publiée",
              },
              {
                label: "Suggestion d'amélioration",
                cat: "Suggestion",
                subj: "Suggestion pour la plateforme Revisio",
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setContactCategorie(preset.cat);
                  setContactSujet(preset.subj);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-all duration-150 select-none touch-manipulation active:scale-95 active:bg-blue-50 dark:active:bg-blue-500/20 cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {contactSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-xs font-medium flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{contactSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic("light");
                setContactSuccessMsg(null);
              }}
              className="text-xs font-semibold underline active:opacity-75 cursor-pointer shrink-0"
            >
              Nouveau message
            </button>
          </div>
        )}

        {contactErrorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{contactErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleContactSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Votre nom complet
              </label>
              <input
                type="text"
                required
                value={contactNom}
                onChange={(e) => setContactNom(e.target.value)}
                placeholder="Prénom et Nom"
                className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                E-mail de réponse
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Catégorie
              </label>
              <select
                value={contactCategorie}
                onChange={(e) => {
                  triggerHaptic("light");
                  setContactCategorie(e.target.value);
                }}
                className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              >
                <option value="Demande d'épreuve">Demande d'épreuve spécifique</option>
                <option value="Signalement d'erreur">Signalement d'erreur sur un sujet</option>
                <option value="Problème technique">Problème technique / Connexion</option>
                <option value="Suggestion">Suggestion & Recommandation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Objet du message
              </label>
              <input
                type="text"
                required
                value={contactSujet}
                onChange={(e) => setContactSujet(e.target.value)}
                placeholder="Ex: CC d'Analyse 1 (2025-2026)"
                className="w-full min-h-[44px] bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Détails de votre demande
            </label>
            <textarea
              required
              rows={4}
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Précisez la matière, le semestre ou votre question..."
              className="w-full bg-slate-50/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSendingContact}
              className={`w-full sm:w-auto ${primaryButtonClass}`}
            >
              {isSendingContact ? (
                <>
                  <LoadingSpinner className="text-white" />
                  <span>Envoi en cours...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer le message</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderSectionById = (id: SettingsSectionId) => {
    switch (id) {
      case "profile":
        return renderProfileSection();
      case "appearance":
        return renderAppearanceSection();
      case "security":
        return renderSecuritySection();
      case "data":
        return renderDataSection();
      case "support":
        return renderSupportSection();
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* =====================================================================
          1. MOBILE EXPERIENCE (< lg): Native-Style Settings Hub + Sub-Screens
         ===================================================================== */}
      <div className="lg:hidden">
        {mobileSection === null ? (
          /* MOBILE HUB VIEW */
          <div className="space-y-5">
            {/* Compact Mobile Title */}
            <div className="px-1 space-y-1">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Paramètres & Préférences
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gérez votre compte, votre confort d'affichage et vos appareils.
              </p>
            </div>

            {/* Mobile User Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleSelectSection("profile")}
                    className="group w-full p-1 -m-1 rounded-xl flex items-center justify-between gap-3 text-left transition-all duration-150 select-none touch-manipulation active:scale-[0.98] active:bg-slate-100/70 dark:active:bg-slate-800/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center text-base font-bold shrink-0">
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.prenom} {user.nom}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </div>
                        <div className="text-[11px] font-medium text-blue-700 dark:text-blue-400 mt-0.5">
                          Modifier mes informations personnelles
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 group-active:translate-x-1 transition-transform" />
                  </button>

                  {/* 3-stat quick bar on mobile */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onNavigateToFavorites?.();
                      }}
                      className="py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 transition-all duration-150 select-none touch-manipulation active:scale-95 active:bg-slate-200/70 dark:active:bg-slate-700 cursor-pointer"
                    >
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {favoritesCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Favoris
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onNavigateToPlanning?.();
                      }}
                      className="py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 transition-all duration-150 select-none touch-manipulation active:scale-95 active:bg-slate-200/70 dark:active:bg-slate-700 cursor-pointer"
                    >
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {plannerStats.total}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Objectifs
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic("light");
                        onNavigateToContributions?.();
                      }}
                      className="py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 transition-all duration-150 select-none touch-manipulation active:scale-95 active:bg-slate-200/70 dark:active:bg-slate-700 cursor-pointer"
                    >
                      <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                        {contributionsCount}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Dépôts
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Mode Visiteur
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Connectez-vous pour synchroniser votre profil.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic("medium");
                      (onNavigateToLogin || onNavigateToRegister)();
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-900 text-white text-xs font-semibold shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer"
                  >
                    Connexion
                  </button>
                </div>
              )}
            </div>

            {/* Instant 1-Tap Theme Switcher Strip on Mobile Hub */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Apparence rapide
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {currentTheme === "dark"
                    ? "Sombre"
                    : currentTheme === "light"
                    ? "Clair"
                    : "Automatique"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                {(
                  [
                    { id: "light", label: "Clair", icon: Sun },
                    { id: "dark", label: "Sombre", icon: Moon },
                    { id: "system", label: "Auto", icon: Laptop },
                  ] as const
                ).map((t) => {
                  const Icon = t.icon;
                  const active = currentTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeSelect(t.id)}
                      className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-150 ease-out select-none touch-manipulation active:scale-[0.94] cursor-pointer ${
                        active
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200/70 dark:ring-slate-700"
                          : "text-slate-600 dark:text-slate-400 active:bg-white/50 dark:active:bg-slate-700/50"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grouped Mobile Navigation Rows */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {sectionsMeta.map((sec) => {
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec.id)}
                    className="group w-full min-h-[62px] px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100 dark:active:bg-slate-800 active:scale-[0.985] transition-all duration-150 ease-out select-none touch-manipulation cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-active:bg-blue-600 group-active:text-white flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {sec.title}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {sec.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {sec.summaryValue && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 max-w-[90px] truncate">
                          {sec.summaryValue}
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-active:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mobile Sign Out Button */}
            {user && onLogout && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("warning");
                  onLogout();
                }}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition-all duration-150 ease-out select-none touch-manipulation active:scale-[0.96] active:bg-rose-50 dark:active:bg-rose-500/15 active:ring-4 active:ring-rose-500/20 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter de cet appareil</span>
              </button>
            )}
          </div>
        ) : (
          /* MOBILE DRILL-DOWN SUB-VIEW */
          <div className="space-y-4">
            {/* Sub-view Top Navigation Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic("light");
                  setMobileSection(null);
                }}
                className="min-h-[42px] px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 select-none touch-manipulation active:scale-95 active:bg-slate-200 dark:active:bg-slate-700 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Paramètres</span>
              </button>

              <div className="text-xs font-bold text-slate-900 dark:text-white truncate px-2">
                {currentSectionMeta.title}
              </div>

              <div className="w-8 shrink-0" />
            </div>

            {/* Compact Horizontal Pill Switcher for quick jumping between sub-views on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {sectionsMeta.map((sec) => {
                const Icon = sec.icon;
                const active = mobileSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic("light");
                      setMobileSection(sec.id);
                    }}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all duration-150 select-none touch-manipulation active:scale-95 cursor-pointer ${
                      active
                        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-2xs"
                        : "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{sec.shortTitle}</span>
                  </button>
                );
              })}
            </div>

            {renderSectionById(mobileSection)}
          </div>
        )}
      </div>

      {/* =====================================================================
          2. DESKTOP EXPERIENCE (lg+): Soft 2-Column Workspace Layout
         ===================================================================== */}
      <div className="hidden lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        {/* Left Navigation Column (4 cols) */}
        <aside className="lg:col-span-4 xl:col-span-4 space-y-5 sticky top-24">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                Espace Personnel · ING1
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                Paramètres & Préférences
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Personnalisez votre environnement de révision et gérez la sécurité de votre compte.
              </p>
            </div>

            {/* Vertical Section Menu */}
            <nav aria-label="Menu des paramètres" className="space-y-1.5">
              {sectionsMeta.map((sec) => {
                const Icon = sec.icon;
                const active = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => handleSelectSection(sec.id)}
                    className={`group w-full p-3 rounded-2xl text-left flex items-center justify-between gap-3 transition-all duration-150 select-none active:scale-[0.98] cursor-pointer ${
                      active
                        ? "bg-slate-900 dark:bg-blue-600 text-white shadow-xs"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-bold truncate ${
                            active ? "text-white" : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {sec.title}
                        </div>
                        <div
                          className={`text-[11px] truncate ${
                            active
                              ? "text-slate-300 dark:text-blue-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {sec.subtitle}
                        </div>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform ${
                        active ? "text-white" : "text-slate-400"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>

            {user && onLogout && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic("warning");
                    onLogout();
                  }}
                  className="w-full min-h-[42px] px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 active:scale-[0.97] flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Se déconnecter de cet appareil</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Right Content Workspace (8 cols) */}
        <div className="lg:col-span-8 xl:col-span-8">
          {renderSectionById(activeSection)}
        </div>
      </div>
    </div>
  );
};
