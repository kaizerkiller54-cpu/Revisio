@echo off
REM ============================================
REM ISJ Revisio - Setup automatisé Windows
REM ============================================
REM Usage: setup.bat
REM Prérequis: Node.js 20+, PostgreSQL 15+ dans le PATH
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ============================================
echo  ISJ Revisio - Installation automatisée
echo ============================================
echo.

REM 1. Vérifier Node.js
echo [1/7] Verification Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js non trouve. Installez Node.js 20+ depuis https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=1" %%v in ('node --version') do set NODE_VER=%%v
echo OK - Node.js %NODE_VER%

REM 2. Vérifier PostgreSQL (psql)
echo [2/7] Verification PostgreSQL...
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ATTENTION: psql non trouve dans le PATH.
    echo Assurez-vous que PostgreSQL est installe et que le dossier bin est dans le PATH.
    echo Exemple: C:\Program Files\PostgreSQL\16\bin
    pause
)
echo OK - PostgreSQL detecte

REM 3. Installer dépendances npm
echo [3/7] Installation des dependances npm...
echo (peut prendre 1-2 minutes)
npm install --registry=https://registry.npmmirror.com --legacy-peer-deps
if %errorlevel% neq 0 (
    echo ERREUR: npm install a echoue.
    pause
    exit /b 1
)
echo OK - Dependances installees

REM 4. Créer la base de données PostgreSQL
echo [4/7] Creation de la base de donnees PostgreSQL...
echo Entrez le mot de passe de l'utilisateur postgres (souvent 'postgres' ou vide):
psql -U postgres -c "CREATE ROLE revisio WITH LOGIN PASSWORD 'Revisio2026!';" 2>&1 | findstr /v "CREATE ROLE"
psql -U postgres -c "CREATE DATABASE revisio OWNER revisio;" 2>&1 | findstr /v "CREATE DATABASE"
echo OK - Base 'revisio' prete (role: revisio / mdp: Revisio2026!)

REM 5. Fichier .env
echo [5/7] Configuration .env...
if not exist ".env" (
    copy .env.example .env >nul
    echo.
    echo ============================================
    echo FICHIER .env CREE A PARTIR DU TEMPLATE
    echo ============================================
    echo.
    echo VOUS DEVEZ MAINTENANT EDITER .env AVEC VOS VALEURS REELLES :
    echo   - DATABASE_URL (deja OK pour PostgreSQL local)
    echo   - SUPABASE_URL (https://<votre-ref>.supabase.co)
    echo   - SUPABASE_ANON_KEY
    echo   - SUPABASE_SERVICE_ROLE_KEY
    echo   - SUPABASE_JWT_SECRET
    echo   - SUPERADMIN_MASTER_KEY (changez-la !)
    echo.
    echo Ouvrez .env dans votre editeur, modifiez, sauvegardez.
    echo Puis appuyez sur ENTREE pour continuer...
    pause
) else (
    echo .env existe deja - OK
)

REM 6. Prisma generate + migrations + seed
echo [6/7] Prisma generate + migrations + seed...
npx prisma generate
if %errorlevel% neq 0 (
    echo ERREUR: prisma generate a echoue.
    pause
    exit /b 1
)

npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo ERREUR: prisma migrate deploy a echoue.
    echo Verifiez DATABASE_URL dans .env et que PostgreSQL tourne.
    pause
    exit /b 1
)

npm run prisma:seed
if %errorlevel% neq 0 (
    echo ERREUR: seed a echoue.
    pause
    exit /b 1
)
echo OK - Base initialisee avec 3 comptes de test

REM 7. Build production (optionnel)
echo [7/7] Build production (optionnel)...
echo Voulez-vous builder pour la production maintenant ? (O/N)
set /p BUILD_CHOICE=
if /i "!BUILD_CHOICE!"=="O" (
    npm run build
    if %errorlevel% neq 0 (
        echo ERREUR: build a echoue.
        pause
        exit /b 1
    )
    echo OK - Build dans dist/
) else (
    echo Build ignore. Vous pourrez faire 'npm run build' plus tard.
)

echo.
echo ============================================
echo  INSTALLATION TERMINEE AVEC SUCCES
echo ============================================
echo.
echo Comptes de test crees :
echo   SuperAdmin : superadmin@isj.cm
echo   Admin      : admin@isj.cm
echo   Etudiant   : etudiant@isj.cm
echo Les mots de passe aleatoires sont affiches une seule fois par le seed.
echo.
echo Pour lancer en DEVELOPPEMENT :
echo   npm run dev
echo.
echo Pour lancer en PRODUCTION :
echo   npm run build
echo   npm start
echo.
echo Acces : http://localhost:3000
echo.
pause
