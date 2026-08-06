import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateSamplePdfDataUrl } from "../utils/pdf";
import { env } from "../config/env";
import { createSupabaseUser } from "../services/auth.service";
import { uploadPdfFromDataUrl } from "../services/supabase";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });

const MATIERES = [
  { nom: "Communication", code: "COMM101", semestre: "Semestre_1" as const, description: "Techniques de communication écrite et orale, synthèses et présentations professionnelles." },
  { nom: "Algèbre linéaire", code: "MATH101", semestre: "Semestre_1" as const, description: "Espaces vectoriels, matrices, applications linéaires, déterminants et systèmes d'équations." },
  { nom: "Analyse 1", code: "MATH102", semestre: "Semestre_1" as const, description: "Suites numériques, dérivation, développements limités, calcul d'intégrales et étude de fonctions." },
  { nom: "Électrocinétique", code: "PHYS101", semestre: "Semestre_1" as const, description: "Circuits électriques, lois de Kirchhoff, théorèmes généraux, régimes transitoires et sinusoïdaux." },
  { nom: "Anglais", code: "LANG101", semestre: "Semestre_1" as const, description: "Anglais scientifique et technique I, grammaire, compréhension et vocabulaire de l'ingénieur." },
  { nom: "Mesures Physiques", code: "PHYS102", semestre: "Semestre_1" as const, description: "Calculs d'incertitudes, métrologie, instruments de laboratoire et travaux pratiques de physique." },
  { nom: "Mécanique", code: "PHYS103", semestre: "Semestre_1" as const, description: "Mécanique du point matériel et du solide rigide, cinématique, dynamique, énergie et statique." },
  { nom: "Mécatronique", code: "MTRK101", semestre: "Semestre_1" as const, description: "Systèmes mécatroniques intégrés, capteurs, actionneurs, pré-actionneurs et automatismes." },
  { nom: "Réflexion humaine", code: "HUM201", semestre: "Semestre_2" as const, description: "Éthique de l'ingénieur, réflexion critique, responsabilité sociétale et développement personnel." },
  { nom: "Géométrie", code: "MATH201", semestre: "Semestre_2" as const, description: "Géométrie euclidienne dans l'espace, produit vectoriel, courbes et surfaces paramétrées." },
  { nom: "Analyse 2", code: "MATH202", semestre: "Semestre_2" as const, description: "Séries numériques, séries de Fourier, intégrales multiples et équations différentielles." },
  { nom: "Électrostatique/magnétostatique", code: "PHYS201", semestre: "Semestre_2" as const, description: "Champs et potentiels électrostatiques, théorème de Gauss, champ magnétique et induction." },
  { nom: "Anglais", code: "LANG202", semestre: "Semestre_2" as const, description: "Anglais technique II, prise de parole en public, présentations et rédaction de rapports." },
  { nom: "Chimie", code: "CHIM201", semestre: "Semestre_2" as const, description: "Structure atomique, liaisons chimiques, thermodynamique chimique et cinétique des réactions." },
  { nom: "Algorithmique", code: "INFO201", semestre: "Semestre_2" as const, description: "Conception d'algorithmes complexes, structures de données, tri, recherche et complexité." },
  { nom: "IDFOT", code: "INFO202", semestre: "Semestre_2" as const, description: "Initiation aux Développements et Formations aux Outils Technologiques et numériques." },
];

