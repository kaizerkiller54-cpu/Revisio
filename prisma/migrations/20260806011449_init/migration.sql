-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Etudiant', 'Administrateur', 'SuperAdministrateur');

-- CreateEnum
CREATE TYPE "TypeEpreuve" AS ENUM ('CC', 'SN', 'SR');

-- CreateEnum
CREATE TYPE "Semestre" AS ENUM ('Semestre_1', 'Semestre_2');

-- CreateEnum
CREATE TYPE "Statut" AS ENUM ('En_attente', 'Publie', 'Refuse');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Etudiant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matieres" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "semestre" "Semestre" NOT NULL,
    "description" TEXT,

    CONSTRAINT "matieres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "matiereId" TEXT NOT NULL,
    "semestre" "Semestre" NOT NULL,
    "typeEpreuve" "TypeEpreuve" NOT NULL,
    "anneeAcademique" TEXT NOT NULL,
    "fichierUrl" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'Publie',
    "datePublication" TIMESTAMP(3),
    "telechargementsCount" INTEGER NOT NULL DEFAULT 0,
    "contributionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "utilisateurNom" TEXT NOT NULL,
    "utilisateurEmail" TEXT NOT NULL,
    "anneeAcademique" TEXT NOT NULL,
    "matiere" TEXT NOT NULL,
    "semestre" "Semestre" NOT NULL,
    "typeEpreuve" "TypeEpreuve" NOT NULL,
    "titre" TEXT,
    "commentaire" TEXT,
    "fichierUrl" TEXT NOT NULL,
    "fichierNom" TEXT NOT NULL,
    "statut" "Statut" NOT NULL DEFAULT 'En_attente',
    "dateEnvoi" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userNom" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userRole" "Role" NOT NULL,
    "actionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetId" TEXT,
    "targetTitle" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'info',
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "linkTab" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminNom" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "targetId" TEXT,
    "targetName" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "matieres_code_key" ON "matieres"("code");

-- CreateIndex
CREATE UNIQUE INDEX "documents_contributionId_key" ON "documents"("contributionId");

-- CreateIndex
CREATE INDEX "documents_matiereId_typeEpreuve_semestre_idx" ON "documents"("matiereId", "typeEpreuve", "semestre");

-- CreateIndex
CREATE INDEX "contributions_utilisateurId_statut_idx" ON "contributions"("utilisateurId", "statut");

-- CreateIndex
CREATE INDEX "user_activities_userId_timestamp_idx" ON "user_activities"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "user_notifications_userId_lue_idx" ON "user_notifications"("userId", "lue");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_matiereId_fkey" FOREIGN KEY ("matiereId") REFERENCES "matieres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
