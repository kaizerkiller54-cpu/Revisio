import React, { useState } from "react";
import { User } from "../types";
import { updateUserProfileApi, sendContactMessageApi, downloadFeedbackApi } from "../lib/api";
import { Settings,
  User as UserIcon,
  Lock,
  Mail,
  Palette,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Shield,
  LifeBuoy,
  Download
} from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";

interface SettingsViewProps {
  user: User | null;
  currentTheme: "light" | "dark" | "system";
  onChangeTheme: (theme: "light" | "dark" | "system") => void;
  onUpdateUser: (updatedUser: User) => void;
  onNavigateToRegister: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  currentTheme,
  onChangeTheme,
  onUpdateUser,
  onNavigateToRegister,
}) => {
  // Profile state
  const [nom, setNom] = useState(user?.nom || "");
  const [prenom, setPrenom] = useState(user?.prenom || "");
  const [email, setEmail] = useState(user?.email || "");
  const [telephone, setTelephone] = useState(user?.telephone || "");
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const telephoneIsValid = /^\+237[0-9]{9}$/.test(telephone.trim());

  // Contact state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactNom, setContactNom] = useState(user ? `${user.prenom} ${user.nom}` : "");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactSujet, setContactSujet] = useState("");
  const [contactCategorie, setContactCategorie] = useState("Demande d'épreuve");
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactSuccessMsg, setContactSuccessMsg] = useState<string | null>(null);
  const [contactErrorMsg, setContactErrorMsg] = useState<string | null>(null);

  const isAdminOrSuper = user?.role === "Administrateur" || user?.role === "SuperAdministrateur";
  const [isDownloadingFeedback, setIsDownloadingFeedback] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleDownloadFeedback = async () => {
    setIsDownloadingFeedback(true);
    setFeedbackMsg(null);
    try {
      const result = await downloadFeedbackApi();
      if (!result) {
        setFeedbackMsg("Aucun retour utilisateur pour le moment.");
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
      setFeedbackMsg("Fichier téléchargé avec succès.");
    } catch {
      setFeedbackMsg("Erreur lors du téléchargement.");
    } finally {
      setIsDownloadingFeedback(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onNavigateToRegister();
      return;
    }
    if (telephone.trim() && !telephoneIsValid) {
      setProfileErrorMsg("Format invalide : +237XXXXXXXXX (9 chiffres après +237).");
      return;
    }

    setIsUpdatingProfile(true);
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    try {
      const res = await updateUserProfileApi({
        nom,
        prenom,
        email,
        telephone: telephone.trim() || null,
        nouveauMotDePasse: nouveauMotDePasse.trim() ? nouveauMotDePasse : undefined,
      });
      onUpdateUser(res.user);
      setProfileSuccessMsg(res.message || "Profil mis à jour avec succès !");
      setNouveauMotDePasse("");
    } catch (err: any) {
      setProfileErrorMsg(err.message || "Erreur lors de la mise à jour des informations.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingContact(true);
    setContactSuccessMsg(null);
    setContactErrorMsg(null);

    try {
      const res = await sendContactMessageApi({
        nom: contactNom,
        email: contactEmail,
        sujet: contactSujet,
        categorie: contactCategorie,
        message: contactMessage,
      });
      setContactSuccessMsg(res.message);
      setContactSujet("");
      setContactMessage("");
    } catch (err: any) {
      setContactErrorMsg(err.message || "Erreur lors de l'envoi du message.");
    } finally {
      setIsSendingContact(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
            <Settings className="w-4 h-4 text-indigo-700" />
            <span>Paramètres Système & Préférences</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Préférences de Compte</h1>
          <p className="text-xs text-slate-500">
            Gérez vos identifiants de connexion, l'apparence de la plateforme et contactez l'équipe support.
          </p>
        </div>

        <button
          onClick={() => setContactModalOpen(true)}
          className="bg-indigo-900 hover:bg-indigo-950 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center space-x-2 shadow-sm transition-all shrink-0"
        >
          <MessageSquare className="w-4 h-4 text-indigo-200" />
          <span>Nous Contacter</span>
        </button>
      </div>

      {isAdminOrSuper && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl p-4">
          <div className="space-y-0.5">
            <p className="text-xs font-extrabold text-emerald-900">
              Retours des utilisateurs
            </p>
            <p className="text-[10px] text-emerald-800 dark:text-emerald-300">
              Téléchargez l'historique JSON de tous les messages envoyés via le formulaire de contact.
            </p>
          </div>
          <button
            onClick={handleDownloadFeedback}
            disabled={isDownloadingFeedback}
            className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center space-x-2 shadow-sm transition-all shrink-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>{isDownloadingFeedback ? "Téléchargement..." : "Télécharger les retours (JSON)"}</span>
          </button>
          {feedbackMsg && (
            <p className="text-[10px] font-bold text-emerald-900 dark:text-emerald-200 sm:absolute sm:right-4 sm:top-4">
              {feedbackMsg}
            </p>
          )}
        </div>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Profile & Account Settings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-900 dark:text-indigo-300 font-bold shrink-0">
                <UserIcon className="w-5 h-5 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Identifiants de Connexion</h2>
                <p className="text-xs text-slate-500">
                  Modifiez vos noms, votre adresse e-mail et votre mot de passe d'accès.
                </p>
              </div>
            </div>

            {!user ? (
              <div className="p-5 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/40 rounded-2xl space-y-3 text-xs text-amber-900 dark:text-amber-100">
                <div className="flex items-center space-x-2 font-bold text-amber-950 dark:text-amber-100">
                  <Shield className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Vous n'êtes actuellement pas connecté</span>
                </div>
                <p className="leading-relaxed text-amber-800 dark:text-amber-200">
                  Afin de pouvoir modifier vos données personnelles et enregistrer vos préférences de profil, vous devez posséder un compte sur la plateforme.
                </p>
                <button
                  onClick={onNavigateToRegister}
                  className="bg-amber-900 hover:bg-amber-950 text-white font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
                >
                  Créer un compte maintenant
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                {profileSuccessMsg && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl text-emerald-900 dark:text-emerald-200 flex items-start space-x-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{profileSuccessMsg}</span>
                  </div>
                )}

                {profileErrorMsg && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-2xl text-rose-900 dark:text-rose-200 flex items-start space-x-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{profileErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Nom de famille</label>
                    <input
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Prénom</label>
                    <input
                      type="text"
                      required
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Adresse E-mail Académique</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center space-x-1">
                    <span>Numéro de téléphone</span>
                  </label>
                  <input
                    type="tel"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    placeholder="+237 ----------- (9 chiffres)"
                    inputMode="tel"
                    className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                      telephone.trim() && !telephoneIsValid ? "border-red-400 ring-1 ring-red-300" : "border-slate-200 dark:border-slate-600"
                    }`}
                  />
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    Format camerounais : +237 suivi de 9 chiffres (ex: +237655123456).
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1 flex items-center space-x-1">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Nouveau Mot de Passe (Laissez vide pour conserver l'actuel)</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Saisissez un nouveau mot de passe"
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="bg-indigo-900 hover:bg-indigo-950 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <LoadingSpinner className="text-white" />
                        <span>Enregistrement en cours...</span>
                      </>
                    ) : (
                      <span>Mettre à jour mes informations</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Right 1 Col: Theme & Quick Contact */}
        <div className="space-y-6">
          {/* Theme Switcher Card */}
          <div className="bg-white border border-slate-200 dark:border-slate-600 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700/60">
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-900 dark:text-indigo-300 font-bold shrink-0">
                <Palette className="w-4 h-4 text-indigo-700" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Apparence & Thème</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Choisissez votre style d'affichage</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <button
                type="button"
                onClick={() => onChangeTheme("light")}
                className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between font-bold ${
                  currentTheme === "light"
                    ? "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-2xs"
                    : "bg-slate-50 border-slate-200 dark:border-slate-600 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Mode Clair (Standard)</span>
                </div>
                {currentTheme === "light" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => onChangeTheme("dark")}
                className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between font-bold ${
                  currentTheme === "dark"
                    ? "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-2xs"
                    : "bg-slate-50 border-slate-200 dark:border-slate-600 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Moon className="w-4 h-4 text-indigo-700" />
                  <span>Mode Sombre (Confort Visuel)</span>
                </div>
                {currentTheme === "dark" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
              </button>

              <button
                type="button"
                onClick={() => onChangeTheme("system")}
                className={`w-full p-3 rounded-2xl border transition-all flex items-center justify-between font-bold ${
                  currentTheme === "system"
                    ? "bg-indigo-50 dark:bg-indigo-500/20 border-indigo-600 text-indigo-950 dark:text-indigo-100 shadow-2xs"
                    : "bg-slate-50 border-slate-200 dark:border-slate-600 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-slate-600" />
                  <span>Automatique (Système)</span>
                </div>
                {currentTheme === "system" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Contact Support Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-200 shrink-0">
                <LifeBuoy className="w-5 h-5 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Besoin d'aide ou Suggestion ?</h3>
                <p className="text-[11px] text-indigo-200">Institut Saint Jean Direction</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Une épreuve manquante, une erreur sur un sujet ou une question ? Contactez directement l'administration académique.
            </p>

            <button
              onClick={() => setContactModalOpen(true)}
              className="w-full bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-indigo-900" />
              <span>Ouvrir le Formulaire de Contact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-600 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/60 dark:border-slate-700/60">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-900 dark:text-indigo-300">
                  <Send className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Nous Contacter - ISJ Support</h3>
                  <p className="text-xs text-slate-500">Transmettez votre message à la Direction</p>
                </div>
              </div>

              <button
                onClick={() => setContactModalOpen(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {contactSuccessMsg ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{contactSuccessMsg}</p>
                <button
                  onClick={() => {
                    setContactSuccessMsg(null);
                    setContactModalOpen(false);
                  }}
                  className="bg-indigo-900 text-white font-bold text-xs px-5 py-2.5 rounded-xl"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                {contactErrorMsg && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 rounded-xl text-rose-900 dark:text-rose-200">
                    {contactErrorMsg}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Votre Nom & Prénom</label>
                    <input
                      type="text"
                      required
                      value={contactNom}
                      onChange={(e) => setContactNom(e.target.value)}
                      placeholder="Nom complet"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">E-mail de réponse</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Catégorie</label>
                    <select
                      value={contactCategorie}
                      onChange={(e) => setContactCategorie(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="Demande d'épreuve">Demande d'épreuve spécifique</option>
                      <option value="Signalement d'erreur">Signalement d'erreur de corrigé</option>
                      <option value="Problème technique">Problème technique / Connexion</option>
                      <option value="Suggestion">Suggestion & Recommandation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Sujet principal</label>
                    <input
                      type="text"
                      required
                      value={contactSujet}
                      onChange={(e) => setContactSujet(e.target.value)}
                      placeholder="Sujet de votre message"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1">Votre Message</label>
                  <textarea
                    required
                    rows={4}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Détaillez votre message ou votre requête..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:border-slate-600 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSendingContact}
                    className="px-5 py-2 bg-indigo-900 hover:bg-indigo-950 text-white rounded-xl font-bold flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSendingContact ? (
                      <>
                        <LoadingSpinner className="text-white" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Envoyer le message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
