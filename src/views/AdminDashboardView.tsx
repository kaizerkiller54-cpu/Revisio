import React from "react";
import { DashboardStats } from "../types";
import { Users, FileText, CheckCircle2, Clock, ArrowRight, ShieldCheck, FileCheck } from "lucide-react";

interface AdminDashboardViewProps {
  stats: DashboardStats | null;
  onNavigateToModeration: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  onNavigateToModeration,
}) => {
  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Panneau Administration • Institut Universitaire Saint Jean</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Aperçu synthétique de l'activité globale et de l’état du fonds documentaire.
          </p>
        </div>

        <button
          onClick={onNavigateToModeration}
          className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-full shadow-sm transition-all flex items-center space-x-2 shrink-0"
        >
          <FileCheck className="w-4 h-4" />
          <span>Accéder à la Modération</span>
        </button>
      </div>

      {/* 4 Essential Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Total Utilisateurs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Utilisateurs
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats ? stats.totalUsers : 0}
          </div>
          <p className="text-xs text-slate-500">
            Comptes étudiants et administrateurs.
          </p>
        </div>

        {/* 2. Total Documents */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Documents
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {stats ? stats.totalDocuments : 0}
          </div>
          <p className="text-xs text-slate-500">
            Index complet des épreuves.
          </p>
        </div>

        {/* 3. Documents Publiés */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Documents Publiés
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700">
            {stats ? stats.documentsPublies : 0}
          </div>
          <p className="text-xs text-slate-500">
            Épreuves validées et téléchargeables.
          </p>
        </div>

        {/* 4. Documents en Attente */}
        <div className="bg-white border border-amber-200 rounded-2xl p-6 space-y-3 relative overflow-hidden shadow-sm bg-gradient-to-b from-white to-amber-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              En Attente
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-800">
            {stats ? stats.documentsEnAttente : 0}
          </div>
          <p className="text-xs text-amber-800/80 font-medium">
            Soumissions en cours de modération.
          </p>
        </div>
      </div>

      {/* Moderation Alert Card */}
      {stats && stats.documentsEnAttente > 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-slate-900 font-bold text-base">
                {stats.documentsEnAttente} nouvelle(s) épreuve(s) en attente de modération
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Des étudiants ont soumis des sujets d'examen. Prévisualisez les fichiers PDF et publiez-les avec leurs métadonnées.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToModeration}
            className="px-5 py-2.5 bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs rounded-full transition-colors shadow-sm flex items-center space-x-1.5 shrink-0"
          >
            <span>Traiter les demandes</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-2 shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-slate-900 font-bold text-sm">File de modération vide</h3>
          <p className="text-xs text-slate-500">Toutes les épreuves envoyées ont été traitées.</p>
        </div>
      )}
    </div>
  );
};
