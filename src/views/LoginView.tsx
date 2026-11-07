import React, { useState, useEffect } from "react";
import { loginApi, forgotPasswordApi, verifyResetCodeApi, resetPasswordApi } from "../lib/api";
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
    title: "Bienvenue à l'Institut Saint Jean",
    subtitle: "Votre portail privilégié d'accès à la banque d'épreuves de Première Année.",
    badge: "Accès Privilégié • Nouveaux Étudiants",
  },
  {
    image: heroCampus,
    title: "Excellence Académique",
    subtitle: "Abordez les contrôles continus et examens de semestre avec assurance.",
    badge: "Préparation Optimale L1",
  },
  {
    image: heroTp,
    title: "Réussite & Avenir",
    subtitle: "Construisez votre parcours universitaire avec confiance et détermination.",
    badge: "Vie Étudiante ISJ",
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

  // Étapes : "login" -> "verify-code" -> "new-password" (écran dédié après validation du code)
  const [authStep, setAuthStep] = useState<"login" | "verify-code" | "new-password">("login");
  const [codeSent, setCodeSent] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [verifiedResetToken, setVerifiedResetToken] = useState<string | null>(null);
  const [verifiedAccountLabel, setVerifiedAccountLabel] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Critères de sécurité du nouveau mot de passe
  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(newPassword);
  const isNewPasswordValid = hasMinLength && hasLetter && hasDigit && hasSpecial;
  const passwordsMismatch = confirmNewPassword !== "" && newPassword !== confirmNewPassword;

  // Auto advance background carousel with smooth 6s rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
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
        throw new Error(res?.message || "Données de connexion incomplètes. Veuillez réessayer.");
      }
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err?.message || "Identifiants incorrects. Veuillez vérifier votre e-mail et mot de passe.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  const sendResetCode = async (methodOverride?: "email" | "sms") => {
    const activeMethod = methodOverride ?? resetMethod;
    if (activeMethod === "email") {
      if (!email.trim()) {
        setErrorMsg("Veuillez saisir votre adresse e-mail pour recevoir votre code de vérification.");
        triggerShake();
        return;
      }
    } else {
      const cleanDigits = telephone.replace(/\D/g, "");
      if (cleanDigits.length < 9) {
        setErrorMsg("Veuillez saisir un numéro de téléphone valide (ex: +2376XXXXXXXX).");
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
      setErrorMsg(err.message || "Impossible d'envoyer le code de vérification.");
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
      setErrorMsg("Le nouveau mot de passe doit respecter tous les critères de sécurité.");
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
          ? { telephone: telephone.trim(), code: tokenOrCode, nouveauMotDePasse: newPassword }
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
      setErrorMsg(err.message || "Impossible de réinitialiser le mot de passe.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-100px)] flex items-center justify-center p-4 sm:p-6 lg:p-10 overflow-hidden w-full py-8 sm:py-12">
      {/* HIGH-IMPACT SCROLLING BACKGROUND CAROUSEL WITH LUXURY BLUE/SLATE OVERLAY */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-slate-950">
        {carouselSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transform transition-transform duration-10000 ease-linear scale-105"
            />
          </div>
        ))}

        {/* Balanced Light Overlay for Crisp Image Visibility & Text Readability */}
        <div className="absolute inset-0 bg-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/38 via-slate-950/22 to-slate-950/38" />
      </div>

      {/* CAROUSEL CONTROLS & SLIDE INDICATORS */}
      <div className="hidden lg:flex absolute bottom-8 left-12 z-20 items-center space-x-3 text-blue-100">
        <button
          onClick={() =>
            setCurrentSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
          }
          className="p-2.5 rounded-full bg-slate-900/70 hover:bg-blue-600 border border-blue-500/30 text-blue-200 transition-all backdrop-blur-md shadow-lg"
          title="Image précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex space-x-2">
          {carouselSlides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-8 bg-amber-400 shadow-sm shadow-amber-400/50"
                  : "w-2.5 bg-blue-900/80 hover:bg-blue-600"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % carouselSlides.length)}
          className="p-2.5 rounded-full bg-slate-900/70 hover:bg-blue-600 border border-blue-500/30 text-blue-200 transition-all backdrop-blur-md shadow-lg"
          title="Image suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* LEFT COLUMN: EXPERT MARKETING COPY & WELCOME FOR 1ST YEAR STUDENTS */}
        <div className="lg:col-span-7 text-white space-y-6 lg:space-y-8 px-2 sm:px-4">
          {/* Inspirational Headline */}
          <div className="space-y-3.5">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight text-white drop-shadow-sm">
              Votre Pass Réussite pour Dompter la{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-200 to-blue-200">
                Première Année
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed max-w-xl">
              Bienvenue à l'Institut Saint Jean ! Pour votre rentrée, bénéficiez d'un accès direct
              et exclusif aux annales d'examens et contrôles continus conçus pour vous propulser vers l'excellence.
            </p>
          </div>

          {/* Key Value Prop Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-700/40 backdrop-blur-md hover:border-blue-500/60 transition-all">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-blue-600/30 text-amber-300 border border-blue-500/30">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Annales Spéciales 1ère Année</h3>
                  <p className="text-[11px] text-blue-200/80">Sujets de CC & examens classés</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-950/60 border border-blue-700/40 backdrop-blur-md hover:border-blue-500/60 transition-all">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 rounded-xl bg-blue-600/30 text-amber-300 border border-blue-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Téléchargement Direct PDF</h3>
                  <p className="text-[11px] text-blue-200/80">Révisez facilement hors ligne</p>
                </div>
              </div>
            </div>
          </div>

          {/* Privilege Guarantee */}
          <div className="pt-2 flex items-center text-xs text-blue-200/90 border-t border-blue-800/40">
            <span>Plateforme dédiée à l'accompagnement et à la réussite de la promotion 2026</span>
          </div>
        </div>

        {/* RIGHT COLUMN: HIGH-CONTRAST SECURE LOGIN CARD */}
        <div className="lg:col-span-5 w-full">
          <motion.div
            animate={isShaking ? { x: [0, -16, 16, -12, 12, -6, 6, 0] } : {}}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className={`bg-slate-900/85 sm:bg-slate-900/95 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950 space-y-6 relative overflow-hidden transition-colors duration-300 ${
              errorMsg
                ? "border-2 border-red-500/90 shadow-red-950/40"
                : "border border-slate-700/60 sm:border-slate-700"
            }`}
          >
            {/* Form Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="flex justify-center mb-1">
                <AppLogo size="md" variant="dark" showSubtitle={false} animated={false} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
                <span>
                  {authStep === "login"
                    ? "Espace Connexion Étudiant"
                    : authStep === "verify-code"
                      ? "Réinitialisation du mot de passe"
                      : "Nouveau mot de passe"}
                </span>
              </h2>
              <p className="text-xs text-blue-200/80">
                {authStep === "login"
                  ? "Connectez-vous pour débloquer votre accès aux annales d'épreuves"
                  : authStep === "verify-code"
                    ? "Choisissez votre mode de réception (E-mail ou SMS) et saisissez le code"
                    : "Votre code est validé. Choisissez et confirmez votre nouveau mot de passe"}
              </p>
            </div>

            {/* Notice banner if redirected */}
            {redirectReason && authStep === "login" && (
              <div className="p-3.5 bg-blue-950/90 border border-blue-700/60 text-blue-100 rounded-2xl text-xs font-medium flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{redirectReason}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3.5 bg-emerald-950/90 border border-emerald-500/80 text-emerald-100 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-md animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-red-950/90 border border-red-500 text-red-100 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-md shadow-red-950/50 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="flex-1 leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: STANDARD LOGIN FORM */}
            {authStep === "login" && (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    Adresse e-mail académique
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                        errorMsg ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
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
                      placeholder="nom.prenom@saintjeaningenieur.org"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-950/90 rounded-2xl text-white placeholder-blue-400/50 focus:outline-none text-xs font-medium transition-all ${
                        errorMsg
                          ? "border-2 border-red-500 ring-2 ring-red-500/40 text-red-100 bg-red-950/20 placeholder-red-300/40 focus:border-red-400 focus:ring-red-400"
                          : "border border-blue-900/80 focus:ring-2 focus:ring-amber-400"
                      }`}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div
                      className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${
                        errorMsg ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
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
                      className={`w-full pl-10 pr-10 py-3 bg-slate-950/90 rounded-2xl text-white placeholder-blue-400/50 focus:outline-none text-xs font-medium transition-all ${
                        errorMsg
                          ? "border-2 border-red-500 ring-2 ring-red-500/40 text-red-100 bg-red-950/20 placeholder-red-300/40 focus:border-red-400 focus:ring-red-400"
                          : "border border-blue-900/80 focus:ring-2 focus:ring-amber-400"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-400 hover:text-blue-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 group active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner className="text-white" />
                      <span>Connexion en cours...</span>
                    </span>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Se Connecter & Accéder</span>
                      <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: CHOOSE METHOD (EMAIL OR SMS) & VERIFY CODE */}
            {authStep === "verify-code" && (
              <form onSubmit={handleVerifyCodeSubmit} className="space-y-4 text-xs">
                {/* Choix de la méthode de réinitialisation : Par E-mail ou Par SMS */}
                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    Méthode de réinitialisation
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/90 border border-blue-900/80 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => handleSwitchResetMethod("email")}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                        resetMethod === "email"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-blue-300 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Par E-mail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchResetMethod("sms")}
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition-all ${
                        resetMethod === "sms"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-blue-300 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Par SMS (Téléphone)</span>
                    </button>
                  </div>
                </div>

                {/* Champ E-mail ou Téléphone selon la méthode choisie */}
                {resetMethod === "email" ? (
                  <div className="space-y-1.5">
                    <label className="block font-bold text-blue-100">
                      Adresse e-mail de votre compte
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
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
                          placeholder="nom.prenom@saintjeaningenieur.org"
                          className="w-full pl-10 pr-3 py-3 bg-slate-950/90 border border-blue-900/80 rounded-2xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-medium transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isLoading || !email.trim()}
                        onClick={() => sendResetCode("email")}
                        className="px-3.5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl transition-all shrink-0 text-[11px]"
                      >
                        {codeSent ? "Renvoyer le code" : "Envoyer le code"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block font-bold text-blue-100">
                      Numéro de téléphone de votre compte
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
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
                          className="w-full pl-10 pr-3 py-3 bg-slate-950/90 border border-blue-900/80 rounded-2xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-medium transition-all"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isLoading || telephone.replace(/\D/g, "").length < 9}
                        onClick={() => sendResetCode("sms")}
                        className="px-3.5 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold rounded-2xl transition-all shrink-0 text-[11px]"
                      >
                        {codeSent ? "Renvoyer SMS" : "Envoyer par SMS"}
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-300/75">
                      Format Cameroun : +237 suivi des 9 chiffres (ex: +237650897459)
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    {resetMethod === "sms"
                      ? "Code de vérification reçu par SMS"
                      : "Code de vérification reçu par e-mail"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
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
                      placeholder={
                        resetMethod === "sms"
                          ? "Saisissez le code reçu par SMS (ex: 123456)"
                          : "Saisissez le code reçu par e-mail (ex: 123456)"
                      }
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/90 border border-blue-900/80 rounded-2xl text-white tracking-widest font-mono text-sm placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || resetCode.trim().length < 6}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 group active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner className="text-white" />
                      <span>Vérification du code...</span>
                    </span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-amber-300" />
                      <span>Vérifier le code & Continuer</span>
                      <ArrowRight className="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform" />
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
                  className="w-full py-2 text-blue-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Retour à la connexion</span>
                </button>
              </form>
            )}

            {/* STEP 3: DEDICATED NEW PASSWORD SCREEN (AFTER CODE IS VERIFIED) */}
            {authStep === "new-password" && (
              <form onSubmit={handleSaveNewPassword} className="space-y-4 text-xs animate-fadeIn">
                <div className="p-3 rounded-2xl bg-blue-950/80 border border-blue-700/50 flex items-center space-x-2.5 text-blue-100">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">
                    Compte vérifié :{" "}
                    <strong className="text-white">
                      {verifiedAccountLabel || email || telephone}
                    </strong>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
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
                      placeholder="8 caractères min, lettres, chiffres, symbole"
                      className="w-full pl-10 pr-10 py-3 bg-slate-950/90 border border-blue-900/80 rounded-2xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-medium transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-blue-400 hover:text-blue-200"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Checklist des critères de mot de passe */}
                  <div className="mt-2 p-2.5 bg-slate-950/70 rounded-xl border border-blue-900/60 grid grid-cols-2 gap-1.5 text-[11px]">
                    <div className={`flex items-center space-x-1 ${hasMinLength ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {hasMinLength ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>8+ caractères</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${hasLetter ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {hasLetter ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>Lettres</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${hasDigit ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {hasDigit ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>Chiffres</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${hasSpecial ? "text-emerald-400 font-semibold" : "text-slate-400"}`}>
                      {hasSpecial ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                      <span>Symbole (!@#...)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-blue-100">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Retapez le nouveau mot de passe"
                    className={`w-full px-4 py-3 bg-slate-950/90 border rounded-2xl text-white placeholder-blue-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400 text-xs font-medium transition-all ${
                      passwordsMismatch ? "border-red-500" : "border-blue-900/80"
                    }`}
                  />
                  {passwordsMismatch && (
                    <p className="text-[11px] font-semibold text-red-400">
                      Les deux mots de passe ne correspondent pas.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isNewPasswordValid || passwordsMismatch}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition-all shadow-lg shadow-blue-950 flex items-center justify-center space-x-2 group active:scale-[0.99]"
                >
                  {isLoading ? (
                    <span className="flex items-center space-x-2">
                      <LoadingSpinner className="text-white" />
                      <span>Enregistrement en cours...</span>
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-amber-300" />
                      <span>Enregistrer le nouveau mot de passe</span>
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
                  className="w-full py-2 text-blue-200 hover:text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Annuler et retourner à la connexion</span>
                </button>
              </form>
            )}

            {/* Account Registration Link */}
            <div className="pt-3 text-center text-xs text-blue-200/80 border-t border-blue-900/50 space-y-2.5">
              <p className="text-blue-200/90 font-medium">
                Vous n'avez pas encore votre compte étudiant ?
              </p>
              <button
                onClick={onNavigateToRegister}
                className="w-full py-3 px-4 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-amber-300 font-bold rounded-2xl transition-all text-xs flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Créer mon compte étudiant</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

