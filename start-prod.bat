@echo off
REM Lancement production (build + serveur statique)
echo Build production...
npm run build
if %errorlevel% neq 0 (
    echo ERREUR build.
    pause
    exit /b 1
)
echo Démarrage serveur production...
set NODE_ENV=production
node dist/server.cjs