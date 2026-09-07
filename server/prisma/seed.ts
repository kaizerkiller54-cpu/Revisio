import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";
import { createSupabaseUser } from "../services/auth.service";

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

  await prisma.user.create({
    data: {
      id: superadminId,
      nom: "DIRECTION",
      prenom: "Super Admin ISJ",
      email: "superadmin@isj.cm",
      role: "SuperAdministrateur",
    },
  });
  await prisma.user.create({
    data: {
      id: etudiantId,
      nom: "TALLA",
      prenom: "Roland",
      email: "etudiant@isj.cm",
      role: "Etudiant",
    },
  });
  await prisma.user.create({
    data: {
      id: adminId,
      nom: "NSANGOU",
      prenom: "Dr. Paul",
      email: "admin@isj.cm",
      role: "Administrateur",
    },
  });

  for (const m of MATIERES) {
    await prisma.matiere.create({ data: m });
  }

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