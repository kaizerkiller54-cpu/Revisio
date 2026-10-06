import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env";
import { uploadPdfBuffer } from "../services/supabase";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.databaseUrl }) });

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function makePdf(title: string, bodyLines: string[]): Buffer {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objects: string[] = [];
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`
  );
  const contentLines: string[] = [];
  contentLines.push(`BT /F1 15 Tf 50 790 Td (${esc(title)}) Tj ET`);
  contentLines.push("BT /F1 9 Tf 50 770 Td (Institut Universitaire Saint Jean - Niveau 1) Tj ET");
  contentLines.push("BT /F1 9 Tf 50 756 Td (Document officiel d'entrainement - Revisio ISJ) Tj ET");
  let y = 720;
  for (const line of bodyLines) {
    contentLines.push(`BT /F1 10 Tf 50 ${y} Td (${esc(line)}) Tj ET`);
    y -= 18;
    if (y < 60) break;
  }
  const stream = contentLines.join("\n");
  objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

interface SeedDoc {
  matiere: string;
  semestre: "Semestre 1" | "Semestre 2";
  typeEpreuve: "CC" | "SN" | "SR" | "TD" | "TP" | "Cours";
  anneeAcademique: string;
  titre: string;
  contenu: string[];
}

const DOCS: SeedDoc[] = [
  {
    matiere: "Analyse 1",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    titre: "Analyse 1 - Session Normale 2024-2025",
    contenu: [
      "Exercice 1 (5 pts) : Etudier la convergence des suites suivantes",
      "   a) u_n = (3n^2 + 2n) / (n^2 - 1)",
      "   b) v_n = n^2 / 2^n",
      "   c) w_n = (1 + 1/n)^n",
      "Exercice 2 (5 pts) : Calculer les limites suivantes",
      "   a) lim x->0 (sin x) / x",
      "   b) lim x->+inf (ln x) / x",
      "Exercice 3 (5 pts) : Etudier et representer la fonction f(x) = x^3 - 3x + 1",
      "   (derivabilite, variations, limites, asymptotes, graphe)",
      "Exercice 4 (5 pts) : Calculer les integrales :",
      "   a) I = ∫ x ln x dx  b) J = ∫ 1/(x^2 + 1) dx",
      "Bon courage !",
    ],
  },
  {
    matiere: "Analyse 1",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2024-2025",
    titre: "Analyse 1 - Controle Continu 2024-2025",
    contenu: [
      "Exercice 1 (4 pts) : Donner la definition de la continuite en un point.",
      "   Montrer que f(x) = |x| est continue en 0 mais non derivable en 0.",
      "Exercice 2 (3 pts) : Determiner le DL_2(0) de f(x) = ln(1 + x).",
      "Exercice 3 (3 pts) : Calculer la derivee de g(x) = e^(x^2).cos x",
      "Durée : 1h30. Aucun document autorise.",
    ],
  },
  {
    matiere: "Algèbre linéaire",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    titre: "Algèbre linéaire - Session Normale 2024-2025",
    contenu: [
      "Exercice 1 (4 pts) : Resoudre le systeme lineaire :",
      "   x + 2y - z = 3",
      "   2x - y + z = 1",
      "   x + y + 2z = 4",
      "Exercice 2 (4 pts) : Soit A = [[1,2],[3,4]]. Calculer A^2 et A^(-1).",
      "Exercice 3 (4 pts) : Determiner si les vecteurs (1,2,0), (0,1,1) et (2,3,1)",
      "   forment une base de R^3.",
      "Exercice 4 (3 pts) : Calculer le determinant de la matrice :",
      "   [[1,2,3],[0,1,4],[5,6,0]]",
      "Durée : 2h00.",
    ],
  },
  {
    matiere: "Électrocinétique",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    titre: "Électrocinétique - Session Normale 2024-2025",
    contenu: [
      "Exercice 1 (5 pts) : Loi des mailles et des noeuds.",
      "   Determiner les courants I1, I2, I3 du circuit suivant :",
      "   E = 12V, R1 = 2Ω, R2 = 4Ω, R3 = 6Ω.",
      "Exercice 2 (5 pts) : Thevenin et Norton.",
      "   Donner le modele de Thevenin equivalent entre A et B du circuit.",
      "Exercice 3 (5 pts) : Regime transitoire d'un circuit RC.",
      "   Etablir l'equation differentielle et la solution de u_c(t).",
      "   (R = 1kΩ, C = 10 μF, E = 5V)",
      "Exercice 4 (5 pts) : Regime sinusoidal force, impedance complexe.",
      "   Calculer le courant dans un circuit RLC serie (f = 50 Hz).",
    ],
  },
  {
    matiere: "Mécanique",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2023-2024",
    titre: "Mécanique - Session Normale 2023-2024",
    contenu: [
      "Exercice 1 (5 pts) : Un mobile a un mouvement rectiligne uniformement accelere.",
      "   v0 = 2 m/s, a = 3 m/s^2. Calculer la position et la vitesse a t = 4 s.",
      "Exercice 2 (5 pts) : Projectile lance avec une vitesse v0 = 20 m/s",
      "   sous un angle α = 45°. Calculer la portee et la hauteur maximale.",
      "Exercice 3 (5 pts) : Le travail et l'energie.",
      "   Une force constante F = 50 N deplacer un objet de 10 m.",
      "   Calculer le travail et la puissance si la duree est 5 s.",
      "Exercice 4 (5 pts) : Moments de forces et equilibre d'un levier.",
    ],
  },
  {
    matiere: "Anglais",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2024-2025",
    titre: "Anglais - Controle Continu 2024-2025",
    contenu: [
      "PART ONE (4 pts) : Reading comprehension. Read the passage and answer the questions.",
      "PART TWO (3 pts) : Fill in the blanks with the correct tense (present simple, past simple).",
      "PART THREE (3 pts) : Vocabulary - match the engineering terms with their definitions.",
      "PART FOUR (3 pts) : Write a short paragraph (5 sentences) about your studies at ISJ.",
      "Duration: 1 hour.",
    ],
  },
  {
    matiere: "Algèbre linéaire",
    semestre: "Semestre 1",
    typeEpreuve: "CC",
    anneeAcademique: "2023-2024",
    titre: "Algèbre linéaire - Controle Continu 2023-2024",
    contenu: [
      "Exercice 1 (4 pts) : Operations sur les matrices. Soit A et B :",
      "   Calculer A + B, 2A - 3B, AB et BA (si possible).",
      "Exercice 2 (3 pts) : Calculer le rang des matrices donnees.",
      "Exercice 3 (3 pts) : Resoudre un systeme par la methode de Gauss.",
    ],
  },
  {
    matiere: "Analyse 2",
    semestre: "Semestre 2",
    typeEpreuve: "SN",
    anneeAcademique: "2023-2024",
    titre: "Analyse 2 - Session Normale 2023-2024",
    contenu: [
      "Exercice 1 (5 pts) : Etudier la convergence des series :",
      "   a) Σ 1/n^2  b) Σ (-1)^n / n  c) Σ n/(n+1)",
      "Exercice 2 (5 pts) : Series de Fourier.",
      "   Decomposer f(x) = x sur l'intervalle [-π, π] en serie de Fourier.",
      "Exercice 3 (5 pts) : Integrales doubles.",
      "   Calculer ∫∫_D (x + y) dxdy ou D = [0,1] x [0,2].",
      "Exercice 4 (5 pts) : Equations differentielles du second ordre.",
      "   Resoudre y'' - 4y' + 3y = 0 avec les conditions initiales.",
    ],
  },
  {
    matiere: "Électrostatique/magnétostatique",
    semestre: "Semestre 2",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    titre: "Électrostatique/magnétostatique - Session Normale 2024-2025",
    contenu: [
      "Exercice 1 (5 pts) : Champ electrique cree par une charge ponctuelle.",
      "   q = 2 μC placee a l'origine. Calculer le champ a 3 cm.",
      "Exercice 2 (5 pts) : Theoreme de Gauss.",
      "   Appliquer le theoreme de Gauss a une sphere uniformement chargee.",
      "Exercice 3 (5 pts) : Champ magnetique cree par un fil rectiligne infini.",
      "   Determiner B a une distance d du fil parcouru par un courant I.",
      "Exercice 4 (5 pts) : Force de Lorentz et mouvement d'une particule chargee.",
    ],
  },
  {
    matiere: "Algorithmique",
    semestre: "Semestre 2",
    typeEpreuve: "SN",
    anneeAcademique: "2024-2025",
    titre: "Algorithmique - Session Normale 2024-2025",
    contenu: [
      "Exercice 1 (5 pts) : Ecrire un algorithme qui calcule la somme des n",
      "   premiers entiers et la factorielle de n.",
      "Exercice 2 (5 pts) : Tri a bulles. Appliquer l'algorithme au tableau",
      "   [5, 3, 8, 1, 9] et donner la complexite.",
      "Exercice 3 (5 pts) : Recherche dichotomique dans un tableau trie.",
      "   Donner le principe et la complexite.",
      "Exercice 4 (5 pts) : Structures de donnees - piles et files.",
      "   Simuler les operations sur une pile (push, pop, top).",
    ],
  },
  {
    matiere: "Algorithmique",
    semestre: "Semestre 2",
    typeEpreuve: "SR",
    anneeAcademique: "2023-2024",
    titre: "Algorithmique - Session de Rattrapage 2023-2024",
    contenu: [
      "Exercice 1 (5 pts) : Algorithme de calcul du PGCD de deux entiers",
      "   par la methode d'Euclide (pseudocode + complexite).",
      "Exercice 2 (5 pts) : Inverser un tableau et trouver le max.",
      "Exercice 3 (5 pts) : Tri par insertion - appliquer et expliquer.",
    ],
  },
  {
    matiere: "Géométrie",
    semestre: "Semestre 2",
    typeEpreuve: "SN",
    anneeAcademique: "2023-2024",
    titre: "Géométrie - Session Normale 2023-2024",
    contenu: [
      "Exercice 1 (4 pts) : Produit scalaire et vectoriel dans l'espace.",
      "Exercice 2 (4 pts) : Equation du plan passant par trois points.",
      "Exercice 3 (4 pts) : Distance d'un point a un plan.",
      "Exercice 4 (3 pts) : Intersection d'une droite et d'un plan.",
    ],
  },
  {
    matiere: "Chimie",
    semestre: "Semestre 2",
    typeEpreuve: "CC",
    anneeAcademique: "2024-2025",
    titre: "Chimie - Controle Continu 2024-2025",
    contenu: [
      "Exercice 1 (4 pts) : Configuration electronique des elements :",
      "   12Mg, 17Cl, 26Fe. Donner la structure electronique.",
      "Exercice 2 (3 pts) : Lier la periodicite des proprietes a la structure.",
      "Exercice 3 (3 pts) : Equilibrer les reactions chimiques suivantes.",
      "Exercice 4 (3 pts) : Calcul de pH d'une solution acide forte (pH = -log[H+]).",
    ],
  },
  {
    matiere: "Mécatronique",
    semestre: "Semestre 1",
    typeEpreuve: "SN",
    anneeAcademique: "2023-2024",
    titre: "Mécatronique - Session Normale 2023-2024",
    contenu: [
      "Exercice 1 (5 pts) : Schema fonctionnel d'un systeme mecatronique.",
      "Exercice 2 (5 pts) : Capteurs : definir un capteur et citer 5 exemples",
      "   avec leur grandeur physique d'entree.",
      "Exercice 3 (5 pts) : Actionneurs electriques : moteur DC, principe et equation.",
      "Exercice 4 (5 pts) : Automatisme : logigramme et grafcet d'un systeme simple.",
    ],
  },
];

async function main() {
  console.log("📄 Seed des documents d'epreuves ISJ...");

  const matieres = await prisma.matiere.findMany();
  const semestreDb = (s: "Semestre 1" | "Semestre 2") => (s === "Semestre 2" ? "Semestre_2" : "Semestre_1");

  let created = 0;
  for (const d of DOCS) {
    const matiere = matieres.find((m) => m.nom === d.matiere);
    if (!matiere) {
      console.log("   (skip) matiere introuvable:", d.matiere);
      continue;
    }
    const contenu = [d.titre, "", ...d.contenu];
    const pdf = makePdf(stripAccents(d.titre), contenu.map(stripAccents));
    const fichierNom = `${d.matiere.replace(/\s+/g, "_")}-${d.typeEpreuve}-${d.anneeAcademique.replace("/", "_")}.pdf`;
    const fichierUrl = await uploadPdfBuffer(pdf, fichierNom);

    await prisma.document.create({
      data: {
        titre: d.titre,
        matiereId: matiere.id,
        semestre: semestreDb(d.semestre),
        typeEpreuve: d.typeEpreuve,
        anneeAcademique: d.anneeAcademique,
        fichierUrl,
        fichierNom,
        statut: "Publie",
        datePublication: new Date(),
      },
    });
    created++;
    console.log(`   ✅ ${d.titre}`);
  }

  const total = await prisma.document.count();
  console.log(`✅ Seed documents termine. ${created} documents crees, total en base : ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
