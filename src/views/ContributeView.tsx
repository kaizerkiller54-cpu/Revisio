import React, { useState } from "react";
import { User, ContributionModel, Semestre, EpreuveType } from "../types";
import { submitContributionApi } from "../lib/api";
import { Upload, FileText, CheckCircle2, AlertCircle, Clock, ShieldAlert, FileUp, Calendar, BookOpen, Layers } from "lucide-react";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { Reveal } from "../components/motion";

interface ContributeViewProps {
  user: User | null;
  onNavigateToLogin: () => void;
  userContributions: ContributionModel[];
  onContributionSuccess: () => void;
}

const MATIERES_S1 = [
  "Communication",
  "Algèbre linéaire",
  "Analyse 1",
  "Électrocinétique",
  "Anglais",
  "Mesures Physiques",
  "Mécanique",
  "Mécatronique",
];

const MATIERES_S2 = [
  "Réflexion humaine",
  "Géométrie",
  "Analyse 2",
  "Électrostatique/magnétostatique",
  "Anglais",
  "Chimie",
  "Algorithmique",
  "IDFOT",
];

const ANNEES_OPTIONS = [
  "2025-2026",
  "2024-2025",
  "2023-2024",
  "2022-2023",
  "2021-2022",
  "2020-2021",
  "2019-2020",
];

