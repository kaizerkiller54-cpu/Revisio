ALTER TABLE "documents"
ADD COLUMN "visible" BOOLEAN NOT NULL DEFAULT true;

-- Preserve the embargo that was previously tied to the 2026-2027 year.
UPDATE "documents"
SET "visible" = false
WHERE "anneeAcademique" = '2026-2027'
  AND "statut" = 'En_attente';

CREATE INDEX "documents_visible_anneeAcademique_idx"
ON "documents"("visible", "anneeAcademique");
