# ISJ Revisio — Plateforme d'Épreuves ISJ

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748.svg)](https://www.prisma.io/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Storage-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Application web complète pour la gestion et le partage d'épreuves académiques de l'ISJ (Institut Supérieur de la Jeunesse). Développée avec **React 19 + TypeScript** (frontend) et **Express + Prisma** (backend), authentification via **Supabase Auth** (JWT ES256) et stockage des PDF sur **Supabase Storage**. Budget zéro (tiers gratuits).

---

## 🎯 Fonctionnalités

### 🔐 Authentification & Rôles
- **Inscription / Connexion** — email + mot de passe (Supabase Auth)
- **JWT ES256** signés par GoTrue, vérifiés côté backend via JWKS public (kid `5b3ba3a7-...`)
- **Refresh token** rotation (Supabase session)
- **3 rôles** : `Etudiant`, `Administrateur`, `SuperAdministrateur`
- **Master Key SuperAdmin** — initialise uniquement le tout premier compte SuperAdmin; cette clé doit rester secrète et ne peut pas réinitialiser un compte existant

### 📚 Gestion des épreuves (Documents)
- **Liste paginée & filtrée** : matière, semestre, type (CC/SN/SR), année, statut
- **Téléchargement** — incrémente compteur, renvoie URL publique Supabase Storage
- **Visualisation PDF** — modal intégrée (react-pdf / iframe)
- **Publication** — seul Admin/SuperAdmin peut créer/publier

### 📤 Contributions étudiants
- **Upload multipart** (PDF ≤ 15 Mo) → stockage direct Supabase Storage (bucket public `epreuves`)
- **Workflow** : `En attente` → **Approuver** (Admin) → crée Document publié + notifie l'étudiant
- **Refuser** — supprime le fichier du storage + notifie
- **Historique** — mes contributions avec statuts

### ⚙️ Administration
- **Dashboard** — stats globales (users, docs, contributions, logs)
- **Gestion utilisateurs** — CRUD complet, création compte Supabase + profil Prisma synchronisés
- **Matières** — CRUD (nom, semestre, description)
- **Activités / Audit logs** — traçabilité actions admin
- **Notifications** — temps réel (création, approbation, refus, nouveaux docs)

### 🗂 Stockage & Base de données
- **PostgreSQL local** (port 5432, rôle `revisio`) via Prisma ORM
- **Supabase Storage** bucket public `epreuves` — URLs permanentes `https://<ref>.supabase.co/storage/v1/object/public/epreuves/<uuid>-<nom>.pdf`
- **Migration possible** vers PostgreSQL hébergé Supabase en changeant `DATABASE_URL`

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Pages     │  │  Components │  │   Services  │  │   State   │  │
│  │ (Views)     │  │  (UI Kit)   │  │  (api.ts)   │  │ (Context) │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                          │                                           │
│                    fetch /api/* (JWT Bearer)                         │
└──────────────────────────│──────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express + TypeScript)                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │
│  │   Routes    │  │ Middlewares │  │  Services   │  │   Prisma  │  │
│  │ (REST API)  │  │ (auth,      │  │ (auth,      │  │  Client   │  │
│  │             │  │  rate-limit,│  │  storage,   │  │           │  │
│  │             │  │  validate)  │  │  activity)  │  │           │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬─────┘  │
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                          │                                           │
│         ┌────────────────┴────────────────┐                         │
│         ▼                                 ▼                         │
│  ┌─────────────────────┐         ┌─────────────────────┐          │
│  │  PostgreSQL (local) │         │    Supabase Auth    │          │
│  │  via Prisma ORM     │         │  (GoTrue, JWT ES256)│          │
│  │  Tables: users,     │         │  + Supabase Storage │          │
│  │  documents,         │         │  (bucket: epreuves) │          │
│  │  contributions, ... │         │                     │          │
│  └─────────────────────┘         └─────────────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

**Flux d'authentification**
```
Client                         Backend                        Supabase
  │                              │                                │
  ├─ POST /api/auth/login ──────►│                                │
  │                              ├─ signInWithPassword ─────────►│
  │                              │◄──────── {access_token,       │
  │                              │         refresh_token} ───────┤
  │◄──── {token, refreshToken,  │                                │
  │      user} ──────────────────┤                                │
  │                              │                                │
  ├─ GET /api/... (Bearer JWT)──►│                                │
  │                              ├─ verifyAccessToken (JWKS) ───►│  (fetch JWKS 1x, cache)
  │                              │◄──────── payload (sub, role) ──┤
  │◄──── 200 OK / 401 ───────────┤                                │
```

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js 20+** (LTS recommandé)
- **PostgreSQL 15+** local (ou Docker)
- **Compte Supabase** (gratuit) pour Auth + Storage

### 1. Cloner & installer
```bash
git clone <repo-url>
cd Revisio
npm install
# ou avec miroir npm plus rapide :
npm install --registry=https://registry.npmmirror.com --legacy-peer-deps
```

### 2. Base de données PostgreSQL locale
```bash
# Créer rôle & base (une seule fois)
psql -U postgres -c "CREATE ROLE revisio WITH LOGIN PASSWORD 'Revisio2026!';"
psql -U postgres -c "CREATE DATABASE revisio OWNER revisio;"
```

### 3. Projet Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Récupérer :
   - **Project URL** : `https://<ref>.supabase.co`
   - **anon key** (public)
   - **service_role key** (secret, backend only)
   - **JWT Secret** (Settings → API → JWT Secret)
3. Créer le bucket **public** `epreuves` (Storage → New bucket → Public)

### 4. Configuration `.env`
Copier `.env.example` → `.env` et remplir :
```env
# Base de données (PostgreSQL local)
DATABASE_URL="postgresql://revisio:Revisio2026!@localhost:5432/revisio?schema=public"

# Supabase
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
SUPABASE_JWT_SECRET="base64-jwt-secret-from-supabase"

# Serveur
PORT=3000
NODE_ENV=development

# SuperAdmin bootstrap — générer une clé aléatoire longue et ne jamais la publier
SUPERADMIN_MASTER_KEY="REMPLACER_PAR_UNE_CLE_ALEATOIRE_LONGUE_ET_PRIVEE"
```

### 5. Migrations & Seed
```bash
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed # développement local uniquement; efface les données avant de recréer les exemples
```
Crée trois comptes de démonstration avec des mots de passe aléatoires affichés une seule fois dans la console. Le seed efface les données avant de les recréer, et refuse de s'exécuter sur Vercel ou avec `NODE_ENV=production`. N'utilisez jamais ces comptes sur une instance publique.

### 6. Lancer
```bash
# Développement (Vite HMR + API)
npm run dev

# Production (build + serveur statique)
npm run build
npm start
```
Accéder à **http://localhost:3000**

---

## 📁 Structure du projet

```
Revisio/
├── prisma/
│   ├── schema.prisma          # Modèles Prisma (User, Document, Contribution, ...)
│   ├── migrations/            # Migrations SQL
│   └── seed.ts                # Seed complet (comptes, matières, docs, contributions)
├── server/
│   ├── config/
│   │   ├── env.ts             # Chargement & validation variables d'env
│   │   ├── superadmin.ts      # Master key SuperAdmin
│   │   └── upload.ts          # Multer config (memoryStorage, PDF ≤ 15 Mo)
│   ├── middlewares/
│   │   ├── authenticate.ts    # JWT verification (ES256 via JWKS + HS256 fallback)
│   │   ├── authorize.ts       # requireRole(...)
│   │   ├── rateLimit.ts       # express-rate-limit
│   │   └── validate.ts        # Zod validation
│   ├── routes/
│   │   ├── auth.ts            # /register, /login, /refresh, /me
│   │   ├── documents.ts       # CRUD épreuves + download
│   │   ├── contributions.ts   # Upload, list, approve/reject
│   │   ├── users.ts           # Profil, admin CRUD users
│   │   ├── stats.ts           # Dashboard stats
│   │   ├── matieres.ts        # CRUD matières
│   │   ├── activities.ts      # Audit logs
│   │   └── notifications.ts   # Notifications utilisateur
│   ├── services/
│   │   ├── auth.service.ts    # Supabase Auth wrapper + verifyAccessToken
│   │   ├── supabase.ts        # Client admin/anon + helpers storage
│   │   ├── activity.service.ts# Log activités
│   │   └── notification.service.ts
│   ├── utils/
│   │   ├── asyncHandler.ts
│   │   ├── errors.ts          # AppError, badRequest, unauthorized, notFound
│   │   ├── mappers.ts         # Prisma → API DTOs
│   │   └── pdf.ts
│   ├── prisma/client.ts       # PrismaClient singleton
│   └── app.ts                 # Express app factory
├── src/
│   ├── views/                 # Pages React (Home, Exams, Contribute, Admin*, Login, Register, Settings, ...)
│   ├── components/            # UI réutilisables (Navbar, DocumentCard, PdfViewerModal, ...)
│   ├── lib/api.ts             # Client fetch typé (intercepteur JWT auto-refresh)
│   ├── types.ts               # Types partagés (User, Document, Contribution, ...)
│   └── main.tsx               # Entry point
├── dist/                      # Build production (gitignored)
├── uploads/                   # Dossier temporaire multer (gitignored)
├── .env                       # Secrets locaux (gitignored)
├── .env.example               # Template
├── package.json
├── tsconfig.json
├── vite.config.ts
└── server.ts                  # Entry point serveur (dev: Vite middleware, prod: static)
```

---

## 🔧 Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Démarre serveur dev (Vite HMR + Express API) |
| `npm run build` | `vite build` + `esbuild` (bundle serveur CJS, packages externalisés) |
| `npm start` | Lance `dist/server.cjs` (mode production, `NODE_ENV=production`) |
| `npm run lint` | `tsc --noEmit` (type-check seulement) |
| `npm run prisma:generate` | Génère Prisma Client |
| `npm run prisma:migrate` | `prisma migrate dev` (création migration) |
| `npm run prisma:seed` | Exécute `server/prisma/seed.ts` |
| `npm run clean` | Supprime `dist/` |

---

## 🌐 API REST — Endpoints principaux

### Auth (`/api/auth`)
| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| POST | `/register` | Public | Inscription (nom, prénom, email, motDePasse, role?, masterKey?) |
| POST | `/login` | Public | Connexion (email, motDePasse, masterKey?) → `{token, refreshToken, user}` |
| POST | `/refresh` | Public | Refresh token → nouveaux tokens |
| GET | `/me` | Privé (JWT) | Profil utilisateur courant |

### Documents (`/api/documents`)
| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/` | Étudiant+ | Liste paginée/filtrée |
| GET | `/:id` | Étudiant+ | Détail épreuve |
| POST | `/:id/download` | Étudiant+ | Incrémente compteur, renvoie `{fichierUrl, fichierNom}` |
| POST | `/` | Admin+ | Créer épreuve (upload dataURL → storage) |
| PUT | `/:id` | Admin+ | Modifier |
| DELETE | `/:id` | Admin+ | Supprimer (cascade storage) |

### Contributions (`/api/contributions`)
| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| GET | `/my` | Étudiant+ | Mes contributions |
| GET | `/` | Admin+ | Toutes (filtre statut) |
| POST | `/` | Étudiant+ | Upload multipart (fichier PDF + métadonnées) |
| POST | `/:id/approve` | Admin+ | Approuver → crée Document + notifie |
| POST | `/:id/reject` | Admin+ | Refuser → supprime storage + notifie |

### Admin (`/api/users`, `/api/stats`, `/api/activities`, `/api/matieres`, `/api/notifications`)
- CRUD utilisateurs (création compte Supabase + profil)
- Stats dashboard
- Logs d'activité (audit)
- CRUD matières
- Notifications (lecture, marquer lu, supprimer)

---

## 🔐 Détails techniques clés

### Vérification JWT ES256 (Supabase)
- Supabase signe les access tokens en **ES256** (kid `5b3ba3a7-ecac-4be9-8ec4-fa66edfa96e7`)
- Backend récupère le **JWKS public** : `GET ${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- `createPublicKey({ key: jwk, format: "jwk" })` → PEM SPKI → `jwt.verify(token, pem, { algorithms: ["ES256"] })`
- **Fallback HS256** avec `SUPABASE_JWT_SECRET` si kid absent / alg HS256
- Cache JWKS en mémoire (promesse unique)

### Synchronisation Supabase ↔ Prisma
- `User.id` (Prisma) = `auth.users.id` (Supabase) — **PK partagée**
- Création user : `createSupabaseUser(email, pwd)` → retourne `authId` → `prisma.user.create({ id: authId, ... })`
- Suppression user : `deleteSupabaseUser(authId)` → `prisma.user.delete({ where: { id } })`
- Mise à jour email/mot de passe : `updateSupabaseEmail` / `updateSupabasePassword` + `prisma.user.update`

### Stockage PDF (Supabase Storage)
- Bucket public `epreuves`
- Nommage : `<uuid>-<sanitized-filename>.pdf`
- URL publique : `https://<ref>.supabase.co/storage/v1/object/public/epreuves/<path>`
- `resolvePdfUrl(fichierUrl, fichierNom)` — migre dataURL → storage si besoin
- Nettoyage auto : `deleteStorageFileByUrl(url)` appelé sur `DELETE /documents` et `REJECT contribution`

### Rate Limiting
- Auth endpoints : `authRateLimiter` (stricte)
- Download : `downloadRateLimiter`
- Global : `express-rate-limit` configurable

---

## 🧪 Tests & Qualité

```bash
# Type-check (zero erreur requis)
npm run lint

# Build production
npm run build

# Tests manuels E2E (curl) — exemples
# 1. Login étudiant
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"etudiant@isj.cm","motDePasse":"<mot_de_passe_genere_par_le_seed>"}'

# 2. Liste documents (avec token)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/documents

# 3. Upload contribution (multipart)
curl -X POST http://localhost:3000/api/contributions \
  -H "Authorization: Bearer <token>" \
  -F "matiere=Algorithmique" -F "semestre=Semestre 1" \
  -F "typeEpreuve=CC" -F "anneeAcademique=2025-2026" \
  -F "fichier=@epreuve.pdf;type=application/pdf"
```

---

## 🚢 Déploiement

### Option A — Serveur unique (VM / VPS)
1. PostgreSQL local sur la VM
2. `npm run build` → `npm start` (PM2 / systemd)
3. Reverse proxy Nginx (port 80/443 → 3000)
4. Variables d'env en prod (`.env` ou gestionnaire secrets)

### Option B — PostgreSQL hébergé (Supabase / Neon / Railway)
- Modifier `DATABASE_URL` vers l'URL managée
- Lancer `npx prisma migrate deploy` sur la nouvelle base
- Le reste inchangé (Supabase Auth/Storage déjà cloud)

### Option C — Docker (exemple)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

---

## 🛡 Sécurité

- **Helmet.js** — headers sécurisés (CSP, HSTS, etc.)
- **CORS** — origine front uniquement
- **Rate limiting** — auth, download, global
- **Validation Zod** — tous les inputs (body, query, params)
- **Mots de passe** — jamais stockés localement (Supabase Auth uniquement)
- **JWT** — vérification ES256 stricte, expiration courte (1h), refresh rotation
- **Master Key** — unique, stockée dans `.env`, jamais logguée
- **Upload** — memoryStorage, filtre MIME `application/pdf`, taille max 15 Mo

---

## 📝 Variables d'environnement complètes

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (local ou managé) |
| `SUPABASE_URL` | ✅ | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Clé publique (client frontend) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé admin (backend only, **jamais** côté client) |
| `SUPABASE_JWT_SECRET` | ✅ | Secret JWT Supabase (fallback HS256) |
| `PORT` | ❌ | Port serveur (défaut: 3000) |
| `NODE_ENV` | ❌ | `development` \| `production` |
| `SUPERADMIN_MASTER_KEY` | ✅ | Clé bootstrap SuperAdmin |

---

## 🤝 Contribution

1. Fork → branche `feature/xxx`
2. `npm run lint` + `npm run build` passent
3. Commit messages conventionnels (`feat:`, `fix:`, `chore:`, `docs:`)
4. PR → review → merge

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)

---

## 🙏 Remerciements

- **Supabase** — Auth + Storage gratuits et robustes
- **Prisma** — ORM type-safe pour PostgreSQL
- **React / Vite / Express** — Stack moderne et performante
- **Zod** — Validation schéma déclarative
- **jsonwebtoken** — Vérification JWT ES256/HS256

---

> **ISJ Revisio** — Développé pour l'Institut Supérieur de la Jeunesse.  
> Plateforme d'épreuves académique : simple, sécurisée, scalable.
