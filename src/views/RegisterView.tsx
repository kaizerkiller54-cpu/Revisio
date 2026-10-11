import React, { useState } from "react";
import { registerApi } from "../lib/api";
import { User } from "../types";
import { UserPlus, AlertCircle, ArrowLeft } from "lucide-react";
import { AppLogo } from "../components/AppLogo";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { motion } from "motion/react";

interface RegisterViewProps {
  onRegisterSuccess: (user: User, token: string) => void;
  onNavigateToLogin: () => void;
  redirectReason?: string | null;
}

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
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Indicatif +237 prédéfini : l'utilisateur ne saisit que ses 9 chiffres.
  const telephone = phoneDigits ? `+237${phoneDigits}` : "";
  const telephoneIsValid = phoneDigits === "" || /^[0-9]{9}$/.test(phoneDigits);
  const passwordsMismatch = confirmMotDePasse !== "" && motDePasse !== confirmMotDePasse;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telephoneIsValid) {
      setErrorMsg("Numéro incomplet : composez vos 9 chiffres après +237.");
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
        nom,
        prenom,
        email,
        motDePasse,
        "Etudiant",
        undefined,
        telephone.trim() || undefined
      );
      onRegisterSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err.message || "Échec de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center py-8 px-4 w-full bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/60 dark:shadow-slate-950 space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <AppLogo size="lg" variant="light" showSubtitle={false} animated={false} />
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Créer votre compte
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Accédez aux épreuves et sujets du Niveau 1
            </p>
          </div>
        </div>

        {redirectReason && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-950 dark:text-amber-100 rounded-2xl text-xs font-bold flex items-start space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{redirectReason}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nom</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="TALLA"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Prénom</label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Roland"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Adresse E-mail académique</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@isj.cm"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Numéro de téléphone</label>
            <div
              className={`flex items-stretch bg-slate-50 dark:bg-slate-800/60 border rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/40 focus-within:border-blue-500 ${
                !telephoneIsValid ? "border-red-400 ring-1 ring-red-300" : "border-slate-300 dark:border-slate-700"
              }`}
            >
              <span className="flex items-center px-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-300 dark:border-slate-700 select-none">
                +237
              </span>
              <input
                type="tel"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="655123456"
                inputMode="numeric"
                maxLength={9}
                className="w-full px-3.5 py-2.5 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              Composez uniquement vos 9 chiffres (ex : 655123456).
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              value={confirmMotDePasse}
              onChange={(e) => setConfirmMotDePasse(e.target.value)}
              placeholder="Retapez votre mot de passe"
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all ${
                passwordsMismatch ? "border-red-400 ring-1 ring-red-300" : "border-slate-300 dark:border-slate-700"
              }`}
            />
            {passwordsMismatch && (
              <p className="mt-1.5 text-xs font-semibold text-red-500">
                Les deux mots de passe ne correspondent pas.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center space-x-2 active:scale-[0.99] ${
              isLoading ? "opacity-80 cursor-wait" : ""
            }`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="text-white" />
                <span>Création du compte...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Créer mon Compte</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Vous avez déjà un compte ?{" "}
          <button
            onClick={onNavigateToLogin}
            className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
          >
            Se connecter
          </button>
        </div>
      </motion.div>
    </div>
  );
};
