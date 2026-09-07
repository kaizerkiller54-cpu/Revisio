-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeEpreuve" ADD VALUE 'TD';
ALTER TYPE "TypeEpreuve" ADD VALUE 'TP';

-- CreateIndex
CREATE INDEX "documents_statut_anneeAcademique_idx" ON "documents"("statut", "anneeAcademique");

-- CreateIndex
CREATE INDEX "documents_semestre_typeEpreuve_statut_idx" ON "documents"("semestre", "typeEpreuve", "statut");

-- CreateIndex
CREATE INDEX "documents_titre_idx" ON "documents"("titre");
