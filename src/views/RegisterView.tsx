import React, { useState } from "react";
import { registerApi } from "../lib/api";
import { User } from "../types";
import { UserPlus, AlertCircle, ArrowLeft } from "lucide-react";
import { AppLogo } from "../components/AppLogo";
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
  const [motDePasse, setMotDePasse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await registerApi(
        nom,
        prenom,
        email,
        motDePasse,
        "Etudiant"
      );
      onRegisterSuccess(res.user, res.token);
    } catch (err: any) {
      setErrorMsg(err.message || "Échec de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 w-full overflow-hidden">
      <motion.div
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <AppLogo size="lg" variant="light" showSubtitle={false} />
          <h2 className="text-xl font-extrabold text-slate-900">Création de Compte ISJ</h2>
          <p className="text-xs text-slate-500">
            Créez votre compte d'accès aux épreuves et sujets du Niveau 1
          </p>
        </div>

        {redirectReason && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-950 rounded-2xl text-xs font-bold flex items-start space-x-2 animate-fadeIn shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{redirectReason}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-900 mb-1">Nom</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex: TALLA"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-900 mb-1">Prénom</label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                placeholder="Ex: Roland"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Adresse E-mail académique</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@isj.cm"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-900 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={6}
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="6 caractères minimum"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-sm rounded-full transition-all shadow-sm flex items-center justify-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isLoading ? "Création du compte..." : "Créer mon Compte"}</span>
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Vous possédez déjà un compte ?{" "}
          <button
            onClick={onNavigateToLogin}
            className="text-indigo-900 font-bold hover:underline"
          >
            Se connecter
          </button>
        </div>
      </motion.div>
    </div>
  );
};
