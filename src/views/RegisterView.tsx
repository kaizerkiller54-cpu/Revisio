import React, { useState, useEffect } from "react";
import { registerApi } from "../lib/api";
import { User } from "../types";
import {
  UserPlus,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Mail,
  Lock,
  Phone,
  User as UserIcon,
  Eye,
  EyeOff,
  BookOpen,
  Download,
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogIn,
} from "lucide-react";
import { AppLogo } from "../components/AppLogo";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { motion } from "motion/react";

import heroEtudiants from "../assets/images/hero_etudiants.webp";
import heroCampus from "../assets/images/hero_campus.webp";
import heroTp from "../assets/images/hero_tp.webp";

interface RegisterViewProps {
  onRegisterSuccess: (user: User, token: string) => void;
  onNavigateToLogin: () => void;
  redirectReason?: string | null;
}

const carouselSlides = [
  {
    image: heroEtudiants,
    kicker: "Promotion 2026 • Niveau 1 (ING1)",
    title: "Rejoignez la Communauté d'Excellence Saint Jean",
    subtitle:
      "Créez votre compte étudiant en quelques secondes pour débloquer l'accès intégral aux annales d'examens, contrôles continus et corrigés officiels.",
  },
  {
    image: heroCampus,
    kicker: "Institut Universitaire Saint Jean",
    title: "Tous vos Outils de Révision au Même Endroit",
    subtitle:
      "Téléchargez directement vos épreuves en PDF, organisez vos favoris et suivez le calendrier des évaluations tout au long de votre première année.",
  },
  {
    image: heroTp,
    kicker: "Cycle Ingénieur • Promotion 2026",
    title: "Entraide, Rigueur & Réussite Académique",
    subtitle:
      "Bénéficiez d'une plateforme sécurisée, intuitive et optimisée pour tous vos appareils, du smartphone à l'ordinateur.",
  },
];

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
  redirectReason,
}) => {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmMotDePasse, setConfirmMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Critères de mot de passe interactifs
  const hasMinLength = motDePasse.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(motDePasse);
  const hasDigit = /[0-9]/.test(motDePasse);
  const hasSpecial = /[^a-zA-Z0-9\s]/.test(motDePasse);
  const isPasswordValid = hasMinLength && hasLetter && hasDigit && hasSpecial;

  // Indicatif +237 prédéfini : l'utilisateur ne saisit que ses 9 chiffres
  const telephone = phoneDigits ? `+237${phoneDigits}` : "";
  const telephoneIsValid = phoneDigits === "" || /^[0-9]{9}$/.test(phoneDigits);
  const passwordsMismatch =
    confirmMotDePasse !== "" && motDePasse !== confirmMotDePasse;

  // Carrousel automatique avec transition fluide
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telephoneIsValid) {
      setErrorMsg("Numéro incomplet : composez vos 9 chiffres après +237.");
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg(
        "Le mot de passe doit respecter tous les 4 critères de sécurité."
      );
      return;
    }
    if (passwordsMismatch) {
      setErrorMsg("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await registerApi(
        nom.trim().toUpperCase(),
        prenom.trim(),
        email.trim().toLowerCase(),
        motDePasse,
        "Etudiant",
        undefined,
        telephone.trim() || undefined
      );
      if (!res || !res.user || !res.token) {
        throw new Error(
          res?.message ||
            "Session d'inscription incomplète. Veuillez vous connecter."
        );
      }
      onRegisterSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err?.message || "Échec de l'inscription.");
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
          {/* 1. PANNEAU CARROUSEL D'IMAGES (DESKTOP lg:col-span-6 xl:7) */}
          {/* ========================================================== */}
          <div className="hidden lg:flex lg:col-span-6 xl:col-span-7 relative min-h-[620px] flex-col justify-between p-8 xl:p-10 text-white overflow-hidden bg-slate-950">
            {/* Défilement continu des images d'arrière-plan */}
            <div className="absolute inset-0 z-0">
              {carouselSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
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
                <span>Institut Universitaire Saint Jean</span>
              </div>
              <span className="text-xs font-semibold text-slate-200 tracking-wide">
                Cycle Ingénieur • ING1
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
                      Annales & CC
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      Archives classées
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/15 backdrop-blur-md flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/25 border border-blue-400/30 flex items-center justify-center text-blue-200 shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white tracking-tight truncate">
                      Accès PDF Direct
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
                      Planning Officiel
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      Calendrier des CC
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contrôles du carrousel */}
            <div className="relative z-10 flex items-center justify-between gap-4 pt-4 border-t border-white/15">
              <span className="text-xs text-slate-300">
                Plateforme officielle Revisio • Promotion 2026
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentSlide(
                      (prev) =>
                        (prev - 1 + carouselSlides.length) %
                        carouselSlides.length
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
                    setCurrentSlide(
                      (prev) => (prev + 1) % carouselSlides.length
                    )
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
          <div className="lg:hidden relative h-48 sm:h-56 overflow-hidden text-white flex flex-col justify-between p-4 sm:p-5 bg-slate-950">
            {/* Défilement en arrière plan */}
            <div className="absolute inset-0 z-0">
              {carouselSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    index === currentSlide
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
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
                Institut Saint Jean • ING1
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

            {/* Titre et badges doux */}
            <div className="relative z-10 space-y-1">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight leading-snug drop-shadow-sm">
                {activeSlide.title}
              </h2>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                  <BookOpen className="w-3 h-3 text-sky-300" />
                  Annales Niveau 1
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
          <div className="lg:col-span-6 xl:col-span-5 p-5 sm:p-7 xl:p-8 flex flex-col justify-center bg-white dark:bg-slate-900">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="w-full space-y-4"
            >
              {/* En-tête épuré et centré */}
              <div className="flex flex-col items-center justify-center text-center space-y-2 pb-0.5">
                <AppLogo
                  size="md"
                  variant="light"
                  showSubtitle={false}
                  animated={false}
                />
                <div className="space-y-0.5">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Créer votre compte
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Accédez aux épreuves et sujets du Niveau 1
                  </p>
                </div>
              </div>

              {/* Message de redirection / notification */}
              {redirectReason && (
                <div className="p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-900 dark:text-blue-200 rounded-xl text-xs font-medium flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="leading-snug">{redirectReason}</span>
                </div>
              )}

              {/* Message d'erreur */}
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Formulaire d'inscription */}
              <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
                {/* Ligne Nom & Prénom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                      Nom
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="TALLA"
                        className="w-full h-10 sm:h-11 pl-9 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                      Prénom
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Roland"
                        className="w-full h-10 sm:h-11 pl-9 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Champ Adresse E-mail académique */}
                <div>
                  <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    Adresse E-mail académique
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre.email@isj.cm"
                      className="w-full h-10 sm:h-11 pl-9 pr-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Champ Numéro de téléphone (+237) */}
                <div>
                  <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    Numéro de téléphone
                  </label>
                  <div
                    className={`flex items-stretch bg-slate-50 dark:bg-slate-800/80 border rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent h-10 sm:h-11 ${
                      !telephoneIsValid
                        ? "border-red-400 ring-1 ring-red-300"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span className="flex items-center px-3 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 select-none">
                      <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      +237
                    </span>
                    <input
                      type="tel"
                      value={phoneDigits}
                      onChange={(e) =>
                        setPhoneDigits(
                          e.target.value.replace(/\D/g, "").slice(0, 9)
                        )
                      }
                      placeholder="655123456"
                      inputMode="numeric"
                      maxLength={9}
                      className="w-full px-3 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-sm"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    Composez uniquement vos 9 chiffres (ex : 655123456).
                  </p>
                </div>

                {/* Champ Mot de passe */}
                <div>
                  <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder="8 caractères min, chiffres, lettres, symbole"
                      className="w-full h-10 sm:h-11 pl-9 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Checklist des critères de mot de passe */}
                  <div className="mt-2 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <span className="font-bold text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider">
                      Exigences de sécurité :
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      <div
                        className={`flex items-center gap-1.5 ${
                          hasMinLength
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-rose-500"
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
                          hasLetter
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-rose-500"
                        }`}
                      >
                        {hasLetter ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>Contient des lettres</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          hasDigit
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-rose-500"
                        }`}
                      >
                        {hasDigit ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>Contient des chiffres</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 ${
                          hasSpecial
                            ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                            : "text-rose-500"
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

                {/* Champ Confirmer le mot de passe */}
                <div>
                  <label className="block font-semibold text-xs text-slate-700 dark:text-slate-300 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmMotDePasse}
                      onChange={(e) => setConfirmMotDePasse(e.target.value)}
                      placeholder="Retapez votre mot de passe"
                      className={`w-full h-10 sm:h-11 pl-9 pr-10 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none text-sm transition-all ${
                        passwordsMismatch
                          ? "border-red-400 ring-1 ring-red-300"
                          : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-600"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 w-10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {passwordsMismatch && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      Les deux mots de passe ne correspondent pas.
                    </p>
                  )}
                </div>

                {/* Bouton de validation de l'inscription */}
                <button
                  type="submit"
                  disabled={isLoading || !isPasswordValid || passwordsMismatch}
                  className="w-full h-11 bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <LoadingSpinner className="text-white" />
                      <span>Création du compte...</span>
                    </span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Créer mon Compte</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Pied du formulaire : lien vers la connexion */}
              <div className="pt-3 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <p>Vous avez déjà un compte ?</p>
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="w-full h-10 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5 text-blue-900 dark:text-blue-400" />
                  <span>Se connecter</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