async function main() {
  console.log("🌱 Seed ISJ Revisio...");

  await prisma.$transaction([
    prisma.userActivity.deleteMany(),
    prisma.userNotification.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.document.deleteMany(),
    prisma.contribution.deleteMany(),
    prisma.matiere.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const superadminId = await createSupabaseUser("superadmin@isj.cm", "SuperAdmin2026!");
  const etudiantId = await createSupabaseUser("etudiant@isj.cm", "Etudiant2026!");
  const adminId = await createSupabaseUser("admin@isj.cm", "Admin2026!");

  const superadmin = await prisma.user.create({
    data: {
      id: superadminId,
      nom: "DIRECTION",
      prenom: "Super Admin ISJ",
      email: "superadmin@isj.cm",
      role: "SuperAdministrateur",
    },
  });
  const etudiant = await prisma.user.create({
    data: {
      id: etudiantId,
      nom: "TALLA",
      prenom: "Roland",
      email: "etudiant@isj.cm",
      role: "Etudiant",
    },
  });
  const admin = await prisma.user.create({
    data: {
      id: adminId,
      nom: "NSANGOU",
      prenom: "Dr. Paul",
      email: "admin@isj.cm",
      role: "Administrateur",
    },
  });

  const matiereByName: Record<string, string> = {};
  for (const m of MATIERES) {
    const row = await prisma.matiere.create({ data: m });
    matiereByName[m.nom] = row.id;
  }

  const docsSeed = [
    { titre: "Épreuve d'Analyse 1 - Session Normale 2023-2024", matiere: "Analyse 1", semestre: "Semestre_1", type: "SN", annee: "2023-2024", nom: "Analyse_1_SN_2023_2024_ISJ.pdf", dl: 142, datePub: new Date("2024-02-10T14:00:00.000Z"), dateAjout: new Date("2024-02-08T11:20:00.000Z") },
    { titre: "Contrôle Continu Algèbre linéaire", matiere: "Algèbre linéaire", semestre: "Semestre_1", type: "CC", annee: "2023-2024", nom: "Algebre_Lin_CC_2023_ISJ.pdf", dl: 198, datePub: new Date("2023-11-20T09:15:00.000Z"), dateAjout: new Date("2023-11-18T16:00:00.000Z") },
    { titre: "Session Rattrapage Électrocinétique", matiere: "Électrocinétique", semestre: "Semestre_1", type: "SR", annee: "2022-2023", nom: "Electrocinetique_SR_2022_2023_ISJ.pdf", dl: 87, datePub: new Date("2023-09-02T10:00:00.000Z"), dateAjout: new Date("2023-09-01T08:45:00.000Z") },
    { titre: "Examen de Session Normale Algorithmique", matiere: "Algorithmique", semestre: "Semestre_2", type: "SN", annee: "2023-2024", nom: "Algorithmique_SN_2024_ISJ.pdf", dl: 115, datePub: new Date("2024-06-15T16:30:00.000Z"), dateAjout: new Date("2024-06-12T10:00:00.000Z") },
    { titre: "Contrôle Continu Géométrie", matiere: "Géométrie", semestre: "Semestre_2", type: "CC", annee: "2023-2024", nom: "Geometrie_CC_2024_ISJ.pdf", dl: 76, datePub: new Date("2024-05-10T11:00:00.000Z"), dateAjout: new Date("2024-05-08T09:20:00.000Z") },
    { titre: "Session Normale Électrostatique/magnétostatique", matiere: "Électrostatique/magnétostatique", semestre: "Semestre_2", type: "SN", annee: "2023-2024", nom: "Electrostatique_SN_2024_ISJ.pdf", dl: 164, datePub: new Date("2024-06-25T13:40:00.000Z"), dateAjout: new Date("2024-06-22T15:10:00.000Z") },
  ];

  for (const d of docsSeed) {
    const fichierUrl = await uploadPdfFromDataUrl(
      generateSamplePdfDataUrl(d.matiere, d.matiere, d.annee, d.type),
      d.nom
    );
    await prisma.document.create({
      data: {
        titre: d.titre,
        matiereId: matiereByName[d.matiere],
        semestre: d.semestre as "Semestre_1" | "Semestre_2",
        typeEpreuve: d.type as "CC" | "SN" | "SR",
        anneeAcademique: d.annee,
        fichierUrl,
        fichierNom: d.nom,
        statut: "Publie",
        datePublication: d.datePub,
        createdAt: d.dateAjout,
        telechargementsCount: d.dl,
      },
    });
  }

  const contrib1 = await prisma.contribution.create({
    data: {
      utilisateurId: etudiant.id,
      utilisateurNom: "Roland TALLA",
      utilisateurEmail: "etudiant@isj.cm",
      anneeAcademique: "2023-2024",
      matiere: "Analyse 1",
      semestre: "Semestre_1",
      typeEpreuve: "SR",
      titre: "Épreuve de Rattrapage d'Analyse 1",
      commentaire: "Voici l'épreuve de Rattrapage d'Analyse 1 de juillet dernier !",
      fichierUrl: await uploadPdfFromDataUrl(
        generateSamplePdfDataUrl("Analyse 1 SR", "Analyse 1", "2023-2024", "Session Rattrapage"),
        "Analyse1_Rattrapage_2024.pdf"
      ),
      fichierNom: "Analyse1_Rattrapage_2024.pdf",
      statut: "En_attente",
      dateEnvoi: new Date("2026-07-28T10:15:00.000Z"),
    },
  });
  await prisma.contribution.create({
    data: {
      utilisateurId: etudiant.id,
      utilisateurNom: "Roland TALLA",
      utilisateurEmail: "etudiant@isj.cm",
      anneeAcademique: "2023-2024",
      matiere: "Chimie",
      semestre: "Semestre_2",
      typeEpreuve: "CC",
      titre: "CC Chimie Semestre 2",
      commentaire: "CC Chimie pour l'Ingénieur S2. Fichier scanné proprement.",
      fichierUrl: await uploadPdfFromDataUrl(
        generateSamplePdfDataUrl("Chimie CC", "Chimie", "2023-2024", "Contrôle Continu"),
        "Chimie_CC_2024_Scan.pdf"
      ),
      fichierNom: "Chimie_CC_2024_Scan.pdf",
      statut: "En_attente",
      dateEnvoi: new Date("2026-07-30T14:22:00.000Z"),
    },
  });

  await prisma.userActivity.createMany({
    data: [
      { userId: etudiant.id, userNom: "Roland TALLA", userEmail: "etudiant@isj.cm", userRole: "Etudiant", actionType: "LOGIN", description: "S'est connecté à la plateforme ISJ Revisio.", timestamp: new Date(Date.now() - 1000 * 60 * 35) },
      { userId: etudiant.id, userNom: "Roland TALLA", userEmail: "etudiant@isj.cm", userRole: "Etudiant", actionType: "DOWNLOAD_DOCUMENT", description: "A téléchargé l'épreuve 'Contrôle Continu Algorithmique 1 (2023/2024)'.", targetId: "doc-seed-1", targetTitle: "Contrôle Continu Algorithmique 1", timestamp: new Date(Date.now() - 1000 * 60 * 25) },
      { userId: admin.id, userNom: "Dr. Paul NSANGOU", userEmail: "admin@isj.cm", userRole: "Administrateur", actionType: "SUBMIT_CONTRIBUTION", description: "A soumis l'épreuve 'Épreuve de Rattrapage d'Analyse 1' pour modération.", targetId: contrib1.id, targetTitle: "Épreuve de Rattrapage d'Analyse 1", timestamp: new Date(Date.now() - 1000 * 60 * 15) },
      { userId: superadmin.id, userNom: "Super Admin ISJ", userEmail: "superadmin@isj.cm", userRole: "SuperAdministrateur", actionType: "CHANGE_USER_ROLE", description: "A procédé à une élévation de privilèges administrateur.", timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    ],
  });

  await prisma.userNotification.createMany({
    data: [
      { userId: etudiant.id, titre: "Épreuve Validée & Publiée !", message: "Votre sujet d'Architecture des Ordinateurs (SN 2023/2024) a été approuvé par l'administration et est désormais disponible en ligne.", type: "success", lue: false, createdAt: new Date(Date.now() - 1000 * 60 * 15), linkTab: "exams" },
      { userId: "ALL", titre: "Bienvenue sur ISJ Revisio", message: "Consultez, recherchez et téléchargez les annales, contrôles continus et examens de rattrapage du Niveau 1.", type: "info", lue: false, createdAt: new Date(Date.now() - 1000 * 60 * 120), linkTab: "exams" },
      { userId: "ADMINS", titre: "Nouvelle contribution déposée", message: "Un étudiant a soumis une nouvelle épreuve d'examen en attente de modération.", type: "warning", lue: false, createdAt: new Date(Date.now() - 1000 * 60 * 45), linkTab: "admin-documents" },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      { adminId: admin.id, adminNom: "Dr. Paul NSANGOU", adminEmail: "admin@isj.cm", action: "APPROVE_CONTRIBUTION", details: "A approuvé et publié l'épreuve 'Épreuve d'Analyse 1 - Session Normale 2023-2024'.", targetId: "doc-1", targetName: "Analyse 1 - SN 2023-2024", date: new Date("2026-07-31T14:30:00.000Z") },
      { adminId: admin.id, adminNom: "Dr. Paul NSANGOU", adminEmail: "admin@isj.cm", action: "REJECT_CONTRIBUTION", details: "A refusé une contribution d'épreuve non conforme ou illisible.", targetId: "contrib-old", targetName: "Scan_Incomplet.pdf", date: new Date("2026-07-29T10:00:00.000Z") },
      { adminId: superadmin.id, adminNom: "Super Admin ISJ", adminEmail: "superadmin@isj.cm", action: "CHANGE_USER_ROLE", details: "A nommé Ing. Christine EBODE au rôle d'Administrateur.", targetId: "user-4", targetName: "Ing. Christine EBODE", date: new Date("2026-07-25T09:00:00.000Z") },
    ],
  });

  console.log("✅ Seed terminé. Comptes : superadmin@isj.cm / etudiant@isj.cm / admin@isj.cm");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
