-- Fonction immutable unaccent pour une recherche insensible aux accents
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.unaccent_text(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $fn$
  SELECT public.unaccent('public.unaccent', $1)
$fn$;

-- Index GIN full-text sur les champs recherchés (nom = titre, matiere.nom, annee)
CREATE INDEX IF NOT EXISTS "documents_titre_fts_idx"
  ON "documents" USING GIN (to_tsvector('simple', public.unaccent_text("titre")));

CREATE INDEX IF NOT EXISTS "documents_annee_fts_idx"
  ON "documents" USING GIN (to_tsvector('simple', public.unaccent_text("anneeAcademique")));

CREATE INDEX IF NOT EXISTS "matieres_nom_fts_idx"
  ON "matieres" USING GIN (to_tsvector('simple', public.unaccent_text("nom")));
