import React, { useState, useEffect } from "react";
import { loginApi } from "../lib/api";
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
  ArrowRight,
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
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

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
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await loginApi(email, motDePasse);
      onLoginSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err.message || "Identifiants incorrects. Veuillez vérifier votre e-mail et mot de passe.");
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
            className={`bg-slate-900/95 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-950 space-y-6 relative overflow-hidden transition-colors duration-300 ${
              errorMsg
                ? "border-2 border-red-500/90 shadow-red-950/40"
                : "border border-slate-700"
            }`}
          >
            {/* Form Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="flex justify-center mb-1">
                <AppLogo size="md" variant="dark" showSubtitle={false} animated={false} />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center space-x-2">
                <span>Espace Connexion Étudiant</span>
              </h2>
              <p className="text-xs text-blue-200/80">
                Connectez-vous pour débloquer votre accès aux annales d'épreuves
              </p>
            </div>

            {/* Notice banner if redirected */}
            {redirectReason && (
              <div className="p-3.5 bg-blue-950/90 border border-blue-700/60 text-blue-100 rounded-2xl text-xs font-medium flex items-center space-x-2.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{redirectReason}</span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-red-950/90 border border-red-500 text-red-100 rounded-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-md shadow-red-950/50 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* LOGIN FORM */}
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="nom.prenom@isj.cm"
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

            {/* Account Registration Link */}
            <div className="pt-3 text-center text-xs text-blue-200/80 border-t border-blue-900/50 space-y-2.5">
              <p className="text-blue-200/90 font-medium">
                Vous n'avez pas encore votre compte étudiant ?
              </p>
              <button
                onClick={onNavigateToRegister}
                className="w-full py-3 px-4 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-amber-300 font-bold rounded-2xl transition-all text-xs flex items-center justify-center space-x-2 shadow-sm"
              >
                <span>Créer mon compte étudiant (1ère Année)</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
