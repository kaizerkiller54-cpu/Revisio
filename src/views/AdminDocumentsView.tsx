import React, { useState } from "react";
import { DocumentModel, ContributionModel, Semestre, EpreuveType } from "../types";
import {
  approveContributionApi,
  rejectContributionApi,
  deleteDocumentApi,
  updateDocumentApi
} from "../lib/api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  FileCheck,
  CheckCircle2,
  Eye,
  Trash2,
  Edit,
  Clock,
  FileText,
  Sparkles,
  Check,
  X
} from "lucide-react";

interface AdminDocumentsViewProps {
  contributions: ContributionModel[];
  documents: DocumentModel[];
  onRefreshData: () => void;
  onPreviewPdf: (doc: DocumentModel) => void;
}

export const AdminDocumentsView: React.FC<AdminDocumentsViewProps> = ({
  contributions,
  documents,
  onRefreshData,
  onPreviewPdf,
}) => {
  const [activeTab, setActiveTab] = useState<"pending" | "published">("pending");
  const [selectedContrib, setSelectedContrib] = useState<ContributionModel | null>(null);

  // Approval Form fields for admin
  const [titre, setTitre] = useState("");
  const [matiere, setMatiere] = useState("Analyse Mathématique I");
  const [semestre, setSemestre] = useState<Semestre>("Semestre 1");
  const [typeEpreuve, setTypeEpreuve] = useState<EpreuveType>("SN");
  const [anneeAcademique, setAnneeAcademique] = useState("2023-2024");
  const [isApproveLoading, setIsApproveLoading] = useState(false);

  // Edit Published Doc Modal State
  const [editingDoc, setEditingDoc] = useState<DocumentModel | null>(null);

  const pendingList = contributions.filter((c) => c.statut === "En attente");

  const matieresList = [
    // Semestre 1
    "Communication",
    "Algèbre linéaire",
    "Analyse 1",
    "Électrocinétique",
    "Anglais",
    "Mesures Physiques",
    "Mécanique",
    "Mécatronique",
    // Semestre 2
    "Réflexion humaine",
    "Géométrie",
    "Analyse 2",
    "Électrostatique/magnétostatique",
    "Chimie",
    "Algorithmique",
    "IDFOT",
  ];

  const handleOpenApproveModal = (contrib: ContributionModel) => {
    setSelectedContrib(contrib);
    const baseTitle = contrib.titre
      ? contrib.titre
      : contrib.commentaire
      ? contrib.commentaire
      : `Épreuve ${contrib.fichierNom.replace(".pdf", "")}`;
    setTitre(baseTitle);
    if (contrib.matiere) setMatiere(contrib.matiere);
    if (contrib.semestre) setSemestre(contrib.semestre);
    if (contrib.typeEpreuve) setTypeEpreuve(contrib.typeEpreuve);
    if (contrib.anneeAcademique) setAnneeAcademique(contrib.anneeAcademique);
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContrib) return;
    setIsApproveLoading(true);

    try {
      await approveContributionApi(selectedContrib.id, {
        titre,
        matiere,
        semestre,
        typeEpreuve,
        anneeAcademique,
      });

      setSelectedContrib(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'approbation.");
    } finally {
      setIsApproveLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment refuser cette contribution ?")) {
      try {
        await rejectContributionApi(id);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || "Erreur lors du refus.");
      }
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce document de la plateforme ?")) {
      try {
        await deleteDocumentApi(id);
        onRefreshData();
      } catch (err: any) {
        alert(err.message || "Erreur lors de la suppression.");
      }
    }
  };

  const handleSaveDocEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      await updateDocumentApi(editingDoc.id, {
        titre: editingDoc.titre,
        matiere: editingDoc.matiere,
        semestre: editingDoc.semestre,
        typeEpreuve: editingDoc.typeEpreuve,
        anneeAcademique: editingDoc.anneeAcademique,
      });

      setEditingDoc(null);
      onRefreshData();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la mise à jour.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 flex items-center space-x-2">
            <FileCheck className="w-7 h-7 text-indigo-700" />
            <span>Gestion et Modération</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Validez les épreuves soumises par les étudiants et gérez le fonds documentaire.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-full border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "pending"
                ? "bg-indigo-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>En attente ({pendingList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("published")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === "published"
                ? "bg-indigo-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Publiés ({documents.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PENDING CONTRIBUTIONS */}
      {activeTab === "pending" && (
        <div className="space-y-4">
          {pendingList.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-6 space-y-2 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-slate-900 font-bold text-lg">Aucune contribution en attente</h3>
              <p className="text-xs text-slate-500">
                Toutes les épreuves soumises par les étudiants ont été modérées.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingList.map((contrib) => (
                <div
                  key={contrib.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Soumission Étudiant
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(contrib.dateEnvoi).toLocaleDateString("fr-FR")}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
                      <span>{contrib.fichierNom}</span>
                    </h3>

                    {contrib.commentaire && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                        "{contrib.commentaire}"
                      </p>
                    )}

                    <div className="text-xs text-slate-500">
                      Proposé par : <strong className="text-slate-900 font-bold">{contrib.utilisateurNom}</strong> ({contrib.utilisateurEmail})
                    </div>
                  </div>

                  {/* Actions for Pending */}
                  <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 shrink-0">
                    <button
                      onClick={() =>
                        onPreviewPdf({
                          id: contrib.id,
                          titre: contrib.fichierNom,
                          matiere: "En attente",
                          semestre: "Semestre 1",
                          typeEpreuve: "SN",
                          anneeAcademique: "2023-2024",
                          fichierUrl: contrib.fichierUrl,
                          fichierNom: contrib.fichierNom,
                          statut: "En attente",
                          dateAjout: contrib.dateEnvoi,
                          telechargementsCount: 0,
                        })
                      }
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center space-x-1.5"
                    >
                      <Eye className="w-4 h-4 text-indigo-700" />
                      <span>Voir PDF</span>
                    </button>

                    <button
                      onClick={() => handleOpenApproveModal(contrib)}
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center space-x-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Accepter & Classifier</span>
                    </button>

                    <button
                      onClick={() => handleReject(contrib.id)}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Refuser</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLISHED DOCUMENTS MANAGER */}
      {activeTab === "published" && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-4">Titre de l'épreuve</th>
                  <th className="p-4">Matière</th>
                  <th className="p-4">Semestre</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Année</th>
                  <th className="p-4 text-center">Téléchargements</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-900 max-w-xs truncate">
                      {doc.titre}
                    </td>
                    <td className="p-4 text-indigo-700 font-bold">{doc.matiere}</td>
                    <td className="p-4">{doc.semestre}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {doc.typeEpreuve}
                      </span>
                    </td>
                    <td className="p-4 font-medium">{doc.anneeAcademique}</td>
                    <td className="p-4 text-center font-mono font-bold text-slate-900">
                      {doc.telechargementsCount || 0}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => onPreviewPdf(doc)}
                        title="Voir PDF"
                        className="p-2 text-slate-600 hover:text-indigo-900 bg-slate-100 rounded-xl"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingDoc(doc)}
                        title="Modifier classification"
                        className="p-2 text-slate-600 hover:text-indigo-900 bg-slate-100 rounded-xl"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        title="Supprimer"
                        className="p-2 text-slate-600 hover:text-red-700 bg-slate-100 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* APPROVAL & CLASSIFICATION MODAL */}
      {selectedContrib && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-slate-900 font-extrabold text-base flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-700" />
                <span>Validation et Classification</span>
              </h3>
              <button
                onClick={() => setSelectedContrib(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmApprove} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Titre public de l'épreuve <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Ex: Épreuve d'Analyse Mathématique 1 - Session Normale 2024"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Matière <span className="text-red-500">*</span>
                </label>
                <select
                  value={matiere}
                  onChange={(e) => setMatiere(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {matieresList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Semestre <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={semestre}
                    onChange={(e) => setSemestre(e.target.value as Semestre)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Semestre 1">Semestre 1</option>
                    <option value="Semestre 2">Semestre 2</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Type d'Épreuve <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={typeEpreuve}
                    onChange={(e) => setTypeEpreuve(e.target.value as EpreuveType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="CC">CC (Contrôle Continu)</option>
                    <option value="SN">SN (Session Normale)</option>
                    <option value="SR">SR (Session Rattrapage)</option>
                    <option value="TD">TD (Travaux Dirigés)</option>
                    <option value="TP">TP (Travaux Pratiques)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  Année Académique <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={anneeAcademique}
                  onChange={(e) => setAnneeAcademique(e.target.value)}
                  placeholder="Ex: 2023-2024"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedContrib(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isApproveLoading}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-full shadow-sm flex items-center space-x-2"
                >
                  {isApproveLoading ? (
                    <>
                      <LoadingSpinner className="text-white" />
                      <span>Publication...</span>
                    </>
                  ) : (
                    <span>Approuver et Publier</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PUBLISHED DOC MODAL */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-fadeIn">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-slate-900 font-extrabold text-base">Modifier l'épreuve</h3>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDocEdit} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 mb-1">Titre</label>
                <input
                  type="text"
                  value={editingDoc.titre}
                  onChange={(e) => setEditingDoc({ ...editingDoc, titre: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Matière</label>
                <select
                  value={editingDoc.matiere}
                  onChange={(e) => setEditingDoc({ ...editingDoc, matiere: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                >
                  {matieresList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Semestre</label>
                  <select
                    value={editingDoc.semestre}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, semestre: e.target.value as Semestre })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                  >
                    <option value="Semestre 1">Semestre 1</option>
                    <option value="Semestre 2">Semestre 2</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">Type d'Épreuve</label>
                  <select
                    value={editingDoc.typeEpreuve}
                    onChange={(e) =>
                      setEditingDoc({ ...editingDoc, typeEpreuve: e.target.value as EpreuveType })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                  >
                    <option value="CC">CC</option>
                    <option value="SN">SN</option>
                    <option value="SR">SR</option>
                    <option value="TD">TD</option>
                    <option value="TP">TP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Année Académique</label>
                <input
                  type="text"
                  value={editingDoc.anneeAcademique}
                  onChange={(e) => setEditingDoc({ ...editingDoc, anneeAcademique: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-full font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-900 text-white font-bold rounded-full shadow-sm"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
