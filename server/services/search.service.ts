import { prisma } from "../prisma/client";
import { statutFromDb, semestreFromDb } from "../utils/mappers";

export interface DocSearchParams {
  search?: string;
  matiere?: string;
  semestre?: string;
  typeEpreuve?: string;
  anneeAcademique?: string;
  statut?: string;
  page?: number;
  pageSize?: number;
}

interface SearchRow {
  id: string;
  titre: string;
  matiereNom: string;
  matiereId: string;
  semestre: "Semestre_1" | "Semestre_2";
  typeEpreuve: "CC" | "SN" | "SR" | "TD" | "TP" | "Cours";
  anneeAcademique: string;
  fichierUrl: string;
  fichierNom: string;
  statut: "En_attente" | "Publie" | "Refuse";
  datePublication: Date | null;
  telechargementsCount: number;
  createdAt: Date;
  contributionId: string | null;
}

export interface SearchedDocument {
  id: string;
  titre: string;
  matiere: string;
  matiereId: string;
  semestre: "Semestre 1" | "Semestre 2";
  typeEpreuve: string;
  anneeAcademique: string;
  fichierUrl: string;
  fichierNom: string;
  statut: string;
  datePublication?: string;
  dateAjout: string;
  telechargementsCount: number;
  contributionId?: string;
}

export interface SearchResult {
  data: SearchedDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchSuggestion {
  id: string;
  titre: string;
  matiere: string;
  typeEpreuve: string;
  semestre: string;
  anneeAcademique: string;
  fichierUrl: string;
  score: number;
}

let ftsReady = false;
let ftsChecked = false;

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function buildTsQuery(search: string): string | null {
  const tokens = stripAccents(search.toLowerCase())
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0)
    .map((t) => `${t}:*`);
  if (tokens.length === 0) return null;
  return tokens.join(" & ");
}

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Crée (idempotent) les extensions et index serveur nécessaires pour une
 * recherche ultra rapide, insensible aux accents et tolérante aux sous-chaînes.
 * Ne fait jamais planter le démarrage : un échec bascule sur la recherche LIKE.
 */