export const ContributeView: React.FC<ContributeViewProps> = ({
  user,
  onNavigateToLogin,
  userContributions,
  onContributionSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [anneeAcademique, setAnneeAcademique] = useState<string>("2025-2026");
  const [matiere, setMatiere] = useState<string>("Analyse 1");
  const [semestre, setSemestre] = useState<Semestre>("Semestre 1");
  const [typeEpreuve, setTypeEpreuve] = useState<EpreuveType>("SN");
  const [titre, setTitre] = useState<string>("");
  const [commentaire, setCommentaire] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleMatiereChange = (selectedMat: string) => {
    setMatiere(selectedMat);
    if (MATIERES_S1.includes(selectedMat)) {
      setSemestre("Semestre 1");
    } else if (MATIERES_S2.includes(selectedMat)) {
      setSemestre("Semestre 2");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        setErrorMsg("Seuls les fichiers au format PDF (.pdf) sont acceptés.");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setErrorMsg("Le fichier est trop volumineux (Taille maximale : 15 Mo).");
        return;
      }

      setSelectedFile(file);

      // Auto pre-fill title if empty
      if (!titre) {
        setTitre(`Épreuve de ${matiere} - ${typeEpreuve} ${anneeAcademique}`);
      }

      // Convert to Base64 Data URL for server storage
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !fileBase64) {
      setErrorMsg("Veuillez sélectionner un fichier PDF de l'épreuve à transmettre.");
      return;
    }

    if (!anneeAcademique.trim()) {
      setErrorMsg("Veuillez spécifier l'année académique de l'épreuve.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await submitContributionApi({
        utilisateurId: user?.id,
        utilisateurNom: user ? `${user.prenom} ${user.nom}` : "Étudiant Anonyme",
        utilisateurEmail: user?.email || "etudiant@isj.cm",
        anneeAcademique,
        matiere,
        semestre,
        typeEpreuve,
        titre: titre.trim() || `Épreuve de ${matiere} - ${typeEpreuve} ${anneeAcademique}`,
        commentaire: commentaire.trim(),
        fichierUrl: fileBase64,
        fichierNom: selectedFile.name,
      });

      setSuccessMsg("Votre épreuve a été transmise avec succès ! Elle a été enregistrée avec le statut 'En attente' et sera examinée par l'administrateur.");
      setSelectedFile(null);
      setFileBase64("");
      setTitre("");
      setCommentaire("");
      onContributionSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de l'envoi de l'épreuve.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <Reveal>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 space-y-3 shadow-sm">
        <div className="flex items-center space-x-3 text-blue-900 dark:text-blue-300">
          <Upload className="w-8 h-8" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Soumettre une Ancienne Épreuve
          </h1>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          Vous possédez un sujet d'examen de l'Institut Universitaire Saint Jean ? Partagez-le avec la communauté ! Renseignez l'année académique, la matière et joignez le sujet en PDF.
        </p>
      </div>
      </Reveal>

      {/* Upload Card & Form */}
      <Reveal delay={0.08}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 shadow-sm">
        {!user && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/40 rounded-2xl flex items-start space-x-3 text-amber-900 dark:text-amber-100 text-xs">
            <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-950">Session Anonyme</span>
              <p>
                Vous êtes actuellement non connecté. Vous pouvez envoyer votre document, mais pour suivre l'état de vos soumissions, nous vous conseillons de{" "}
                <button
                  onClick={onNavigateToLogin}
                  className="underline font-bold text-blue-900 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200"
                >
                  vous connecter à votre compte
                </button>.
              </p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-200 rounded-2xl text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-semibold flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Metadata Section: Year, Subject, Semester, Type */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>Informations sur l'Épreuve</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Année Académique (Spécifier l'année) */}
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  Année Académique <span className="text-red-500">*</span>
                </label>
                <select
                  value={anneeAcademique}
                  onChange={(e) => setAnneeAcademique(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {ANNEES_OPTIONS.map((annee) => (
                    <option key={annee} value={annee}>
                      {annee}
                    </option>
                  ))}
                </select>
              </div>

              {/* Matière */}
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5 text-blue-700" />
                  <span>Matière</span> <span className="text-red-500">*</span>
                </label>
                <select
                  value={matiere}
                  onChange={(e) => handleMatiereChange(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <optgroup label="Semestre 1 (S1)">
                    {MATIERES_S1.map((m) => (
                      <option key={`s1-${m}`} value={m}>
                        {m} (S1)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Semestre 2 (S2)">
                    {MATIERES_S2.map((m) => (
                      <option key={`s2-${m}`} value={m}>
                        {m} (S2)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Type d'épreuve */}
              <div>
                <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1.5 flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5 text-blue-700" />
                  <span>Type d'Épreuve</span> <span className="text-red-500">*</span>
                </label>
                <select
                  value={typeEpreuve}
                  onChange={(e) => setTypeEpreuve(e.target.value as EpreuveType)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="CC">Contrôle Continu (CC)</option>
                  <option value="SN">Session Normale (SN)</option>
                  <option value="SR">Session Rattrapage (SR)</option>
                  <option value="TD">Travaux Dirigés (TD)</option>
                  <option value="TP">Travaux Pratiques (TP)</option>
                </select>
              </div>
            </div>

            {/* Titre proposé */}
            <div>
              <label className="block font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                Titre indicatif de l'épreuve
              </label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                placeholder={`Ex: Épreuve de ${matiere} - ${typeEpreuve} ${anneeAcademique}`}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Fichier PDF de l'épreuve <span className="text-red-500">*</span>
            </label>

            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-600 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-6 sm:p-10 text-center transition-all group">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="space-y-3 pointer-events-none">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-900 dark:text-blue-300 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <FileUp className="w-7 h-7" />
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="font-bold text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-center space-x-2 max-w-full">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="min-w-0 truncate">{selectedFile.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} Mo • PDF Valide
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 underline font-bold pt-1">
                      Cliquez pour remplacer le fichier
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Glissez-déposez votre fichier PDF ici, ou <span className="text-blue-700 underline font-bold">parcourez vos fichiers</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Format accepté : <strong>PDF uniquement</strong> (Taille max : 15 Mo)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Facultatif Commentaire */}
          <div>
            <label className="block text-sm font-bold text-slate-900 mb-2">
              Commentaire ou précisions (Facultatif)
            </label>
            <textarea
              rows={3}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Épreuve de Session Normale tenue en Janvier, sujet complet avec partie Exercice et Problème..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl p-3.5 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all"
            />
          </div>

          {/* Submit button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className={`w-full py-3.5 rounded-full text-white font-bold text-sm transition-all shadow-sm flex items-center justify-center space-x-2 ${
                isSubmitting
                  ? "bg-blue-800 cursor-wait"
                  : !selectedFile
                    ? "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-blue-900 hover:bg-blue-800 cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="text-white" />
                  <span>Envoi du fichier en cours...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Envoyer l'épreuve à la modération</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      </Reveal>

      {/* User Contributions History */}
      {userContributions.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-700" />
            <span>Historique de vos soumissions ({userContributions.length})</span>
          </h3>

          <div className="space-y-3">
            {userContributions.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i * 0.05, 0.3)}>
              <div
                className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-900 min-w-0 break-all">{c.fichierNom}</span>
                    {c.anneeAcademique && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-mono text-[10px] font-bold">
                        {c.anneeAcademique}
                      </span>
                    )}
                    {c.matiere && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold">
                        {c.matiere}
                      </span>
                    )}
                  </div>
                  {c.commentaire && (
                    <p className="text-slate-600 italic">"{c.commentaire}"</p>
                  )}
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Transmis le : {new Date(c.dateEnvoi).toLocaleDateString("fr-FR")} à {new Date(c.dateEnvoi).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                <div>
                  {c.statut === "En attente" && (
                    <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-bold flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>En attente de validation</span>
                    </span>
                  )}
                  {c.statut === "Publié" && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Publié</span>
                    </span>
                  )}
                  {c.statut === "Refusé" && (
                    <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-500/30 font-bold">
                      Refusé
                    </span>
                  )}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
