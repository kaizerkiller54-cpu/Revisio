import React, { useState, useEffect } from "react";
import {
  loginApi,
  forgotPasswordApi,
  verifyResetCodeApi,
  resetPasswordApi,
} from "../lib/api";
import { User } from "../types";
import {
  LogIn,
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Check,
  X,
  ShieldCheck,
  Calendar,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { AppLogo } from "../components/AppLogo";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { motion } from "motion/react";

import heroEtudiants from "../assets/images/hero_etudiants.webp";
import heroCampus from "../assets/images/hero_campus.webp";
import heroTp from "../assets/images/hero_tp.webp";

interface LoginViewProps {
  onLoginSuccess: (user: User, token: string) => void;
  onNavigateToRegister: () => void;
  redirectReason?: string | null;
}

const carouselSlides = [
  {
    image: heroEtudiants,
    kicker: "Promotion 2026 • Niveau 1 (ING1)",
    title: "Votre Pass Réussite pour Dompter la Première Année",
    subtitle:
      "Bienvenue à l'Institut Saint Jean ! Pour votre rentrée, bénéficiez d'un accès direct et exclusif aux annales d'examens et contrôles continus conçus pour vous propulser vers l'excellence.",
  },
  {
    image: heroCampus,
    kicker: "Institut Universitaire Saint Jean",
    title: "Préparez vos Évaluations avec Méthode et Rigueur",
    subtitle:
      "Consultez les archives validées par l'administration académique, suivez le calendrier des CC et organisez vos révisions personnelles.",
  },
  {
    image: heroTp,
    kicker: "Entraide & Excellence Académique",
    title: "Consultez en Ligne ou Téléchargez vos Sujets en PDF",
    subtitle:
      "Prévisualisez chaque épreuve directement dans votre navigateur et téléchargez vos PDF pour réviser facilement en ligne et hors ligne.",
  },
];

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  redirectReason,
}) => {
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("+237");
  const [resetMethod, setResetMethod] = useState<"email" | "sms">("email");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Étapes d'authentification : "login" -> "verify-code" -> "new-password"
  const [authStep, setAuthStep] = useState<
    "login" | "verify-code" | "new-password"
  >("login");
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [verifiedResetToken, setVerifiedResetToken] = useState<string | null>(
    null
  );
  const [verifiedAccountLabel, setVerifiedAccountLabel] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Critères de sécurité du mot de passe
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(newPassword);
  const isNewPasswordValid =
    hasMinLength && hasLetter && hasDigit && hasSpecial;
  const passwordsMismatch =
    confirmNewPassword !== "" && newPassword !== confirmNewPassword;

  // Carrousel automatique avec transition fluide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMsg("Veuillez saisir votre adresse e-mail académique.");
      triggerShake();
      return;
    }
    if (!motDePasse) {
      setErrorMsg("Veuillez saisir votre mot de passe.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await loginApi(trimmedEmail, motDePasse);
      if (!res || !res.user || !res.token) {
        throw new Error(
          res?.message ||
            "Données de connexion incomplètes. Veuillez réessayer."
        );
      }
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          "Identifiants incorrects. Veuillez vérifier votre e-mail et votre mot de passe."
      );
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const sendResetCode = async (methodOverride?: "email" | "sms") => {
    const activeMethod = methodOverride ?? resetMethod;
    if (activeMethod === "email") {
      if (!email.trim()) {
        setErrorMsg(
          "Veuillez saisir votre adresse e-mail pour recevoir votre code de vérification."
        );
        triggerShake();
        return;
      }
    } else {
      const cleanDigits = telephone.replace(/\D/g, "");
      if (cleanDigits.length < 9) {
        setErrorMsg(
          "Veuillez saisir un numéro de téléphone valide (ex : +2376XXXXXXXX)."
        );
        triggerShake();
        return;
      }
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload =
        activeMethod === "email"
          ? { email: email.trim() }
          : { telephone: telephone.trim() };
      const res = await forgotPasswordApi(payload);
      setCodeSent(true);
      setSuccessMsg(res.message);
    } catch (err: any) {
      setErrorMsg(
        err.message || "Impossible d'envoyer le code de vérification."
      );
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordClick = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetCode("");
    setVerifiedResetToken(null);
    setCodeSent(false);
    setAuthStep("verify-code");
    if (resetMethod === "email" && email.trim()) {
      await sendResetCode("email");
    }
  };

  const handleSwitchResetMethod = (method: "email" | "sms") => {
    setResetMethod(method);
    setErrorMsg(null);
    setSuccessMsg(null);
    setResetCode("");
    setCodeSent(false);
  };

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetMethod === "email" && !email.trim()) {
      setErrorMsg("Veuillez saisir votre adresse e-mail.");
      triggerShake();
      return;
    }
    if (resetMethod === "sms" && telephone.replace(/\D/g, "").length < 9) {
      setErrorMsg("Veuillez saisir votre numéro de téléphone.");
      triggerShake();
      return;
    }
    if (!resetCode.trim() || resetCode.trim().length < 6) {
      setErrorMsg(
        resetMethod === "sms"
          ? "Veuillez saisir le code de vérification reçu par SMS."
          : "Veuillez saisir le code de vérification reçu par e-mail."
      );
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload =
        resetMethod === "email"
          ? { email: email.trim(), code: resetCode.trim() }
          : { telephone: telephone.trim(), code: resetCode.trim() };
      const res = await verifyResetCodeApi(payload);
      setVerifiedResetToken(res.resetToken);
      if (res.email) {
        setEmail(res.email);
      }
      setVerifiedAccountLabel(
        resetMethod === "sms"
          ? `${res.telephone || telephone.trim()} (${res.email || ""})`
          : res.email || email.trim()
      );
      setSuccessMsg(res.message);
      setAuthStep("new-password");
    } catch (err: any) {
      setErrorMsg(err.message || "Code de vérification invalide ou expiré.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNewPasswordValid) {
      setErrorMsg(
        "Le nouveau mot de passe doit respecter tous les critères de sécurité."
      );
      triggerShake();
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg("Les deux mots de passe ne correspondent pas.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const tokenOrCode = verifiedResetToken || resetCode.trim();
      const payload =
        resetMethod === "sms" && !email.trim()
          ? {
              telephone: telephone.trim(),
              code: tokenOrCode,
              nouveauMotDePasse: newPassword,
            }
          : {
              email: email.trim() || undefined,
              telephone: resetMethod === "sms" ? telephone.trim() : undefined,
              code: tokenOrCode,
              nouveauMotDePasse: newPassword,
            };
      const res = await resetPasswordApi(payload);
      setSuccessMsg(res.message);
      setMotDePasse("");
      setResetCode("");
      setVerifiedResetToken(null);
      setNewPassword("");
      setConfirmNewPassword("");
      setCodeSent(false);
      setAuthStep("login");
    } catch (err: any) {
      setErrorMsg(
        err.message || "Impossible de réinitialiser le mot de passe."
      );
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const activeSlide = carouselSlides[currentSlide];

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center py-6 sm:py-10 px-3 sm:px-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        {/* CARTE PRINCIPALE DOUCE & RESPECTANT LE THÈME DE L'APPLICATION */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-slate-950 overflow-hidden flex flex-col lg:grid lg:grid-cols-12">
          {/* ========================================================== */}
          {/* 1. PANNEAU CARROUSEL D'IMAGES (DESKTOP lg:col-span-7)       */}
          {/* ========================================================== */}
          <div className="hidden lg:flex lg:col-span-7 relative min-h-[580px] flex-col justify-between p-8 xl:p-10 text-white overflow-hidden bg-slate-950">
            {/* Défilement continu des images d'arrière-plan */}
            <div className="absolute inset-0 z-0">
              {carouselSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center scale-105 transition-transform duration-[7000ms] ease-out"
                  />
                </div>
              ))}
              {/* Voile protecteur doux pour haute lisibilité */}
              <div className="absolute inset-0 bg-slate-950/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/40" />
            </div>

            {/* En-tête institutionnel */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Institut Saint Jean • ING1</span>
              </div>
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                Promotion 2026
              </span>
            </div>

            {/* Contenu de présentation académique */}
            <div className="relative z-10 my-auto py-6 space-y-5">
              <div className="space-y-2.5 max-w-lg">
                <p className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                  {activeSlide.kicker}
                </p>
                <h1 className="text-2xl xl:text-3xl font-extrabold tracking-tight text-white leading-tight drop-shadow-sm">
                  {activeSlide.title}
                </h1>
                <p className="text-sm text-slate-200/95 leading-relaxed">
                  {activeSlide.subtitle}
                </p>
              </div>

              {/* 3 Cartes de fonctionnalités clés */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/15 backdrop-blur-md flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">
                      Annales Spéciales
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      CC & examens classés
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/15 backdrop-blur-md flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">
                      Téléchargement PDF
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      Révisez hors ligne
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/15 backdrop-blur-md flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">
                      Planning & CC
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      Échéances officielles
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contrôles du carrousel */}
            <div className="relative z-10 flex items-center justify-between gap-4 pt-4 border-t border-white/15">
              <span className="text-xs text-slate-300">
                Plateforme dédiée à la réussite de la promotion 2026
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide(
                      (prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length
                    )
                  }
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Diapositive précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)
                  }
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                  title="Diapositive suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 ml-1">
                  {carouselSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlide(idx)}
                      aria-label={`Diapositive ${idx + 1}`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === currentSlide
                          ? "w-4 bg-amber-300"
                          : "w-1.5 bg-white/35 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 2. BANNIÈRE CARROUSEL MOBILE (< lg) : DÉFILEMENT CONTINU    */}
          {/* ========================================================== */}
          <div className="lg:hidden relative h-52 sm:h-60 overflow-hidden text-white flex flex-col justify-between p-4 sm:p-6 bg-slate-950">
            {/* Défilement en arrière plan */}
            <div className="absolute inset-0 z-0">
              {carouselSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              ))}
              <div className="absolute inset-0 bg-slate-950/50" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/30" />
            </div>

            {/* En-tête mobile */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-sky-200 bg-sky-500/25 border border-sky-400/30 px-2.5 py-0.5 rounded-full backdrop-blur-md">
                Promotion 2026 • ING1
              </span>
              <div className="flex items-center gap-1">
                {carouselSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Diapositive ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentSlide ? "w-4 bg-amber-300" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Titre et fonctionnalités en badges doux */}
            <div className="relative z-10 space-y-1.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
                {activeSlide.title}
              </h2>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                  <BookOpen className="w-3 h-3 text-sky-300" />
                  Annales classées
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                  <Download className="w-3 h-3 text-sky-300" />
                  Téléchargement PDF
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* 3. COLONNE FORMULAIRE (RESPECTE LE THÈME DE REGISTERVIEW)  */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 p-6 sm:p-8 xl:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
            <motion.div
              animate={isShaking ? { x: [0, -10, 10, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full space-y-5"
            >
              {/* En-tête épuré et centré (identique à RegisterView) */}
              <div className="flex flex-col items-center justify-center text-center space-y-2.5 pb-1">
                <AppLogo
                  size="md"
                  variant="light"
                  showSubtitle={false}
                  animated={false}
                />
                <div className="space-y-1">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {authStep === "login"
                      ? "Connexion Étudiant"
                      : authStep === "verify-code"
                      ? "Mot de passe oublié"
                      : "Nouveau mot de passe"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    {authStep === "login"
                      ? "Accédez aux épreuves et sujets du Niveau 1"
                      : authStep === "verify-code"
                      ? "Recevez un code de vérification par e-mail ou SMS"
                      : "Sécurisez l'accès à votre compte académique"}
                  </p>
                </div>
              </div>

              {/* Message de redirection / notification */}
              {redirectReason && authStep === "login" && (
                <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 rounded-xl text-xs font-medium flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{redirectReason}</span>
                </div>
              )}

              {/* Message de succès */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{successMsg}</span>
                </div>
              )}

              {/* Message d'erreur */}
              {errorMsg && (
                <div className="p-3.5 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ==================================================== */}
              {/* ÉTAPE 1 : FORMULAIRE DE CONNEXION PRINCIPAL          */}
              {/* ==================================================== */}
              {authStep === "login" && (
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  {/* Champ E-mail académique */}
                  <div>
                    <label
                      htmlFor="login-email"
                      className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300 mb-1.5"
                    >
                      Adresse E-mail académique
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="votre.email@isj.cm"
                        className="w-full h-11 pl-10 pr-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  {/* Champ Mot de passe */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block font-semibold text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                      >
                        Mot de passe
                      </label>
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        className="text-xs font-bold text-blue-900 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={motDePasse}
                        onChange={(e) => {
                          setMotDePasse(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="••••••••"
                        className="w-full h-11 pl-10 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        title={
                          showPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Bouton de connexion bleu officiel ISJ */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group cursor-pointer mt-2 text-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="text-white" />
                        <span>Connexion en cours...</span>
                      </span>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        <span>Se connecter</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ==================================================== */}
              {/* ÉTAPE 2 : RÉINITIALISATION & ENVOI DU CODE          */}
              {/* ==================================================== */}
              {authStep === "verify-code" && (
                <form onSubmit={handleVerifyCodeSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                      Canal de réception du code
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                      <button
                        type="button"
                        onClick={() => handleSwitchResetMethod("email")}
                        className={`h-9 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          resetMethod === "email"
                            ? "bg-blue-900 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Par E-mail</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchResetMethod("sms")}
                        className={`h-9 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          resetMethod === "sms"
                            ? "bg-blue-900 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Par SMS</span>
                      </button>
                    </div>
                  </div>

                  {resetMethod === "email" ? (
                    <div>
                      <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                        Adresse E-mail académique
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                          </div>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errorMsg) setErrorMsg(null);
                            }}
                            placeholder="votre.email@isj.cm"
                            className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isLoading || !email.trim()}
                          onClick={() => sendResetCode("email")}
                          className="h-11 px-3.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shrink-0 text-xs cursor-pointer shadow-xs"
                        >
                          {codeSent ? "Renvoyer" : "Envoyer code"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                        Numéro de téléphone
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Phone className="w-4 h-4" />
                          </div>
                          <input
                            type="tel"
                            required
                            value={telephone}
                            onChange={(e) => {
                              setTelephone(e.target.value);
                              if (errorMsg) setErrorMsg(null);
                            }}
                            placeholder="+2376XXXXXXXX"
                            className="w-full h-11 pl-10 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={
                            isLoading || telephone.replace(/\D/g, "").length < 9
                          }
                          onClick={() => sendResetCode("sms")}
                          className="h-11 px-3.5 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shrink-0 text-xs cursor-pointer shadow-xs"
                        >
                          {codeSent ? "Renvoyer SMS" : "Envoyer SMS"}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Format Cameroun : composez vos 9 chiffres après +237
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                      Code de vérification (6 chiffres)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-700 dark:text-blue-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        maxLength={10}
                        value={resetCode}
                        onChange={(e) => {
                          setResetCode(e.target.value.replace(/\D/g, ""));
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Ex : 123456"
                        className="w-full h-11 pl-10 pr-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white tracking-widest font-mono text-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || resetCode.trim().length < 6}
                    className="w-full h-11 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="text-white" />
                        <span>Vérification...</span>
                      </span>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Vérifier le code & continuer</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthStep("login");
                    }}
                    className="w-full h-8 text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Retour à la connexion</span>
                  </button>
                </form>
              )}

              {/* ==================================================== */}
              {/* ÉTAPE 3 : CRÉATION DU NOUVEAU MOT DE PASSE          */}
              {/* ==================================================== */}
              {authStep === "new-password" && (
                <form onSubmit={handleSaveNewPassword} className="space-y-4 text-sm">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2 text-xs text-blue-950 dark:text-blue-200">
                    <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
                    <span className="truncate">
                      Compte vérifié :{" "}
                      <strong className="font-bold">
                        {verifiedAccountLabel || email || telephone}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="8 caractères min, chiffres, lettres, symbole"
                        className="w-full h-11 pl-10 pr-11 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Exigences de sécurité identiques à RegisterView */}
                    <div className="mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                      <p className="font-bold text-[11px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Exigences de sécurité :
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasMinLength ? "text-emerald-600 font-semibold" : "text-slate-400"
                          }`}
                        >
                          {hasMinLength ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>8+ caractères</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasLetter ? "text-emerald-600 font-semibold" : "text-slate-400"
                          }`}
                        >
                          {hasLetter ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Contient lettres</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasDigit ? "text-emerald-600 font-semibold" : "text-slate-400"
                          }`}
                        >
                          {hasDigit ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Contient chiffres</span>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 ${
                            hasSpecial ? "text-emerald-600 font-semibold" : "text-slate-400"
                          }`}
                        >
                          {hasSpecial ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <X className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Caractère spécial</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Retapez le nouveau mot de passe"
                      className={`w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-sm transition-all ${
                        passwordsMismatch
                          ? "border-red-400"
                          : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600"
                      }`}
                    />
                    {passwordsMismatch && (
                      <p className="text-[11px] font-semibold text-red-600 mt-1">
                        Les deux mots de passe ne correspondent pas.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isLoading || !isNewPasswordValid || passwordsMismatch
                    }
                    className="w-full h-11 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <LoadingSpinner className="text-white" />
                        <span>Enregistrement...</span>
                      </span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Enregistrer le mot de passe</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthStep("login");
                    }}
                    className="w-full h-8 text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Annuler</span>
                  </button>
                </form>
              )}

              {/* Pied du formulaire : Inscription (100% aligné avec RegisterView) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Vous n'avez pas encore de compte étudiant ?
                </p>
                <button
                  type="button"
                  onClick={onNavigateToRegister}
                  className="w-full h-11 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-xl transition-all text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4 text-blue-900 dark:text-blue-400" />
                  <span>Créer mon compte étudiant</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
