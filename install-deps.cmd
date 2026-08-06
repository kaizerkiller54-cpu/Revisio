@echo off
set PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
cd /d C:\Users\DELL\Downloads\Revisio
npm install --prefer-offline --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund --fetch-retries=20 --fetch-retry-mintimeout=30000 --fetch-retry-maxtimeout=300000 --fetch-timeout=600000 @prisma/client pg bcryptjs jsonwebtoken zod multer express-rate-limit
if errorlevel 1 goto :fail
npm install -D --prefer-offline --legacy-peer-deps --registry=https://registry.npmmirror.com --no-audit --no-fund --fetch-retries=20 --fetch-retry-mintimeout=30000 --fetch-retry-maxtimeout=300000 --fetch-timeout=600000 prisma @types/pg @types/jsonwebtoken @types/multer
if errorlevel 1 goto :fail
echo INSTALL_DONE
exit /b 0
:fail
echo INSTALL_FAILED
exit /b 1