export async function ensureSearchIndexes(): Promise<void> {
  if (ftsChecked) return;
  ftsChecked = true;
  try {
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION public.unaccent_text(text)
      RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
      AS $fn$ SELECT public.unaccent('public.unaccent', $1) $fn$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "documents_titre_fts_idx"
      ON "documents" USING GIN (to_tsvector('simple', public.unaccent_text("titre")));
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "matieres_nom_fts_idx"
      ON "matieres" USING GIN (to_tsvector('simple', public.unaccent_text("nom")));
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "documents_titre_trgm_idx"
      ON "documents" USING GIN (public.unaccent_text("titre") gin_trgm_ops);
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "matieres_nom_trgm_idx"
      ON "matieres" USING GIN (public.unaccent_text("nom") gin_trgm_ops);
    `);
    await prisma.$queryRawUnsafe(`SELECT public.unaccent_text('test') AS __ok;`);
    ftsReady = true;
  } catch (err) {
    ftsReady = false;
    console.warn(
      "Recherche avancée indisponible (extensions unaccent/pg_trgm), bascule sur LIKE :",
      (err as Error).message
    );
  }
}

function mapRow(row: SearchRow) {
  return {
    id: row.id,
    titre: row.titre,
    matiere: row.matiereNom,
    matiereId: row.matiereId,
    semestre: semestreFromDb(row.semestre),
    typeEpreuve: row.typeEpreuve,
    anneeAcademique: row.anneeAcademique,
    fichierUrl: "",
    fichierNom: row.fichierNom,
    statut: statutFromDb(row.statut),
    datePublication: row.datePublication ? row.datePublication.toISOString() : undefined,
    dateAjout: row.createdAt.toISOString(),
    telechargementsCount: row.telechargementsCount,
    contributionId: row.contributionId ?? undefined,
  };
}

export async function searchDocuments(params: DocSearchParams = {}): Promise<SearchResult> {
  // Défense en profondeur : tout statut inconnu retombe par défaut sur
  // "Publie" pour ne jamais exposer des documents non publiés.
  const statutDb =
    params.statut === undefined || params.statut === "Publié"
      ? "Publie"
      : params.statut === "Refusé"
        ? "Refuse"
        : params.statut === "En attente"
          ? "En_attente"
          : "Publie";

  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 50) : 12;
  const offset = (page - 1) * pageSize;

  const search = (params.search ?? "").trim();
  const hasSearch = search.length > 0;
  const tsQuery = hasSearch && ftsReady ? buildTsQuery(search) : null;
  // Recherche réduite à de la ponctuation : aucun terme exploitable.
  if (hasSearch && ftsReady && tsQuery === null) {
    return { data: [], total: 0, page, pageSize };
  }
  const likeTerm = hasSearch ? `%${escapeLike(search.toLowerCase())}%` : null;

  const where: string[] = [`d."statut" = $1`, `d."visible" = TRUE`];
  const values: unknown[] = [statutDb];
  let idx = 2;
  let searchParam = 0;

  if (params.matiere && params.matiere !== "Toutes") {
    where.push(`m."nom" = $${idx}`);
    values.push(params.matiere);
    idx++;
  }
  if (params.semestre && params.semestre !== "Tous") {
    where.push(`d."semestre" = $${idx}`);
    values.push(params.semestre === "Semestre 2" ? "Semestre_2" : "Semestre_1");
    idx++;
  }
  if (params.typeEpreuve && params.typeEpreuve !== "Tous") {
    where.push(`d."typeEpreuve" = $${idx}`);
    values.push(params.typeEpreuve);
    idx++;
  }
  if (params.anneeAcademique && params.anneeAcademique !== "Toutes") {
    where.push(`d."anneeAcademique" = $${idx}`);
    values.push(params.anneeAcademique);
    idx++;
  }

  if (hasSearch && ftsReady) {
    searchParam = idx;
    where.push(`(
      to_tsvector('simple', public.unaccent_text(d."titre")) @@ to_tsquery('simple', $${searchParam})
      OR to_tsvector('simple', public.unaccent_text(m."nom")) @@ to_tsquery('simple', $${searchParam})
      OR to_tsvector('simple', public.unaccent_text(d."anneeAcademique")) @@ to_tsquery('simple', $${searchParam})
    )`);
    values.push(tsQuery);
    idx++;
  } else if (hasSearch) {
    searchParam = idx;
    where.push(`(
      LOWER(d."titre") LIKE $${searchParam}
      OR LOWER(m."nom") LIKE $${searchParam}
      OR LOWER(d."anneeAcademique") LIKE $${searchParam}
    )`);
    values.push(likeTerm);
    idx++;
  }

  const whereSql = where.join("\n  AND ");

  const select = `
    SELECT
      d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
      d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
      d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
      m."nom" AS "matiereNom"
    FROM "documents" d
    JOIN "matieres" m ON m."id" = d."matiereId"
    WHERE ${whereSql}
  `;

  const orderBy =
    hasSearch && ftsReady
      ? `ORDER BY
          ts_rank_cd(to_tsvector('simple', public.unaccent_text(d."titre")), to_tsquery('simple', $${searchParam}))
            + ts_rank_cd(to_tsvector('simple', public.unaccent_text(m."nom")), to_tsquery('simple', $${searchParam}))
          DESC, d."createdAt" DESC`
      : `ORDER BY d."createdAt" DESC`;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe<SearchRow[]>(
      `${select} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      ...values,
      pageSize,
      offset
    ),
    prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int AS total FROM "documents" d JOIN "matieres" m ON m."id" = d."matiereId" WHERE ${whereSql}`,
      ...values
    ),
  ]);

  return {
    data: rows.map(mapRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  };
}

export async function suggestDocuments(q: string, limit = 6): Promise<SearchSuggestion[]> {
  const query = (q ?? "").trim();
  if (query.length < 2) return [];

  const likeTerm = `%${escapeLike(query.toLowerCase())}%`;

  if (ftsReady) {
    const tsQuery = buildTsQuery(query);
    if (tsQuery === null) return [];
    const rows = await prisma.$queryRawUnsafe<
      (SearchRow & { score: number })[]
    >(
      `
        SELECT
          d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
          d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
          d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
          m."nom" AS "matiereNom",
          ts_rank_cd(to_tsvector('simple', public.unaccent_text(d."titre")), to_tsquery('simple', $1))
            + ts_rank_cd(to_tsvector('simple', public.unaccent_text(m."nom")), to_tsquery('simple', $1)) AS score
        FROM "documents" d
        JOIN "matieres" m ON m."id" = d."matiereId"
        WHERE d."statut" = 'Publie'
          AND d."visible" = TRUE
          AND (
            to_tsvector('simple', public.unaccent_text(d."titre")) @@ to_tsquery('simple', $1)
            OR to_tsvector('simple', public.unaccent_text(m."nom")) @@ to_tsquery('simple', $1)
          )
        ORDER BY score DESC, d."createdAt" DESC
        LIMIT $2
      `,
      tsQuery,
      limit
    );
    return rows.map((r) => ({
      id: r.id,
      titre: r.titre,
      matiere: r.matiereNom,
      typeEpreuve: r.typeEpreuve,
      semestre: semestreFromDb(r.semestre),
      anneeAcademique: r.anneeAcademique,
      fichierUrl: "",
      score: r.score,
    }));
  }

  const rows = await prisma.$queryRawUnsafe<SearchRow[]>(
    `
      SELECT
        d."id", d."titre", d."matiereId", d."semestre", d."typeEpreuve",
        d."anneeAcademique", d."fichierUrl", d."fichierNom", d."statut",
        d."datePublication", d."telechargementsCount", d."createdAt", d."contributionId",
        m."nom" AS "matiereNom"
      FROM "documents" d
      JOIN "matieres" m ON m."id" = d."matiereId"
      WHERE d."statut" = 'Publie'
        AND d."visible" = TRUE
        AND (
          LOWER(d."titre") LIKE $1
          OR LOWER(m."nom") LIKE $1
          OR LOWER(d."anneeAcademique") LIKE $1
        )
      ORDER BY d."createdAt" DESC
      LIMIT $2
    `,
    likeTerm,
    limit
  );
  return rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    matiere: r.matiereNom,
    typeEpreuve: r.typeEpreuve,
    semestre: semestreFromDb(r.semestre),
    anneeAcademique: r.anneeAcademique,
    fichierUrl: "",
    score: 0,
  }));
}
