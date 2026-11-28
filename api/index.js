// server/app.ts
import express3 from "express";

// server/routes/auth.ts
import { Router } from "express";
import { z } from "zod";
import { timingSafeEqual as timingSafeEqual2 } from "crypto";

// server/prisma/client.ts
import { randomUUID as randomUUID2 } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// server/config/env.ts
import path from "path";
import { config as loadEnv } from "dotenv";
loadEnv({ path: path.join(process.cwd(), ".env") });
function envOrDefault(name, fallback) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}
if (!process.env.SUPERADMIN_MASTER_KEY) {
  process.env.SUPERADMIN_MASTER_KEY = "ISJ-SUPERADMIN-2026-KEY";
}
if (!process.env.RATE_LIMIT_ENABLED) {
  process.env.RATE_LIMIT_ENABLED = "false";
}
var useSupabaseDatabase = true;
var isMockSupabase = false;
function resolvePort() {
  const args = process.argv;
  const portFlagIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
  if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
    const parsed = Number(args[portFlagIndex + 1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3e3;
}
var env = {
  port: resolvePort(),
  databaseUrl: envOrDefault("DATABASE_URL", "postgresql://revisio:Revisio2026!@localhost:5432/revisio?schema=public"),
  // Nombre de sauts de proxy devant l'application (0 = accès direct).
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  supabase: {
    url: envOrDefault("SUPABASE_URL", "https://fmeuipgortpizaluiyuh.supabase.co"),
    anonKey: envOrDefault(
      "SUPABASE_ANON_KEY",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVpcGdvcnRwaXphbHVpeXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjcyMjgsImV4cCI6MjEwMTU0MzIyOH0.468GEGQlpMJxNrYBrb0BgdSqMYs9h6QC47fjeMKdoww"
    ),
    serviceRoleKey: envOrDefault(
      "SUPABASE_SERVICE_ROLE_KEY",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVpcGdvcnRwaXphbHVpeXVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2NzIyOCwiZXhwIjoyMTAxNTQzMjI4fQ.jTzMvw5-bw5y9eYnCsDdlsqFzuMw896B4mPgW4_BLjc"
    ),
    jwtSecret: envOrDefault(
      "SUPABASE_JWT_SECRET",
      "lTuRpsdwO2rhlX/mC1IDXfOLZiufrXA1TSQqWM3ArFkguXNrW7B3vP26hZbY8iPvJFjTkziW5b1uIBlvWOBH4Q=="
    )
  },
  smtp: {
    host: envOrDefault("SMTP_HOST", "smtp.gmail.com"),
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS?.trim() || "",
    from: envOrDefault("SMTP_FROM", "Revisio ISJ <noreply@saintjeaningenieur.org>")
  },
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim() || ""
  }
};

// server/services/supabase.ts
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

// server/utils/errors.ts
var AppError = class extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
};
var badRequest = (message, details) => new AppError(400, message, details);
var unauthorized = (message = "Non authentifi\xE9.") => new AppError(401, message);
var forbidden = (message = "Acc\xE8s refus\xE9 : privil\xE8ges insuffisants.") => new AppError(403, message);
var notFound = (message = "Ressource introuvable.") => new AppError(404, message);

// server/services/supabase.ts
var supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var supabaseAuth = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
var BUCKET = "epreuves";
var MAX_PDF_SIZE = 15 * 1024 * 1024;
var mockPdfStore = /* @__PURE__ */ new Map();
function makeSamplePdfBuffer(title, bodyLines) {
  const esc = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, " ").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const objects = [];
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`
  );
  const contentLines = [];
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
  objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>
stream
${stream}
endstream`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj
${obj}
endobj
`;
  });
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n 
`;
  }
  pdf += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefPos}
%%EOF
`;
  return Buffer.from(pdf, "latin1");
}
if (isMockSupabase) {
  const origFrom = supabaseAdmin.storage.from.bind(supabaseAdmin.storage);
  supabaseAdmin.storage.from = ((bucket) => {
    if (bucket === BUCKET) {
      return {
        upload: async (path6, fileBody) => {
          const buf = Buffer.isBuffer(fileBody) ? fileBody : Buffer.from(fileBody);
          mockPdfStore.set(path6, buf);
          return { data: { path: path6 }, error: null };
        },
        download: async (path6) => {
          let buf = mockPdfStore.get(path6);
          if (!buf) {
            buf = makeSamplePdfBuffer(path6.replace(/\.pdf$/i, ""), [
              "Sujet d'epreuve - Institut Universitaire Saint Jean",
              "Exercice 1 : Questions de cours et applications directes (5 pts)",
              "Exercice 2 : Probleme d'analyse et resolution (10 pts)",
              "Exercice 3 : Synthese et deduction (5 pts)"
            ]);
            mockPdfStore.set(path6, buf);
          }
          const blob = new Blob([new Uint8Array(buf)], { type: "application/pdf" });
          return { data: blob, error: null };
        },
        remove: async (paths) => {
          for (const p of paths) mockPdfStore.delete(p);
          return { data: [], error: null };
        }
      };
    }
    return origFrom(bucket);
  });
}
function isPdfMagic(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}
function isSupabaseStorageUrl(url) {
  try {
    const candidate = new URL(url);
    return candidate.origin === new URL(env.supabase.url).origin && candidate.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`);
  } catch {
    return false;
  }
}
function publicStorageUrl(path6) {
  return `${env.supabase.url}/storage/v1/object/public/${BUCKET}/${path6}`;
}
function sanitizeFilename(name) {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "epreuve.pdf";
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}
var bucketReady = false;
async function ensureBucket() {
  if (bucketReady || isMockSupabase) {
    bucketReady = true;
    return;
  }
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(500, `Impossible de v\xE9rifier le stockage des PDF : ${error.message}`);
  }
  if (error) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: `${MAX_PDF_SIZE}`,
      allowedMimeTypes: ["application/pdf"]
    });
    if (createError) {
      throw new AppError(500, `Impossible de cr\xE9er le bucket de stockage : ${createError.message}`);
    }
  } else if (!error) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET, { public: false });
    if (updateError) {
      throw new AppError(500, `Impossible de s\xE9curiser le stockage des PDF : ${updateError.message}`);
    }
  }
  bucketReady = true;
}
async function uploadPdfBuffer(buffer, originalName) {
  if (buffer.length === 0) {
    throw badRequest("Le fichier PDF est vide.");
  }
  if (buffer.length > MAX_PDF_SIZE) {
    throw badRequest("Le fichier est trop volumineux (maximum 15 Mo).");
  }
  if (!isPdfMagic(buffer)) {
    throw badRequest("Le fichier n'est pas un PDF valide (signature %PDF- absente).");
  }
  await ensureBucket();
  const path6 = `${randomUUID()}-${sanitizeFilename(originalName)}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path6, buffer, {
    contentType: "application/pdf",
    upsert: true
  });
  if (error) {
    throw new AppError(500, `\xC9chec de l'upload du fichier : ${error.message}`);
  }
  return publicStorageUrl(path6);
}
async function uploadPdfFromDataUrl(dataUrl, fileName) {
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw badRequest("Le fichier doit \xEAtre un PDF encod\xE9 en base64 (data:application/pdf;base64,...).");
  }
  if (match[1].length > Math.ceil(MAX_PDF_SIZE * 1.4) + 10) {
    throw badRequest("Le fichier est trop volumineux (maximum 15 Mo).");
  }
  const buffer = Buffer.from(match[1], "base64");
  return uploadPdfBuffer(buffer, fileName);
}
async function resolvePdfUrl(fichierUrl, fichierNom) {
  if (isSupabaseStorageUrl(fichierUrl)) return fichierUrl;
  if (/^data:application\/pdf;base64,/i.test(fichierUrl)) return uploadPdfFromDataUrl(fichierUrl, fichierNom);
  throw badRequest("URL de fichier invalide. Seul un PDF du stockage de la plateforme est accept\xE9.");
}
async function deleteStorageFileByUrl(url) {
  if (!isSupabaseStorageUrl(url)) return;
  const path6 = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path6) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path6]);
  if (error && !/not found/i.test(error.message)) {
    console.error("\xC9chec de la suppression du fichier du storage :", error.message);
  }
}

// server/prisma/client.ts
var MODEL_TO_TABLE = {
  user: "users",
  matiere: "matieres",
  document: "documents",
  contribution: "contributions",
  userActivity: "user_activities",
  userNotification: "user_notifications",
  notificationReceipt: "notification_receipts",
  auditLog: "audit_logs"
};
var DATE_FIELDS = /* @__PURE__ */ new Set([
  "createdAt",
  "updatedAt",
  "datePublication",
  "dateEnvoi",
  "timestamp",
  "date",
  "readAt",
  "deletedAt"
]);
function normalizeRow(model, row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (DATE_FIELDS.has(k) && typeof v === "string") {
      out[k] = new Date(v);
    }
  }
  if (model === "document" && out.visible === void 0) {
    out.visible = true;
  }
  return out;
}
function serializeForSupabase(model, data, supportedColumns) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === void 0) continue;
    if (supportedColumns && !supportedColumns.has(k)) continue;
    if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}
function createSupabaseBackedPrisma() {
  const memoryReceipts = [];
  let hasRemoteReceiptsTable = null;
  let documentHasVisibleColumn = null;
  const MODEL_ORDER_COLUMN = {
    user: { column: "createdAt", ascending: false },
    matiere: { column: "nom", ascending: true },
    document: { column: "createdAt", ascending: false },
    contribution: { column: "dateEnvoi", ascending: false },
    userActivity: { column: "timestamp", ascending: false },
    userNotification: { column: "createdAt", ascending: false },
    auditLog: { column: "date", ascending: false }
  };
  const PAGE_SIZE = 1e3;
  const MAX_FETCH_ROWS = 15e3;
  const CACHE_TTL_MS = 1500;
  const tableCache = /* @__PURE__ */ new Map();
  const inFlightFetches = /* @__PURE__ */ new Map();
  function invalidateModelCache(model) {
    tableCache.delete(model);
    inFlightFetches.delete(model);
  }
  async function fetchAllRowsFromTable(tableName, orderSpec) {
    const allRows = [];
    let offset = 0;
    while (offset < MAX_FETCH_ROWS) {
      let query = supabaseAdmin.from(tableName).select("*");
      if (orderSpec) {
        query = query.order(orderSpec.column, { ascending: orderSpec.ascending });
      }
      query = query.range(offset, offset + PAGE_SIZE - 1);
      const { data, error } = await query;
      if (error) {
        if (offset === 0 && orderSpec) {
          const fallback = await supabaseAdmin.from(tableName).select("*").range(0, PAGE_SIZE - 1);
          return { data: fallback.data, error: fallback.error };
        }
        return { data: allRows.length > 0 ? allRows : null, error };
      }
      const batch = data ?? [];
      allRows.push(...batch);
      if (batch.length < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
    return { data: allRows, error: null };
  }
  async function fetchTableUncached(model) {
    if (model === "notificationReceipt") {
      if (hasRemoteReceiptsTable === false) return memoryReceipts.map((r) => normalizeRow(model, r));
      const { data: data2, error: error2 } = await fetchAllRowsFromTable("notification_receipts");
      if (error2) {
        hasRemoteReceiptsTable = false;
        return memoryReceipts.map((r) => normalizeRow(model, r));
      }
      hasRemoteReceiptsTable = true;
      return (data2 ?? []).map((r) => normalizeRow(model, r));
    }
    const table = MODEL_TO_TABLE[model];
    if (!table) return [];
    const { data, error } = await fetchAllRowsFromTable(table, MODEL_ORDER_COLUMN[model]);
    if (error) {
      console.error(`Erreur Supabase lecture ${table}:`, error.message);
      return [];
    }
    if (model === "document" && data && data.length > 0 && documentHasVisibleColumn === null) {
      documentHasVisibleColumn = "visible" in data[0];
    }
    return (data ?? []).map((r) => normalizeRow(model, r));
  }
  async function fetchTable(model) {
    const now = Date.now();
    const cached = tableCache.get(model);
    if (cached && cached.expiresAt > now) {
      return cached.rows;
    }
    const existingPromise = inFlightFetches.get(model);
    if (existingPromise) {
      return existingPromise;
    }
    const fetchPromise = fetchTableUncached(model).then((rows) => {
      tableCache.set(model, { rows, expiresAt: Date.now() + CACHE_TTL_MS });
      inFlightFetches.delete(model);
      return rows;
    }).catch((err) => {
      inFlightFetches.delete(model);
      throw err;
    });
    inFlightFetches.set(model, fetchPromise);
    return fetchPromise;
  }
  const toComparableValue = (v) => {
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string") {
      const parsed = Date.parse(v);
      if (!Number.isNaN(parsed) && /^\d{4}-\d{2}-\d{2}/.test(v)) return parsed;
    }
    return v;
  };
  const matchesCondition = (val, cond, item, key, matieresMap) => {
    if (cond === void 0) return true;
    if (cond === null || typeof cond !== "object" || cond instanceof Date) {
      if (cond instanceof Date && val instanceof Date) return val.getTime() === cond.getTime();
      if (key === "email" && typeof val === "string" && typeof cond === "string") {
        return val.trim().toLowerCase() === cond.trim().toLowerCase();
      }
      return val === cond;
    }
    if ("equals" in cond) {
      if (cond.mode === "insensitive" && typeof val === "string" && typeof cond.equals === "string") {
        return val.toLowerCase() === cond.equals.toLowerCase();
      }
      return val === cond.equals;
    }
    if ("contains" in cond) {
      if (typeof val !== "string") return false;
      const target = String(cond.contains);
      return cond.mode === "insensitive" ? val.toLowerCase().includes(target.toLowerCase()) : val.includes(target);
    }
    if ("in" in cond && Array.isArray(cond.in)) {
      const inMatch = cond.in.includes(val);
      if ("not" in cond) return inMatch && val !== cond.not;
      return inMatch;
    }
    if ("gte" in cond || "gt" in cond || "lte" in cond || "lt" in cond) {
      if (val === null || val === void 0) return false;
      const actual = toComparableValue(val);
      if ("gte" in cond && cond.gte !== void 0 && actual < toComparableValue(cond.gte)) return false;
      if ("gt" in cond && cond.gt !== void 0 && actual <= toComparableValue(cond.gt)) return false;
      if ("lte" in cond && cond.lte !== void 0 && actual > toComparableValue(cond.lte)) return false;
      if ("lt" in cond && cond.lt !== void 0 && actual >= toComparableValue(cond.lt)) return false;
      return true;
    }
    if ("not" in cond) {
      return val !== cond.not;
    }
    if (key === "matiere") {
      const m = matieresMap.get(item.matiereId);
      if (!m) return false;
      return matchesWhere(m, cond, matieresMap);
    }
    return true;
  };
  const matchesWhere = (item, where, matieresMap) => {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === void 0) continue;
      if (key === "OR" && Array.isArray(cond)) {
        if (!cond.some((sub) => matchesWhere(item, sub, matieresMap))) return false;
        continue;
      }
      if (key === "AND" && Array.isArray(cond)) {
        if (!cond.every((sub) => matchesWhere(item, sub, matieresMap))) return false;
        continue;
      }
      if (key === "userId_notificationId" && typeof cond === "object" && cond !== null) {
        const c = cond;
        if (item.userId !== c.userId || item.notificationId !== c.notificationId) return false;
        continue;
      }
      if (!matchesCondition(item[key], cond, item, key, matieresMap)) return false;
    }
    return true;
  };
  const sortRows = (rows, orderBy) => {
    if (!orderBy) return rows;
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const ord of orders) {
        const [field, dir] = Object.entries(ord)[0];
        const va = a[field] instanceof Date ? a[field].getTime() : a[field];
        const vb = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (va === vb) continue;
        const cmp = va > vb ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  };
  async function resolveRelations(model, rows, include) {
    if (!rows.length) return rows;
    if (model === "document") {
      const matieres = await fetchTable("matiere");
      const matMap = new Map(matieres.map((m) => [m.id, m]));
      return rows.map((r) => ({
        ...r,
        matiere: matMap.get(r.matiereId) ?? r.matiere
      }));
    }
    if (model === "contribution" && include?.document) {
      const docs = await fetchTable("document");
      const docByContrib = new Map(docs.filter((d) => d.contributionId).map((d) => [d.contributionId, d]));
      return rows.map((r) => ({
        ...r,
        document: docByContrib.get(r.id) ?? null
      }));
    }
    return rows;
  }
  async function getMatieresMap(model, where) {
    if (model === "document" && where && (where.matiere || where.OR || where.AND)) {
      const matieres = await fetchTable("matiere");
      return new Map(matieres.map((m) => [m.id, m]));
    }
    return /* @__PURE__ */ new Map();
  }
  const makeDelegate = (model) => ({
    findMany: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      let list = store.filter((item) => matchesWhere(item, args?.where, matMap));
      list = sortRows(list, args?.orderBy);
      if (typeof args?.skip === "number") list = list.slice(args.skip);
      if (typeof args?.take === "number") list = list.slice(0, args.take);
      return resolveRelations(model, list, args?.include);
    },
    findFirst: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const list = sortRows(
        store.filter((item) => matchesWhere(item, args?.where, matMap)),
        args?.orderBy
      );
      if (!list[0]) return null;
      const [withRel] = await resolveRelations(model, [list[0]], args?.include);
      return withRel;
    },
    findUnique: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const item = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!item) return null;
      const [withRel] = await resolveRelations(model, [item], args?.include);
      return withRel;
    },
    count: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      return store.filter((item) => matchesWhere(item, args?.where, matMap)).length;
    },
    groupBy: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const filtered = store.filter((item) => matchesWhere(item, args?.where, matMap));
      const byField = Array.isArray(args?.by) ? args.by[0] : args?.by;
      const groups = /* @__PURE__ */ new Map();
      for (const item of filtered) {
        const key = item[byField];
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
      return Array.from(groups.entries()).map(([key, cnt]) => ({
        [byField]: key,
        _count: { _all: cnt }
      }));
    },
    create: async (args) => {
      const ts = /* @__PURE__ */ new Date();
      const record = {
        id: args.data?.id ?? randomUUID2(),
        ...args.data
      };
      if (model === "user") {
        record.role = record.role ?? "Etudiant";
        record.telephone = record.telephone ?? null;
        record.createdAt = record.createdAt ?? ts;
        record.updatedAt = record.updatedAt ?? ts;
      } else if (model === "document") {
        record.statut = record.statut ?? "Publie";
        record.visible = record.visible ?? true;
        record.telechargementsCount = record.telechargementsCount ?? 0;
        record.createdAt = record.createdAt ?? ts;
        record.updatedAt = record.updatedAt ?? ts;
      } else if (model === "contribution") {
        record.statut = record.statut ?? "En_attente";
        record.dateEnvoi = record.dateEnvoi ?? ts;
      } else if (model === "userActivity") {
        record.timestamp = record.timestamp ?? ts;
      } else if (model === "userNotification") {
        record.type = record.type ?? "info";
        record.lue = record.lue ?? false;
        record.createdAt = record.createdAt ?? ts;
      } else if (model === "auditLog") {
        record.date = record.date ?? ts;
      }
      if (model === "notificationReceipt" && hasRemoteReceiptsTable === false) {
        memoryReceipts.push(record);
        return normalizeRow(model, record);
      }
      const table = MODEL_TO_TABLE[model];
      const payload = serializeForSupabase(model, record);
      if (model === "document" && documentHasVisibleColumn === false) {
        delete payload.visible;
      }
      const { data, error } = await supabaseAdmin.from(table).insert(payload).select("*").single();
      invalidateModelCache(model);
      if (error) {
        if (model === "document" && /visible/i.test(error.message)) {
          documentHasVisibleColumn = false;
          delete payload.visible;
          const retry = await supabaseAdmin.from(table).insert(payload).select("*").single();
          invalidateModelCache(model);
          if (!retry.error && retry.data) {
            const [res2] = await resolveRelations(model, [normalizeRow(model, { ...retry.data, visible: record.visible })], args?.include);
            return res2;
          }
        }
        throw new Error(`Erreur insertion ${table}: ${error.message}`);
      }
      const [res] = await resolveRelations(model, [normalizeRow(model, data ?? record)], args?.include);
      return res;
    },
    update: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const current = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!current) throw new Error(`${model} introuvable.`);
      const updates = {};
      for (const [k, v] of Object.entries(args.data ?? {})) {
        if (v && typeof v === "object" && "increment" in v) {
          updates[k] = (Number(current[k]) || 0) + Number(v.increment);
        } else if (v !== void 0) {
          updates[k] = v;
        }
      }
      if ("updatedAt" in current) {
        updates.updatedAt = /* @__PURE__ */ new Date();
      }
      const table = MODEL_TO_TABLE[model];
      const payload = serializeForSupabase(model, updates);
      if (model === "document" && documentHasVisibleColumn === false) {
        delete payload.visible;
      }
      const { data, error } = await supabaseAdmin.from(table).update(payload).eq("id", current.id).select("*").single();
      invalidateModelCache(model);
      if (error) {
        if (model === "document" && /visible/i.test(error.message)) {
          documentHasVisibleColumn = false;
          delete payload.visible;
          if (Object.keys(payload).length > 0) {
            await supabaseAdmin.from(table).update(payload).eq("id", current.id);
            invalidateModelCache(model);
          }
          const [res2] = await resolveRelations(model, [normalizeRow(model, { ...current, ...updates })], args?.include);
          return res2;
        }
        throw new Error(`Erreur mise \xE0 jour ${table}: ${error.message}`);
      }
      const [res] = await resolveRelations(model, [normalizeRow(model, data ?? { ...current, ...updates })], args?.include);
      return res;
    },
    updateMany: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const targets = store.filter((x) => matchesWhere(x, args?.where, matMap));
      if (!targets.length) return { count: 0 };
      const table = MODEL_TO_TABLE[model];
      const payload = serializeForSupabase(model, args.data ?? {});
      const ids = targets.map((t) => t.id).filter(Boolean);
      if (ids.length) {
        await supabaseAdmin.from(table).update(payload).in("id", ids);
        invalidateModelCache(model);
      }
      return { count: targets.length };
    },
    upsert: async (args) => {
      if (model === "notificationReceipt") {
        await fetchTable(model);
        if (hasRemoteReceiptsTable === false) {
          const idx = memoryReceipts.findIndex((x) => matchesWhere(x, args?.where, /* @__PURE__ */ new Map()));
          if (idx !== -1) {
            memoryReceipts[idx] = { ...memoryReceipts[idx], ...args.update };
            return normalizeRow(model, memoryReceipts[idx]);
          }
          const created = { ...args.create };
          memoryReceipts.push(created);
          return normalizeRow(model, created);
        }
        const payload = serializeForSupabase(model, { ...args.create, ...args.update });
        const { data } = await supabaseAdmin.from("notification_receipts").upsert(payload).select("*").single();
        invalidateModelCache(model);
        return normalizeRow(model, data ?? payload);
      }
      const existing = await makeDelegate(model).findUnique({ where: args.where });
      if (existing) {
        return makeDelegate(model).update({ where: args.where, data: args.update });
      }
      return makeDelegate(model).create({ data: args.create });
    },
    delete: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const target = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!target) return null;
      const table = MODEL_TO_TABLE[model];
      await supabaseAdmin.from(table).delete().eq("id", target.id);
      invalidateModelCache(model);
      return target;
    },
    deleteMany: async (args) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where)
      ]);
      const targets = store.filter((x) => matchesWhere(x, args?.where, matMap));
      if (!targets.length) return { count: 0 };
      const table = MODEL_TO_TABLE[model];
      const ids = targets.map((t) => t.id).filter(Boolean);
      if (ids.length) {
        await supabaseAdmin.from(table).delete().in("id", ids);
        invalidateModelCache(model);
      }
      return { count: targets.length };
    }
  });
  const stripAccents2 = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const client = {
    user: makeDelegate("user"),
    matiere: makeDelegate("matiere"),
    document: makeDelegate("document"),
    contribution: makeDelegate("contribution"),
    userActivity: makeDelegate("userActivity"),
    userNotification: makeDelegate("userNotification"),
    notificationReceipt: makeDelegate("notificationReceipt"),
    auditLog: makeDelegate("auditLog"),
    $transaction: async (arg) => {
      if (typeof arg === "function") {
        return arg(client);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return [];
    },
    $executeRawUnsafe: async () => 0,
    $queryRaw: async () => [],
    $queryRawUnsafe: async (sql, ...values) => {
      const isCount = /SELECT\s+COUNT/i.test(sql);
      const [documents, matieres] = await Promise.all([
        fetchTable("document"),
        fetchTable("matiere")
      ]);
      const matMap = new Map(matieres.map((m) => [m.id, m]));
      let rows = documents.map((d) => {
        const m = matMap.get(d.matiereId);
        return {
          ...d,
          matiereNom: m?.nom ?? "",
          score: 1
        };
      });
      const isSuggest = /LIMIT\s+\$2/i.test(sql) && values.length === 2 && typeof values[0] === "string" && typeof values[1] === "number";
      if (isSuggest) {
        const q = stripAccents2(String(values[0]).replace(/^%|%$/g, "").toLowerCase());
        rows = rows.filter(
          (r) => r.visible !== false && r.statut === "Publie" && (stripAccents2(r.titre.toLowerCase()).includes(q) || stripAccents2(r.matiereNom.toLowerCase()).includes(q) || stripAccents2(r.anneeAcademique.toLowerCase()).includes(q))
        );
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows.slice(0, Number(values[1]));
      }
      const targetStatut = typeof values[0] === "string" ? values[0] : "Publie";
      rows = rows.filter((r) => r.visible !== false && r.statut === targetStatut);
      for (let i = 1; i < values.length; i++) {
        const val = values[i];
        if (typeof val === "string") {
          if (val.startsWith("%") && val.endsWith("%")) {
            const q = stripAccents2(val.slice(1, -1).toLowerCase());
            rows = rows.filter(
              (r) => stripAccents2(r.titre.toLowerCase()).includes(q) || stripAccents2(r.matiereNom.toLowerCase()).includes(q) || stripAccents2(r.anneeAcademique.toLowerCase()).includes(q)
            );
          } else if (val === "Semestre_1" || val === "Semestre_2") {
            rows = rows.filter((r) => r.semestre === val);
          } else if (["CC", "SN", "SR", "TD", "TP", "Cours"].includes(val)) {
            rows = rows.filter((r) => r.typeEpreuve === val);
          } else if (/^\d{4}-\d{4}$/.test(val)) {
            rows = rows.filter((r) => r.anneeAcademique === val);
          } else if (matieres.some((m) => m.nom === val)) {
            rows = rows.filter((r) => r.matiereNom === val);
          }
        }
      }
      rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      if (isCount) {
        return [{ total: rows.length }];
      }
      const nums = values.filter((v) => typeof v === "number");
      if (nums.length >= 2) {
        const [limit, offset] = nums.slice(-2);
        return rows.slice(offset, offset + limit);
      } else if (nums.length === 1) {
        return rows.slice(0, nums[0]);
      }
      return rows;
    },
    $disconnect: async () => {
    }
  };
  return client;
}
function initPrisma() {
  if (useSupabaseDatabase) {
    console.log("\u{1F517} Connexion directe \xE0 la base de donn\xE9es Supabase (utilisateurs, mati\xE8res, \xE9preuves et journaux existants)...");
    return createSupabaseBackedPrisma();
  }
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn"]
  });
}
var prisma = initPrisma();

// server/utils/asyncHandler.ts
var asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// server/utils/mappers.ts
var semestreToDb = (s) => s === "Semestre 2" ? "Semestre_2" : "Semestre_1";
var semestreFromDb = (s) => s === "Semestre_2" ? "Semestre 2" : "Semestre 1";
var statutToDb = (s) => s === "Publi\xE9" ? "Publie" : s === "Refus\xE9" ? "Refuse" : "En_attente";
var statutFromDb = (s) => s === "Publie" ? "Publi\xE9" : s === "Refuse" ? "Refus\xE9" : "En attente";
var mapUser = (u) => ({
  id: u.id,
  nom: u.nom,
  prenom: u.prenom,
  email: u.email,
  telephone: u.telephone ?? null,
  role: u.role,
  dateCreation: u.createdAt.toISOString()
});
var mapDocument = (d) => ({
  id: d.id,
  titre: d.titre,
  matiere: d.matiere?.nom ?? d.matiereId,
  matiereId: d.matiereId,
  semestre: semestreFromDb(d.semestre),
  typeEpreuve: d.typeEpreuve,
  anneeAcademique: d.anneeAcademique,
  // Keep private storage paths out of API responses; serve PDFs only through
  // authenticated preview and download routes.
  fichierUrl: "",
  fichierNom: d.fichierNom,
  statut: statutFromDb(d.statut),
  visible: d.visible,
  datePublication: d.datePublication ? d.datePublication.toISOString() : void 0,
  dateAjout: d.createdAt.toISOString(),
  telechargementsCount: d.telechargementsCount,
  contributionId: d.contributionId ?? void 0
});
var mapContribution = (c) => ({
  id: c.id,
  utilisateurId: c.utilisateurId,
  utilisateurNom: c.utilisateurNom,
  utilisateurEmail: c.utilisateurEmail,
  anneeAcademique: c.anneeAcademique,
  matiere: c.matiere,
  semestre: semestreFromDb(c.semestre),
  typeEpreuve: c.typeEpreuve,
  titre: c.titre ?? void 0,
  commentaire: c.commentaire ?? void 0,
  fichierUrl: "",
  fichierNom: c.fichierNom,
  statut: statutFromDb(c.statut),
  dateEnvoi: c.dateEnvoi.toISOString()
});
var mapMatiere = (m, countDocs) => ({
  id: m.id,
  nom: m.nom,
  code: m.code,
  semestre: semestreFromDb(m.semestre),
  description: m.description ?? "",
  countDocs
});
var mapActivity = (a) => ({
  id: a.id,
  userId: a.userId,
  userNom: a.userNom,
  userEmail: a.userEmail,
  userRole: a.userRole,
  actionType: a.actionType,
  description: a.description,
  targetId: a.targetId ?? void 0,
  targetTitle: a.targetTitle ?? void 0,
  timestamp: a.timestamp.toISOString()
});
var mapNotification = (n) => ({
  id: n.id,
  userId: n.userId,
  titre: n.titre,
  message: n.message,
  type: n.type,
  lue: n.lue,
  date: n.createdAt.toISOString(),
  linkTab: n.linkTab ?? void 0
});
var mapAuditLog = (a) => ({
  id: a.id,
  adminId: a.adminId,
  adminNom: a.adminNom,
  adminEmail: a.adminEmail,
  action: a.action,
  details: a.details,
  targetId: a.targetId ?? void 0,
  targetName: a.targetName ?? void 0,
  date: a.date.toISOString()
});

// server/services/auth.service.ts
import { createPublicKey, randomUUID as randomUUID3 } from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
var MOCK_USERS_IDS = {
  superadmin: "00000000-0000-4000-8000-000000000001",
  admin: "00000000-0000-4000-8000-000000000002",
  etudiant: "00000000-0000-4000-8000-000000000003"
};
var mockAuthUsers = /* @__PURE__ */ new Map([
  [
    MOCK_USERS_IDS.superadmin,
    {
      id: MOCK_USERS_IDS.superadmin,
      email: "superadmin@isj.cm",
      password: "Password123!",
      phone: "+237699000001"
    }
  ],
  [
    MOCK_USERS_IDS.admin,
    {
      id: MOCK_USERS_IDS.admin,
      email: "admin@isj.cm",
      password: "Password123!",
      phone: "+237699000002"
    }
  ],
  [
    MOCK_USERS_IDS.etudiant,
    {
      id: MOCK_USERS_IDS.etudiant,
      email: "etudiant@isj.cm",
      password: "Password123!",
      phone: "+237699000003"
    }
  ]
]);
function issueMockSession(userId) {
  const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
  const accessToken = jwt.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "7d" }
  );
  const refreshToken = jwt.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer,
      type: "refresh"
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "30d" }
  );
  return { userId, accessToken, refreshToken };
}
var jwksPromise = null;
async function getJwksPems() {
  if (!jwksPromise) {
    jwksPromise = (async () => {
      const res = await fetch(`${env.supabase.url}/auth/v1/.well-known/jwks.json`);
      if (!res.ok) throw new Error(`R\xE9cup\xE9ration de la cl\xE9 JWKS impossible (${res.status}).`);
      const data = await res.json();
      const pems = {};
      for (const key of data.keys) {
        const kid = key.kid ?? "default";
        pems[kid] = createPublicKey({ key, format: "jwk" }).export({
          type: "spki",
          format: "pem"
        });
      }
      return pems;
    })();
  }
  return jwksPromise;
}
async function verifyAccessToken(token) {
  try {
    const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
    const verifyClaims = (payload2) => {
      const audiences = Array.isArray(payload2.aud) ? payload2.aud : [payload2.aud];
      if (!payload2.sub || payload2.role !== "authenticated" || !audiences.includes("authenticated")) {
        throw new Error("Claims de session invalides");
      }
      return {
        userId: payload2.sub,
        role: payload2.role,
        tokenType: "access",
        sessionId: payload2.sid,
        deviceId: payload2.did
      };
    };
    const header = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
    if (header.alg === "HS256") {
      const payload2 = jwt.verify(token, env.supabase.jwtSecret, { algorithms: ["HS256"], issuer });
      return verifyClaims(payload2);
    }
    const pems = await getJwksPems();
    const key = header.kid ? pems[header.kid] : Object.values(pems)[0];
    if (!key) throw new Error("cl\xE9 JWKS introuvable");
    const payload = jwt.verify(token, key, { algorithms: ["ES256"], issuer });
    return verifyClaims(payload);
  } catch {
    throw new AppError(401, "Session expir\xE9e ou invalide.");
  }
}
async function signInSupabase(email, password) {
  const normalized = email.trim().toLowerCase();
  const trimmedPassword = password.trim();
  if (isMockSupabase) {
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (!found || found.password !== password && found.password !== trimmedPassword) {
      throw unauthorized("E-mail ou mot de passe incorrect.");
    }
    return issueMockSession(found.id);
  }
  let { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: normalized,
    password
  });
  if (error && password !== trimmedPassword && trimmedPassword.length > 0) {
    const retry = await supabaseAuth.auth.signInWithPassword({
      email: normalized,
      password: trimmedPassword
    });
    if (!retry.error && retry.data.session && retry.data.user) {
      data = retry.data;
      error = null;
    }
  }
  if (error && /email.*not.*confirm/i.test(error.message)) {
    const existingAuthUser = await findSupabaseUserByEmail(normalized);
    if (existingAuthUser) {
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, { email_confirm: true });
      const retry = await supabaseAuth.auth.signInWithPassword({
        email: normalized,
        password: trimmedPassword || password
      });
      if (!retry.error && retry.data.session && retry.data.user) {
        data = retry.data;
        error = null;
      }
    }
  }
  if (error || !data?.session || !data?.user) {
    if (error && /rate limit|too many requests/i.test(error.message)) {
      throw new AppError(429, "Trop de tentatives de connexion aupr\xE8s du service d'authentification. Veuillez patienter une minute.");
    }
    throw unauthorized("E-mail ou mot de passe incorrect.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  };
}
async function findSupabaseUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (isMockSupabase) {
    const found = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    return found ? { id: found.id, email: found.email } : null;
  }
  let page = 1;
  const perPage = 200;
  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const user = users.find((u) => u.email?.toLowerCase() === normalized);
    if (user) {
      return { id: user.id, email: user.email };
    }
    if (users.length < perPage || !data?.nextPage) {
      break;
    }
    page += 1;
  }
  return null;
}
async function createSupabaseUser(email, password, phone, reuseExistingAuthUser = false, customId) {
  const normalized = email.trim().toLowerCase();
  const trimmedPassword = password.trim();
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : void 0;
  if (isMockSupabase) {
    const existing = Array.from(mockAuthUsers.values()).find((u) => u.email.toLowerCase() === normalized);
    if (existing) {
      if (reuseExistingAuthUser) {
        existing.password = trimmedPassword;
        if (normalizedPhone) existing.phone = normalizedPhone;
        return existing.id;
      }
      throw new AppError(409, "Cette adresse e-mail est d\xE9j\xE0 li\xE9e \xE0 un compte d'authentification.");
    }
    const id = customId || randomUUID3();
    mockAuthUsers.set(id, { id, email: normalized, password: trimmedPassword, phone: normalizedPhone || null });
    return id;
  }
  let { data, error } = await supabaseAdmin.auth.admin.createUser({
    id: customId || void 0,
    email: normalized,
    password: trimmedPassword,
    phone: normalizedPhone || void 0,
    phone_confirm: !!normalizedPhone,
    email_confirm: true,
    user_metadata: normalizedPhone ? { telephone: normalizedPhone } : void 0
  });
  if (error && normalizedPhone && /phone/i.test(error.message)) {
    const retryWithoutPhone = await supabaseAdmin.auth.admin.createUser({
      id: customId || void 0,
      email: normalized,
      password: trimmedPassword,
      email_confirm: true,
      user_metadata: { telephone: normalizedPhone }
    });
    data = retryWithoutPhone.data;
    error = retryWithoutPhone.error;
  }
  if (error && customId && /duplicate key|already exists|id/i.test(error.message) && !/email/i.test(error.message)) {
    const retryWithoutCustomId = await supabaseAdmin.auth.admin.createUser({
      email: normalized,
      password: trimmedPassword,
      email_confirm: true,
      user_metadata: normalizedPhone ? { telephone: normalizedPhone } : void 0
    });
    data = retryWithoutCustomId.data;
    error = retryWithoutCustomId.error;
  }
  if (error) {
    if (/already (been )?registered|email.*exists/i.test(error.message) && !/phone/i.test(error.message)) {
      const existing = await findSupabaseUserByEmail(normalized);
      if (existing && reuseExistingAuthUser) {
        await supabaseAdmin.auth.admin.updateUserById(existing.id, {
          password: trimmedPassword,
          email_confirm: true
        }).catch(() => void 0);
        return existing.id;
      }
      throw new AppError(409, "Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e. Veuillez vous connecter avec votre mot de passe.");
    }
    throw new AppError(400, `Impossible de cr\xE9er le compte : ${error.message}`);
  }
  if (!data?.user) throw new AppError(500, "Compte cr\xE9\xE9 mais sans identifiant retourn\xE9.");
  return data.user.id;
}
async function refreshSupabaseSession(refreshToken) {
  if (isMockSupabase) {
    try {
      const payload = jwt.verify(refreshToken, env.supabase.jwtSecret);
      if (!payload.sub || !mockAuthUsers.has(payload.sub)) {
        throw new Error("Invalid user");
      }
      return issueMockSession(payload.sub);
    } catch {
      throw new AppError(401, "Refresh token invalide ou expir\xE9.");
    }
  }
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) {
    throw new AppError(401, "Refresh token invalide ou expir\xE9.");
  }
  return {
    userId: data.user.id,
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token
  };
}
async function revokeSupabaseSession(accessToken) {
  if (!accessToken) throw new AppError(400, "Token de session manquant.");
  if (isMockSupabase) return;
  const res = await fetch(`${env.supabase.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: env.supabase.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  });
  if (!res.ok) throw new AppError(500, "R\xE9vocation de la session Supabase impossible.");
}
async function updateSupabaseEmail(userId, email) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.email = email.trim().toLowerCase();
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
  if (error) throw new AppError(400, `Impossible de modifier l'e-mail : ${error.message}`);
}
async function updateSupabasePassword(userId, password) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.password = password;
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
  if (error) throw new AppError(400, `Impossible de modifier le mot de passe : ${error.message}`);
}
async function updateSupabasePhone(userId, phone) {
  if (isMockSupabase) {
    const u = mockAuthUsers.get(userId);
    if (u) u.phone = phone;
    return;
  }
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : void 0;
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    phone: normalizedPhone || void 0,
    phone_confirm: !!normalizedPhone
  });
  if (error) {
    if (/phone/i.test(error.message)) {
      const existing = await supabaseAdmin.auth.admin.getUserById(userId).catch(() => null);
      const currentMeta = existing?.data?.user?.user_metadata || {};
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: { ...currentMeta, telephone: normalizedPhone || null }
      }).catch(() => void 0);
      return;
    }
    throw new AppError(400, `Impossible de modifier le num\xE9ro de t\xE9l\xE9phone : ${error.message}`);
  }
}
async function deleteSupabaseUser(userId) {
  if (isMockSupabase) {
    mockAuthUsers.delete(userId);
    return;
  }
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(400, `Impossible de supprimer le compte : ${error.message}`);
  }
}
var pendingResetCodes = /* @__PURE__ */ new Map();
function normalizePhoneNumber(raw) {
  const digits = raw.replace(/[^\d+]/g, "");
  const onlyDigits = digits.replace(/\D/g, "");
  if (!onlyDigits) return "";
  if (onlyDigits.length === 9 && /^[26]/.test(onlyDigits)) {
    return `+237${onlyDigits}`;
  }
  if (onlyDigits.startsWith("237") && onlyDigits.length === 12) {
    return `+${onlyDigits}`;
  }
  return digits.startsWith("+") ? digits : `+${onlyDigits}`;
}
function buildDirectResetEmailHtml(code) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
      <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px;">R\xE9initialisation de votre mot de passe \u2022 Revisio ISJ</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        Voici votre code de v\xE9rification \xE0 usage unique. Saisissez directement ce code sur la page de connexion Revisio pour d\xE9finir votre nouveau mot de passe :
      </p>
      <div style="text-align: center; margin: 24px 0; padding: 18px; background-color: #1e293b; border: 2px solid #f59e0b; border-radius: 12px;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #fbbf24;">${code}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 20px;">
        Ce code est valide pendant 15 minutes. Aucun lien externe n'est requis : restez sur la page de connexion Revisio et entrez simplement ce code.
      </p>
    </div>
  `;
}
async function sendDirectCodeEmail(to, code) {
  const subject = `${code} est votre code de v\xE9rification Revisio ISJ`;
  const html = buildDirectResetEmailHtml(code);
  const text = `Votre code de v\xE9rification Revisio ISJ est : ${code} (valide 15 minutes). Saisissez ce code directement sur la page de connexion.`;
  if (env.smtp.user && env.smtp.pass) {
    try {
      const transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: env.smtp.port === 465,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass
        }
      });
      await transporter.sendMail({
        from: env.smtp.from || env.smtp.user,
        to,
        subject,
        text,
        html
      });
      return true;
    } catch (err) {
      console.warn(`Erreur d'envoi SMTP direct (${err?.message || err}).`);
    }
  }
  if (env.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.smtp.from || "Revisio ISJ <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
          text
        })
      });
      if (res.ok) return true;
    } catch (err) {
      console.warn(`Erreur d'envoi Resend direct (${err?.message || err}).`);
    }
  }
  return false;
}
async function sendDirectSmsCode(toPhone, code) {
  if (env.twilio.accountSid && env.twilio.authToken && env.twilio.phoneNumber) {
    try {
      const credentials = Buffer.from(`${env.twilio.accountSid}:${env.twilio.authToken}`).toString("base64");
      const body = new URLSearchParams({
        To: toPhone,
        From: env.twilio.phoneNumber,
        Body: `Revisio ISJ : Votre code de r\xE9initialisation de mot de passe est ${code} (valide 15 min).`
      });
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.twilio.accountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: body.toString()
        }
      );
      if (res.ok) return true;
      const errData = await res.json().catch(() => ({}));
      console.warn(`Erreur d'envoi SMS Twilio (${res.status}: ${errData?.message || ""}).`);
    } catch (err) {
      console.warn(`Erreur d'envoi SMS Twilio direct (${err?.message || err}).`);
    }
  }
  return false;
}
async function requestPasswordResetCode(email, userId) {
  const normalized = email.trim().toLowerCase();
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  const expiresAt = Date.now() + 15 * 60 * 1e3;
  pendingResetCodes.set(normalized, {
    userId,
    email: normalized,
    code,
    expiresAt,
    attempts: 0
  });
  const sentDirectly = await sendDirectCodeEmail(normalized, code);
  if (sentDirectly) {
    return { sentByEmail: true };
  }
  if (!isMockSupabase) {
    try {
      const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
      const tempToken = jwt.sign(
        {
          sub: userId,
          role: "authenticated",
          aud: "authenticated",
          iss: issuer
        },
        env.supabase.jwtSecret,
        { algorithm: "HS256", expiresIn: "15m" }
      );
      const reauthRes = await fetch(`${env.supabase.url}/auth/v1/reauthenticate`, {
        method: "GET",
        headers: {
          apikey: env.supabase.anonKey,
          Authorization: `Bearer ${tempToken}`
        }
      });
      if (reauthRes.ok) {
        return { sentByEmail: true };
      }
      const errData = await reauthRes.json().catch(() => ({}));
      console.warn(
        `Envoi Supabase reauthenticate limit\xE9 (${reauthRes.status}: ${errData?.msg || errData?.message || ""}).`
      );
    } catch (err) {
      console.warn(`Erreur lors de l'appel reauthenticate Supabase (${err?.message || err}).`);
    }
  }
  console.log(`\u{1F511} [Revisio] Code de r\xE9initialisation pour ${normalized} : ${code} (valide 15 min)`);
  return { sentByEmail: false };
}
async function requestPasswordResetSmsCode(phone, userId, userEmail) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedEmail = userEmail.trim().toLowerCase();
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  const expiresAt = Date.now() + 15 * 60 * 1e3;
  const record = {
    userId,
    email: normalizedEmail,
    phone: normalizedPhone,
    code,
    expiresAt,
    attempts: 0
  };
  pendingResetCodes.set(normalizedEmail, record);
  pendingResetCodes.set(normalizedPhone, record);
  const sentViaTwilio = await sendDirectSmsCode(normalizedPhone, code);
  if (sentViaTwilio) {
    return { sentBySms: true };
  }
  if (!isMockSupabase) {
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        phone: normalizedPhone,
        phone_confirm: true
      }).catch(() => void 0);
      const { error: smsOtpError } = await supabaseAuth.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: false }
      });
      if (!smsOtpError) {
        return { sentBySms: true };
      }
      console.warn(`Envoi SMS Supabase Phone Auth non disponible (${smsOtpError.message}).`);
    } catch (err) {
      console.warn(`Erreur envoi SMS Supabase (${err?.message || err}).`);
    }
  }
  console.log(`\u{1F4F1} [Revisio SMS] Tentative d'envoi SMS pour ${normalizedPhone} (${normalizedEmail}) - aucun fournisseur SMS actif.`);
  return { sentBySms: false };
}
async function verifyPasswordResetCodeOnly(email, code, phone) {
  const normalized = email.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const cleanCode = code.trim().replace(/\s+/g, "");
  const issueResetToken = (uid) => jwt.sign(
    {
      sub: uid,
      email: normalized,
      phone: normalizedPhone || void 0,
      purpose: "password_reset_verified"
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "10m" }
  );
  const localEntry = pendingResetCodes.get(normalized) ?? (normalizedPhone ? pendingResetCodes.get(normalizedPhone) : void 0);
  if (localEntry) {
    if (Date.now() > localEntry.expiresAt) {
      pendingResetCodes.delete(normalized);
      if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
      throw new AppError(400, "Ce code de r\xE9initialisation a expir\xE9. Veuillez demander un nouveau code.");
    }
    localEntry.attempts += 1;
    if (localEntry.attempts > 5) {
      pendingResetCodes.delete(normalized);
      if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
      throw new AppError(429, "Trop de tentatives incorrectes. Veuillez demander un nouveau code.");
    }
    if (localEntry.code === cleanCode) {
      return { userId: localEntry.userId, resetToken: issueResetToken(localEntry.userId) };
    }
  }
  if (!isMockSupabase) {
    if (normalizedPhone) {
      for (const phoneVariant of [normalizedPhone, normalizedPhone.replace(/^\+/, "")]) {
        const { data, error } = await supabaseAuth.auth.verifyOtp({
          phone: phoneVariant,
          token: cleanCode,
          type: "sms"
        });
        if (!error && data?.user?.id) {
          return { userId: data.user.id, resetToken: issueResetToken(data.user.id) };
        }
      }
    }
    for (const otpType of ["recovery", "email"]) {
      const { data, error } = await supabaseAuth.auth.verifyOtp({
        email: normalized,
        token: cleanCode,
        type: otpType
      });
      if (!error && data?.user?.id) {
        return { userId: data.user.id, resetToken: issueResetToken(data.user.id) };
      }
    }
    const targetUserId = localEntry?.userId ?? (await findSupabaseUserByEmail(normalized))?.id;
    if (targetUserId && /^\d{6,8}$/.test(cleanCode)) {
      const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
      const tempToken = jwt.sign(
        {
          sub: targetUserId,
          role: "authenticated",
          aud: "authenticated",
          iss: issuer
        },
        env.supabase.jwtSecret,
        { algorithm: "HS256", expiresIn: "15m" }
      );
      const tempVerificationPassword = ` Verify#${randomUUID3()}9aA!`;
      const updateRes = await fetch(`${env.supabase.url}/auth/v1/user`, {
        method: "PUT",
        headers: {
          apikey: env.supabase.anonKey,
          Authorization: `Bearer ${tempToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password: tempVerificationPassword,
          nonce: cleanCode
        })
      });
      if (updateRes.ok) {
        return { userId: targetUserId, resetToken: issueResetToken(targetUserId) };
      }
    }
  }
  throw new AppError(400, "Code de v\xE9rification invalide ou expir\xE9.");
}
async function verifyResetCodeAndUpdatePassword(email, codeOrResetToken, newPassword, phone) {
  const normalized = email.trim().toLowerCase();
  const normalizedPhone = phone ? normalizePhoneNumber(phone) : "";
  const trimmedToken = codeOrResetToken.trim();
  if (trimmedToken.includes(".")) {
    try {
      const payload = jwt.verify(trimmedToken, env.supabase.jwtSecret, {
        algorithms: ["HS256"]
      });
      if (payload.purpose === "password_reset_verified" && payload.sub && payload.email?.toLowerCase() === normalized) {
        pendingResetCodes.delete(normalized);
        if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
        await updateSupabasePassword(payload.sub, newPassword);
        return payload.sub;
      }
    } catch {
      throw new AppError(400, "La session de r\xE9initialisation a expir\xE9. Veuillez recommencer.");
    }
  }
  const verified = await verifyPasswordResetCodeOnly(normalized, trimmedToken, normalizedPhone);
  pendingResetCodes.delete(normalized);
  if (normalizedPhone) pendingResetCodes.delete(normalizedPhone);
  await updateSupabasePassword(verified.userId, newPassword);
  return verified.userId;
}

// server/services/session.service.ts
import { createHash, randomBytes, randomUUID as randomUUID4, timingSafeEqual } from "crypto";
import fs from "fs";
import path2 from "path";
import jwt2 from "jsonwebtoken";
var PERSISTENT_TTL_MS = 90 * 24 * 60 * 60 * 1e3;
var EPHEMERAL_TTL_MS = 24 * 60 * 60 * 1e3;
var ROTATION_INTERVAL_MS = 15 * 60 * 1e3;
var ROTATION_GRACE_MS = 60 * 1e3;
var MAX_SESSIONS_PER_USER = 15;
var COOKIE_SESSION_NAME = "revisio_session";
var COOKIE_ACCESS_NAME = "revisio_access";
var COOKIE_DEVICE_NAME = "revisio_device_id";
var DATA_DIR = path2.join(process.cwd(), ".data");
var SESSIONS_FILE = path2.join(DATA_DIR, "device-sessions.json");
var userSessionsCache = /* @__PURE__ */ new Map();
var hydratedUsers = /* @__PURE__ */ new Set();
var revokedSessionIds = /* @__PURE__ */ new Set();
var revokedAccessTokens = /* @__PURE__ */ new Set();
var graceRotatedTokens = /* @__PURE__ */ new Map();
function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function safeHashEquals(hashA, hashB) {
  if (!hashA || !hashB) return false;
  const bufA = Buffer.from(hashA, "utf8");
  const bufB = Buffer.from(hashB, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
function loadSessionsFromDisk() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const raw = fs.readFileSync(SESSIONS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    for (const [userId, records] of Object.entries(parsed)) {
      if (!Array.isArray(records)) continue;
      const map = /* @__PURE__ */ new Map();
      for (const r of records) {
        if (r && r.sessionId) {
          map.set(r.sessionId, r);
          if (r.revokedAt) {
            revokedSessionIds.add(r.sessionId);
          }
        }
      }
      userSessionsCache.set(userId, map);
    }
  } catch {
  }
}
loadSessionsFromDisk();
function saveSessionsToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const serialized = {};
    for (const [userId, sessionMap] of userSessionsCache.entries()) {
      serialized[userId] = Array.from(sessionMap.values());
    }
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(serialized, null, 2), "utf8");
  } catch {
  }
}
async function ensureUserSessionsHydrated(userId) {
  let map = userSessionsCache.get(userId);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    userSessionsCache.set(userId, map);
  }
  if (hydratedUsers.has(userId) || isMockSupabase) {
    return map;
  }
  hydratedUsers.add(userId);
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!error && data?.user) {
      const remoteSessions = data.user.user_metadata?.device_sessions;
      if (Array.isArray(remoteSessions)) {
        for (const item of remoteSessions) {
          if (!item || !item.sessionId) continue;
          const local = map.get(item.sessionId);
          if (!local) {
            map.set(item.sessionId, item);
            if (item.revokedAt) revokedSessionIds.add(item.sessionId);
          } else {
            if (item.revokedAt && !local.revokedAt) {
              local.revokedAt = item.revokedAt;
              revokedSessionIds.add(item.sessionId);
            } else if (new Date(item.lastActiveAt).getTime() > new Date(local.lastActiveAt).getTime()) {
              map.set(item.sessionId, item);
            }
          }
        }
        saveSessionsToDisk();
      }
    }
  } catch {
  }
  return map;
}
async function persistUserSessionsToRemote(userId) {
  saveSessionsToDisk();
  if (isMockSupabase) return;
  const map = userSessionsCache.get(userId);
  if (!map) return;
  const now = Date.now();
  const pruned = Array.from(map.values()).filter((s) => {
    const exp = new Date(s.expiresAt).getTime();
    if (s.revokedAt) {
      const rev = new Date(s.revokedAt).getTime();
      return now - rev < 7 * 24 * 60 * 60 * 1e3;
    }
    return exp > now;
  }).sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()).slice(0, MAX_SESSIONS_PER_USER);
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !data?.user) return;
    const currentMeta = data.user.user_metadata || {};
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...currentMeta,
        device_sessions: pruned
      }
    });
  } catch {
  }
}
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  const pairs = header.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}
function parseDeviceName(userAgentRaw) {
  const ua = (userAgentRaw || "").trim();
  if (!ua) return "Navigateur Web";
  let browser = "Navigateur";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Safari";
  let os3 = "Appareil";
  if (/iPhone/i.test(ua)) os3 = "iPhone";
  else if (/iPad/i.test(ua)) os3 = "iPad";
  else if (/Android/i.test(ua)) os3 = "Android";
  else if (/Windows/i.test(ua)) os3 = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os3 = "macOS";
  else if (/Linux/i.test(ua)) os3 = "Linux";
  return `${browser} sur ${os3}`;
}
function extractClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}
function resolveDeviceId(req, explicitDeviceId) {
  const cookies = parseCookies(req);
  const headerDeviceId = typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"].trim() : "";
  const candidate = explicitDeviceId && explicitDeviceId.trim() || headerDeviceId || cookies[COOKIE_DEVICE_NAME] || "";
  if (candidate && /^[a-zA-Z0-9_-]{8,128}$/.test(candidate)) {
    return candidate;
  }
  return randomUUID4();
}
function issueSessionBoundAccessToken(userId, sessionId, deviceId) {
  const issuer = new URL("/auth/v1", env.supabase.url).toString().replace(/\/$/, "");
  return jwt2.sign(
    {
      sub: userId,
      role: "authenticated",
      aud: "authenticated",
      iss: issuer,
      sid: sessionId,
      did: deviceId,
      jti: randomUUID4()
    },
    env.supabase.jwtSecret,
    { algorithm: "HS256", expiresIn: "2h" }
  );
}
function buildRawDeviceSessionToken(userId, sessionId, secret) {
  return `${userId}.${sessionId}.${secret}`;
}
function parseRawDeviceSessionToken(rawToken) {
  if (!rawToken || typeof rawToken !== "string") return null;
  const parts = rawToken.trim().split(".");
  if (parts.length !== 3) return null;
  const [userId, sessionId, secret] = parts;
  if (!userId || !sessionId || !secret || secret.length < 16) return null;
  return { userId, sessionId, secret };
}
function isHttpsOrIframeContext(req) {
  const proto = req.headers["x-forwarded-proto"];
  if (req.secure) return true;
  if (typeof proto === "string" && proto.toLowerCase().includes("https")) return true;
  const origin = req.headers.origin || req.headers.referer || "";
  if (origin.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}
function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (typeof options.maxAgeSeconds === "number") {
    parts.push(`Max-Age=${Math.floor(options.maxAgeSeconds)}`);
    const expires = new Date(Date.now() + options.maxAgeSeconds * 1e3).toUTCString();
    parts.push(`Expires=${expires}`);
  }
  if (options.httpOnly !== false) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }
  return parts.join("; ");
}
function attachSessionCookiesAndHeaders(req, res, params) {
  const secure = isHttpsOrIframeContext(req);
  const sameSite = secure ? "None" : "Lax";
  const persistent = params.persistent !== false;
  const ttlSeconds = persistent ? Math.floor(PERSISTENT_TTL_MS / 1e3) : Math.floor(EPHEMERAL_TTL_MS / 1e3);
  const cookiesToSet = [
    serializeCookie(COOKIE_SESSION_NAME, params.deviceSessionToken, {
      maxAgeSeconds: persistent ? ttlSeconds : void 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/"
    }),
    serializeCookie(COOKIE_ACCESS_NAME, params.accessToken, {
      maxAgeSeconds: persistent ? ttlSeconds : void 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/"
    }),
    serializeCookie(COOKIE_DEVICE_NAME, params.deviceId, {
      maxAgeSeconds: 365 * 24 * 60 * 60,
      httpOnly: true,
      secure,
      sameSite,
      path: "/"
    })
  ];
  res.setHeader("Set-Cookie", cookiesToSet);
  res.setHeader("X-Renewed-Access-Token", params.accessToken);
  res.setHeader("X-Rotated-Device-Session", params.deviceSessionToken);
  res.setHeader("X-Device-Id", params.deviceId);
  res.setHeader("X-Session-Id", params.sessionId);
}
function clearSessionCookies(req, res) {
  const secure = isHttpsOrIframeContext(req);
  const sameSite = secure ? "None" : "Lax";
  const expiredCookies = [
    serializeCookie(COOKIE_SESSION_NAME, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/"
    }),
    serializeCookie(COOKIE_ACCESS_NAME, "", {
      maxAgeSeconds: 0,
      httpOnly: true,
      secure,
      sameSite,
      path: "/"
    })
  ];
  res.setHeader("Set-Cookie", expiredCookies);
  res.setHeader("X-Session-Revoked", "true");
}
async function createOrReplaceDeviceSession(req, userId, options) {
  const deviceId = resolveDeviceId(req, options?.deviceId);
  const persistent = options?.persistent !== false;
  const userAgent = String(req.headers["user-agent"] || "");
  const deviceName = parseDeviceName(userAgent);
  const ipAddress = extractClientIp(req);
  const sessionMap = await ensureUserSessionsHydrated(userId);
  for (const [existingSid, existingRecord] of sessionMap.entries()) {
    if (existingRecord.deviceId === deviceId) {
      sessionMap.delete(existingSid);
      revokedSessionIds.add(existingSid);
    }
  }
  const sessionId = randomUUID4();
  const rawSecret = randomBytes(32).toString("base64url");
  const tokenHash = sha256Hex(rawSecret);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const ttlMs = persistent ? PERSISTENT_TTL_MS : EPHEMERAL_TTL_MS;
  const expiresAtIso = new Date(Date.now() + ttlMs).toISOString();
  const record = {
    sessionId,
    userId,
    deviceId,
    deviceName,
    userAgent: userAgent.slice(0, 256),
    ipAddress,
    tokenHash,
    previousTokenHash: null,
    rotatedAt: nowIso,
    createdAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt: expiresAtIso,
    persistent,
    revokedAt: null
  };
  sessionMap.set(sessionId, record);
  if (sessionMap.size > MAX_SESSIONS_PER_USER) {
    const sorted = Array.from(sessionMap.values()).sort(
      (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
    );
    for (const old of sorted.slice(MAX_SESSIONS_PER_USER)) {
      sessionMap.delete(old.sessionId);
    }
  }
  void persistUserSessionsToRemote(userId);
  const deviceSessionToken = buildRawDeviceSessionToken(userId, sessionId, rawSecret);
  const accessToken = issueSessionBoundAccessToken(userId, sessionId, deviceId);
  return {
    sessionId,
    deviceId,
    deviceName,
    accessToken,
    deviceSessionToken,
    expiresAt: expiresAtIso,
    persistent
  };
}
async function verifyAndRotateDeviceSessionToken(req, rawDeviceSessionToken, forceRotate = false) {
  const parsed = parseRawDeviceSessionToken(rawDeviceSessionToken);
  if (!parsed) return null;
  const { userId, sessionId, secret } = parsed;
  if (revokedSessionIds.has(sessionId)) return null;
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record || record.revokedAt) {
    revokedSessionIds.add(sessionId);
    return null;
  }
  const now = Date.now();
  if (new Date(record.expiresAt).getTime() <= now) {
    sessionMap.delete(sessionId);
    void persistUserSessionsToRemote(userId);
    return null;
  }
  const candidateHash = sha256Hex(secret);
  const matchesCurrent = safeHashEquals(candidateHash, record.tokenHash);
  const rotatedAtMs = record.rotatedAt ? new Date(record.rotatedAt).getTime() : 0;
  const withinGrace = Boolean(record.previousTokenHash) && now - rotatedAtMs <= ROTATION_GRACE_MS && safeHashEquals(candidateHash, record.previousTokenHash);
  if (!matchesCurrent && !withinGrace) {
    record.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
    revokedSessionIds.add(sessionId);
    void persistUserSessionsToRemote(userId);
    return null;
  }
  if (withinGrace && !matchesCurrent) {
    const cachedGrace = graceRotatedTokens.get(sessionId);
    if (cachedGrace && cachedGrace.expiresAt > now) {
      const accessToken2 = issueSessionBoundAccessToken(userId, sessionId, record.deviceId);
      return {
        userId,
        sessionId,
        deviceId: record.deviceId,
        accessToken: accessToken2,
        deviceSessionToken: cachedGrace.rawToken,
        rotated: true,
        persistent: record.persistent
      };
    }
  }
  const shouldRotate = forceRotate || now - rotatedAtMs >= ROTATION_INTERVAL_MS;
  const ttlMs = record.persistent ? PERSISTENT_TTL_MS : EPHEMERAL_TTL_MS;
  record.lastActiveAt = new Date(now).toISOString();
  record.expiresAt = new Date(now + ttlMs).toISOString();
  record.ipAddress = extractClientIp(req);
  let activeRawToken = rawDeviceSessionToken;
  let rotated = false;
  if (shouldRotate) {
    const newSecret = randomBytes(32).toString("base64url");
    record.previousTokenHash = record.tokenHash;
    record.tokenHash = sha256Hex(newSecret);
    record.rotatedAt = new Date(now).toISOString();
    activeRawToken = buildRawDeviceSessionToken(userId, sessionId, newSecret);
    graceRotatedTokens.set(sessionId, {
      rawToken: activeRawToken,
      expiresAt: now + ROTATION_GRACE_MS
    });
    rotated = true;
  }
  void persistUserSessionsToRemote(userId);
  const accessToken = issueSessionBoundAccessToken(userId, sessionId, record.deviceId);
  return {
    userId,
    sessionId,
    deviceId: record.deviceId,
    accessToken,
    deviceSessionToken: activeRawToken,
    rotated,
    persistent: record.persistent
  };
}
function extractDeviceSessionTokenFromRequest(req) {
  const cookies = parseCookies(req);
  if (cookies[COOKIE_SESSION_NAME]) {
    return cookies[COOKIE_SESSION_NAME];
  }
  const headerToken = req.headers["x-device-session"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }
  return null;
}
function extractAccessTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  const cookies = parseCookies(req);
  if (cookies[COOKIE_ACCESS_NAME]) {
    return cookies[COOKIE_ACCESS_NAME];
  }
  return null;
}
async function isSessionActiveOnServer(userId, sessionId, rawAccessToken) {
  if (rawAccessToken && revokedAccessTokens.has(sha256Hex(rawAccessToken))) {
    return false;
  }
  if (!sessionId) {
    return true;
  }
  if (revokedSessionIds.has(sessionId)) {
    return false;
  }
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record) {
    return false;
  }
  if (record.revokedAt) {
    revokedSessionIds.add(sessionId);
    return false;
  }
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    return false;
  }
  return true;
}
async function revokeCurrentDeviceSession(req, userId, sessionIdFromToken) {
  const rawAccess = extractAccessTokenFromRequest(req);
  if (rawAccess) {
    revokedAccessTokens.add(sha256Hex(rawAccess));
  }
  const rawDeviceSession = extractDeviceSessionTokenFromRequest(req);
  const parsed = parseRawDeviceSessionToken(rawDeviceSession);
  const targetUserId = userId || parsed?.userId;
  const targetSessionId = sessionIdFromToken || parsed?.sessionId;
  const targetDeviceId = typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"].trim() : parseCookies(req)[COOKIE_DEVICE_NAME];
  if (targetSessionId) {
    revokedSessionIds.add(targetSessionId);
    graceRotatedTokens.delete(targetSessionId);
  }
  if (!targetUserId) return;
  const sessionMap = await ensureUserSessionsHydrated(targetUserId);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  if (targetSessionId && sessionMap.has(targetSessionId)) {
    const rec = sessionMap.get(targetSessionId);
    rec.revokedAt = nowIso;
    revokedSessionIds.add(targetSessionId);
  } else if (targetDeviceId) {
    for (const rec of sessionMap.values()) {
      if (rec.deviceId === targetDeviceId && !rec.revokedAt) {
        rec.revokedAt = nowIso;
        revokedSessionIds.add(rec.sessionId);
      }
    }
  }
  await persistUserSessionsToRemote(targetUserId);
}
async function revokeDeviceSessionById(userId, sessionId) {
  revokedSessionIds.add(sessionId);
  graceRotatedTokens.delete(sessionId);
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const record = sessionMap.get(sessionId);
  if (!record) return false;
  record.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
  await persistUserSessionsToRemote(userId);
  return true;
}
async function revokeAllUserSessions(userId, exceptSessionId) {
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let count = 0;
  for (const record of sessionMap.values()) {
    if (exceptSessionId && record.sessionId === exceptSessionId) continue;
    if (!record.revokedAt) {
      record.revokedAt = nowIso;
      revokedSessionIds.add(record.sessionId);
      graceRotatedTokens.delete(record.sessionId);
      count += 1;
    }
  }
  await persistUserSessionsToRemote(userId);
  return count;
}
async function listActiveUserDeviceSessions(userId, currentSessionId, currentDeviceId) {
  const sessionMap = await ensureUserSessionsHydrated(userId);
  const now = Date.now();
  const active = [];
  for (const record of sessionMap.values()) {
    if (record.revokedAt || revokedSessionIds.has(record.sessionId)) continue;
    if (new Date(record.expiresAt).getTime() <= now) continue;
    const isCurrentDevice = Boolean(
      currentSessionId && record.sessionId === currentSessionId || !currentSessionId && currentDeviceId && record.deviceId === currentDeviceId
    );
    active.push({
      sessionId: record.sessionId,
      deviceId: record.deviceId,
      deviceName: record.deviceName,
      ipAddress: record.ipAddress,
      createdAt: record.createdAt,
      lastActiveAt: record.lastActiveAt,
      expiresAt: record.expiresAt,
      persistent: record.persistent,
      isCurrentDevice
    });
  }
  return active.sort((a, b) => {
    if (a.isCurrentDevice !== b.isCurrentDevice) return a.isCurrentDevice ? -1 : 1;
    return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
  });
}

// server/middlewares/authenticate.ts
async function authenticateJWT(req, res, next) {
  try {
    const rawAccessToken = extractAccessTokenFromRequest(req);
    const rawDeviceSessionToken = extractDeviceSessionTokenFromRequest(req);
    let payload = null;
    if (rawAccessToken) {
      try {
        const verified = await verifyAccessToken(rawAccessToken);
        const isActive = await isSessionActiveOnServer(
          verified.userId,
          verified.sessionId,
          rawAccessToken
        );
        if (isActive) {
          payload = verified;
        }
      } catch {
        payload = null;
      }
    }
    if (!payload && rawDeviceSessionToken) {
      const rotatedSession = await verifyAndRotateDeviceSessionToken(
        req,
        rawDeviceSessionToken,
        false
      );
      if (rotatedSession) {
        attachSessionCookiesAndHeaders(req, res, {
          accessToken: rotatedSession.accessToken,
          deviceSessionToken: rotatedSession.deviceSessionToken,
          deviceId: rotatedSession.deviceId,
          sessionId: rotatedSession.sessionId,
          persistent: rotatedSession.persistent
        });
        payload = {
          userId: rotatedSession.userId,
          role: "authenticated",
          tokenType: "access",
          sessionId: rotatedSession.sessionId,
          deviceId: rotatedSession.deviceId
        };
      }
    }
    if (!payload) {
      clearSessionCookies(req, res);
      return next(unauthorized("Session expir\xE9e ou non authentifi\xE9e."));
    }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      clearSessionCookies(req, res);
      return next(unauthorized("Compte introuvable ou supprim\xE9."));
    }
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom
    };
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}

// server/middlewares/validate.ts
var validate = (schema, source = "body") => (req, _res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const flattened = result.error.flatten();
    const fieldErrorList = Object.values(flattened.fieldErrors).flat().filter((msg) => typeof msg === "string" && msg.length > 0);
    const firstMessage = fieldErrorList[0] || flattened.formErrors[0] || "Donn\xE9es invalides. Veuillez v\xE9rifier les champs du formulaire.";
    return next(badRequest(firstMessage, flattened));
  }
  req[source] = result.data;
  next();
};

// server/middlewares/rateLimit.ts
import rateLimit from "express-rate-limit";
function buildLimiter(options) {
  const limiter = rateLimit(options);
  const wrapped = (req, res, next) => {
    if (process.env.RATE_LIMIT_ENABLED === "false") return next();
    return limiter(req, res, next);
  };
  return Object.assign(wrapped, limiter);
}
var apiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1e3,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requ\xEAtes. R\xE9essayez dans quelques minutes." }
});
var authRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de connexion. R\xE9essayez dans une minute." }
});
var downloadRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de t\xE9l\xE9chargements. R\xE9essayez dans une minute." }
});
var searchRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de recherches. R\xE9essayez dans une minute." }
});
var suggestRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requ\xEAtes de suggestion. R\xE9essayez dans une minute." }
});
var refreshRateLimiter = buildLimiter({
  windowMs: 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de rafra\xEEchissement. R\xE9essayez dans une minute." }
});

// server/services/activity.service.ts
async function logUserActivity(input) {
  return prisma.userActivity.create({
    data: {
      userId: input.userId,
      userNom: input.userNom,
      userEmail: input.userEmail,
      userRole: input.userRole,
      actionType: input.actionType,
      description: input.description,
      targetId: input.targetId ?? null,
      targetTitle: input.targetTitle ?? null
    }
  });
}

// server/config/superadmin.ts
import path3 from "path";
import fs2 from "fs";
function tryGetSuperAdminMasterKey() {
  return readSuperAdminMasterKey();
}
function readSuperAdminMasterKey() {
  const fromEnv = process.env.SUPERADMIN_MASTER_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const configPath = path3.join(process.cwd(), "superadmin.config.json");
    if (fs2.existsSync(configPath)) {
      const data = fs2.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.superadminMasterKey) {
        return String(parsed.superadminMasterKey).trim();
      }
    }
  } catch (err) {
    console.error("Erreur lors de la lecture de superadmin.config.json:", err);
  }
  return null;
}

// server/routes/auth.ts
var router = Router();
function masterKeyMatches(candidate, expected) {
  if (!expected || !candidate) return false;
  const a = Buffer.from(candidate.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual2(a, b);
}
var optionalCameroonPhoneSchema = z.preprocess((val) => {
  if (typeof val !== "string") return void 0;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "+237" || trimmed === "237") return void 0;
  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized || normalized.replace(/\D/g, "").length < 8) return void 0;
  return normalized;
}, z.string().regex(/^\+[0-9]{8,15}$/, "Num\xE9ro de t\xE9l\xE9phone invalide : saisissez les 9 chiffres apr\xE8s +237 (ex : 655123456).").optional());
var cleanEmailSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  return val.replace(/[\u200B-\u200D\uFEFF\s]/g, "").toLowerCase();
}, z.string().email("Adresse e-mail invalide.").max(200));
var registerSchema = z.object({
  nom: z.string().trim().min(1, "Veuillez renseigner votre nom.").max(80, "Le nom est trop long."),
  prenom: z.string().trim().min(1, "Veuillez renseigner votre pr\xE9nom.").max(80, "Le pr\xE9nom est trop long."),
  email: cleanEmailSchema,
  telephone: optionalCameroonPhoneSchema,
  motDePasse: z.string().min(6, "Le mot de passe doit contenir au moins 6 caract\xE8res.").max(128),
  // Public registration can never assign privileged roles.
  role: z.string().optional(),
  deviceId: z.string().max(128).optional(),
  rememberMe: z.boolean().optional(),
  masterKey: z.string().max(256).optional()
}).passthrough();
var loginSchema = z.object({
  email: cleanEmailSchema,
  motDePasse: z.string().min(1, "Le mot de passe est requis.").max(128),
  masterKey: z.string().max(256).optional(),
  deviceId: z.string().max(128).optional(),
  rememberMe: z.boolean().optional()
}).passthrough();
var refreshSchema = z.object({
  refreshToken: z.string().max(1024).optional(),
  deviceSessionToken: z.string().max(1024).optional(),
  deviceId: z.string().max(128).optional()
}).passthrough();
var forgotPasswordSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
  telephone: z.string().min(8, "Num\xE9ro de t\xE9l\xE9phone invalide.").max(30).optional()
}).refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
  message: "Veuillez renseigner votre adresse e-mail ou votre num\xE9ro de t\xE9l\xE9phone."
});
var verifyResetCodeSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
  telephone: z.string().min(8, "Num\xE9ro de t\xE9l\xE9phone invalide.").max(30).optional(),
  code: z.string().min(6, "Le code doit contenir au moins 6 chiffres.").max(12)
}).refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
  message: "Veuillez renseigner votre adresse e-mail ou votre num\xE9ro de t\xE9l\xE9phone."
});
var resetPasswordSchema = z.object({
  email: z.string().email("Adresse e-mail invalide.").max(200).optional(),
  telephone: z.string().min(8, "Num\xE9ro de t\xE9l\xE9phone invalide.").max(30).optional(),
  code: z.string().min(6, "Jeton ou code de v\xE9rification requis.").max(1024),
  nouveauMotDePasse: z.string().min(6, "Le mot de passe doit contenir au moins 6 caract\xE8res.").max(128)
}).refine((data) => Boolean(data.email?.trim() || data.telephone?.trim()), {
  message: "Veuillez renseigner votre adresse e-mail ou votre num\xE9ro de t\xE9l\xE9phone."
});
async function findUserByEmailOrPhone(email, telephone) {
  if (telephone && telephone.trim()) {
    const normalizedTarget = normalizePhoneNumber(telephone.trim());
    if (!normalizedTarget || normalizedTarget.length < 9) {
      throw badRequest("Format du num\xE9ro de t\xE9l\xE9phone invalide (ex: +2376XXXXXXXX).");
    }
    const usersWithPhone = await prisma.user.findMany({
      where: { telephone: { not: null } }
    });
    const matched = usersWithPhone.find(
      (u) => u.telephone && normalizePhoneNumber(u.telephone) === normalizedTarget
    );
    if (!matched) {
      throw badRequest("Aucun compte n'est associ\xE9 \xE0 ce num\xE9ro de t\xE9l\xE9phone.");
    }
    return { user: matched, normalizedPhone: normalizedTarget, viaSms: true };
  }
  const trimmedEmail = (email ?? "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (!user) {
    throw badRequest("Aucun compte n'est associ\xE9 \xE0 cette adresse e-mail.");
  }
  return {
    user,
    normalizedPhone: user.telephone ? normalizePhoneNumber(user.telephone) : void 0,
    viaSms: false
  };
}
router.post(
  "/forgot-password",
  authRateLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone } = req.body;
    const { user, normalizedPhone, viaSms } = await findUserByEmailOrPhone(email, telephone);
    if (viaSms && normalizedPhone) {
      const { sentBySms } = await requestPasswordResetSmsCode(
        normalizedPhone,
        user.id,
        user.email
      );
      if (!sentBySms) {
        throw badRequest(
          "L'envoi par SMS n'est pas encore actif : aucun fournisseur SMS n'est configur\xE9 dans votre projet Supabase (Authentication > Providers > Phone) ou via Twilio. Pour recevoir votre code directement sur votre messagerie, veuillez choisir l'option 'Par E-mail'."
        );
      }
      return res.json({
        message: `Un code de r\xE9initialisation par SMS a \xE9t\xE9 envoy\xE9 au num\xE9ro ${normalizedPhone}.`,
        telephone: normalizedPhone
      });
    }
    await requestPasswordResetCode(user.email, user.id);
    res.json({
      message: `Un code de v\xE9rification a \xE9t\xE9 envoy\xE9 \xE0 l'adresse ${user.email}.`
    });
  })
);
router.post(
  "/verify-reset-code",
  authRateLimiter,
  validate(verifyResetCodeSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone, code } = req.body;
    const { user, normalizedPhone } = await findUserByEmailOrPhone(email, telephone);
    const { resetToken } = await verifyPasswordResetCodeOnly(
      user.email,
      code,
      normalizedPhone
    );
    res.json({
      valid: true,
      resetToken,
      email: user.email,
      telephone: normalizedPhone,
      message: "Code v\xE9rifi\xE9 avec succ\xE8s ! Veuillez maintenant d\xE9finir et confirmer votre nouveau mot de passe."
    });
  })
);
router.post(
  "/reset-password",
  authRateLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email, telephone, code, nouveauMotDePasse } = req.body;
    const { user, normalizedPhone, viaSms } = await findUserByEmailOrPhone(email, telephone);
    await verifyResetCodeAndUpdatePassword(
      user.email,
      code,
      nouveauMotDePasse,
      normalizedPhone
    );
    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "LOGIN",
      description: viaSms ? "A r\xE9initialis\xE9 son mot de passe via code SMS." : "A r\xE9initialis\xE9 son mot de passe via code e-mail."
    });
    res.json({
      message: "Votre mot de passe a \xE9t\xE9 r\xE9initialis\xE9 avec succ\xE8s ! Vous pouvez maintenant vous connecter."
    });
  })
);
router.post(
  "/register",
  authRateLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, telephone, motDePasse, deviceId, rememberMe } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTelephone = telephone?.trim() || null;
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    const existingAuth = await findSupabaseUserByEmail(trimmedEmail);
    if (existing && existingAuth) {
      throw badRequest("Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e. Veuillez vous connecter avec votre mot de passe.");
    }
    let authId;
    let user;
    if (existing && !existingAuth) {
      authId = await createSupabaseUser(
        trimmedEmail,
        motDePasse,
        trimmedTelephone ?? existing.telephone ?? void 0,
        true,
        existing.id
      );
      user = await prisma.user.update({
        where: { email: trimmedEmail },
        data: {
          nom: nom ? nom.trim().toUpperCase() : existing.nom,
          prenom: prenom ? prenom.trim() : existing.prenom,
          telephone: trimmedTelephone || existing.telephone
        }
      });
    } else if (!existing && existingAuth) {
      authId = existingAuth.id;
      await updateSupabasePassword(authId, motDePasse.trim()).catch(() => void 0);
      user = await prisma.user.create({
        data: {
          id: authId,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          email: trimmedEmail,
          telephone: trimmedTelephone,
          role: "Etudiant"
        }
      });
    } else {
      authId = await createSupabaseUser(trimmedEmail, motDePasse, trimmedTelephone ?? void 0);
      try {
        user = await prisma.user.create({
          data: {
            id: authId,
            nom: nom.trim().toUpperCase(),
            prenom: prenom.trim(),
            email: trimmedEmail,
            telephone: trimmedTelephone,
            role: "Etudiant"
          }
        });
      } catch (dbErr) {
        await deleteSupabaseUser(authId).catch(() => void 0);
        throw dbErr;
      }
    }
    await signInSupabase(trimmedEmail, motDePasse).catch(() => null);
    const deviceSession = await createOrReplaceDeviceSession(req, user.id, {
      deviceId,
      persistent: rememberMe !== false
    });
    attachSessionCookiesAndHeaders(req, res, {
      accessToken: deviceSession.accessToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      persistent: deviceSession.persistent
    });
    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "REGISTER",
      description: `Cr\xE9ation du compte ${user.role} ${user.prenom} ${user.nom} (${deviceSession.deviceName}).`
    });
    res.status(201).json({
      token: deviceSession.accessToken,
      refreshToken: deviceSession.deviceSessionToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      expiresAt: deviceSession.expiresAt,
      user: mapUser(user),
      message: `Inscription r\xE9ussie ! Votre compte ${user.role} a \xE9t\xE9 activ\xE9 avec succ\xE8s.`
    });
  })
);
router.post(
  "/login",
  authRateLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, motDePasse, masterKey, deviceId, rememberMe } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = motDePasse.trim();
    const currentMasterKey = tryGetSuperAdminMasterKey();
    if (currentMasterKey && masterKeyMatches(masterKey, currentMasterKey)) {
      const [existingProfile, existingSuperAdmin] = await Promise.all([
        prisma.user.findUnique({ where: { email: trimmedEmail } }),
        prisma.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } })
      ]);
      if (!existingProfile && !existingSuperAdmin) {
        const result = await bootstrapFirstSuperAdmin(trimmedEmail, motDePasse);
        const deviceSession2 = await createOrReplaceDeviceSession(req, result.user.id, {
          deviceId,
          persistent: rememberMe !== false
        });
        attachSessionCookiesAndHeaders(req, res, {
          accessToken: deviceSession2.accessToken,
          deviceSessionToken: deviceSession2.deviceSessionToken,
          deviceId: deviceSession2.deviceId,
          sessionId: deviceSession2.sessionId,
          persistent: deviceSession2.persistent
        });
        await logUserActivity({
          userId: result.user.id,
          userNom: `${result.user.prenom} ${result.user.nom}`,
          userEmail: result.user.email,
          userRole: result.user.role,
          actionType: "LOGIN",
          description: `A initialis\xE9 le premier compte SuperAdministrateur (${deviceSession2.deviceName}).`
        });
        return res.json({
          token: deviceSession2.accessToken,
          refreshToken: deviceSession2.deviceSessionToken,
          deviceSessionToken: deviceSession2.deviceSessionToken,
          deviceId: deviceSession2.deviceId,
          sessionId: deviceSession2.sessionId,
          expiresAt: deviceSession2.expiresAt,
          user: mapUser(result.user),
          message: "Compte SuperAdministrateur initialis\xE9 avec succ\xE8s."
        });
      }
    }
    let session;
    try {
      session = await signInSupabase(trimmedEmail, motDePasse);
    } catch (authError) {
      const existingDbUser = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existingDbUser) {
        const authUser = await findSupabaseUserByEmail(trimmedEmail);
        if (!authUser) {
          try {
            await createSupabaseUser(
              trimmedEmail,
              trimmedPassword,
              existingDbUser.telephone ?? void 0,
              true,
              existingDbUser.id
            );
            session = await signInSupabase(trimmedEmail, trimmedPassword);
          } catch (provisionErr) {
            console.error("Auto-provisioning Supabase Auth error:", provisionErr);
            throw unauthorized("Mot de passe incorrect ou compte en cours de synchronisation. Veuillez v\xE9rifier votre saisie ou contacter l'administration.");
          }
        } else {
          throw unauthorized("Mot de passe incorrect. Veuillez v\xE9rifier votre saisie.");
        }
      } else {
        throw unauthorized("Aucun compte n'est associ\xE9 \xE0 cette adresse e-mail. V\xE9rifiez votre saisie ou cr\xE9ez votre compte.");
      }
    }
    let user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (user && user.id !== session.userId) {
        try {
          user = await prisma.user.update({
            where: { email: trimmedEmail },
            data: { id: session.userId }
          });
        } catch {
        }
      }
    }
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: session.userId,
          nom: "\xC9TUDIANT",
          prenom: "\xC9tudiant ISJ",
          email: trimmedEmail,
          role: "Etudiant"
        }
      });
    }
    const deviceSession = await createOrReplaceDeviceSession(req, user.id, {
      deviceId,
      persistent: rememberMe !== false
    });
    attachSessionCookiesAndHeaders(req, res, {
      accessToken: deviceSession.accessToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      persistent: deviceSession.persistent
    });
    await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType: "LOGIN",
      description: `S'est connect\xE9 \xE0 la plateforme ISJ Revisio (${deviceSession.deviceName}).`
    });
    res.json({
      token: deviceSession.accessToken,
      refreshToken: deviceSession.deviceSessionToken,
      deviceSessionToken: deviceSession.deviceSessionToken,
      deviceId: deviceSession.deviceId,
      sessionId: deviceSession.sessionId,
      expiresAt: deviceSession.expiresAt,
      user: mapUser(user),
      message: `Bienvenue ${user.prenom} ${user.nom} !`
    });
  })
);
router.post(
  "/refresh",
  refreshRateLimiter,
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const candidateToken = req.body?.deviceSessionToken || req.body?.refreshToken || extractDeviceSessionTokenFromRequest(req);
    if (!candidateToken) {
      clearSessionCookies(req, res);
      throw unauthorized("Aucun jeton de session persistant trouv\xE9 sur cet appareil.");
    }
    const rotated = await verifyAndRotateDeviceSessionToken(req, candidateToken, true);
    if (rotated) {
      const user = await prisma.user.findUnique({ where: { id: rotated.userId } });
      if (!user) {
        clearSessionCookies(req, res);
        throw unauthorized("Compte introuvable.");
      }
      attachSessionCookiesAndHeaders(req, res, {
        accessToken: rotated.accessToken,
        deviceSessionToken: rotated.deviceSessionToken,
        deviceId: rotated.deviceId,
        sessionId: rotated.sessionId,
        persistent: rotated.persistent
      });
      return res.json({
        token: rotated.accessToken,
        refreshToken: rotated.deviceSessionToken,
        deviceSessionToken: rotated.deviceSessionToken,
        deviceId: rotated.deviceId,
        sessionId: rotated.sessionId,
        user: mapUser(user)
      });
    }
    try {
      const supaSession = await refreshSupabaseSession(candidateToken);
      const user = await prisma.user.findUnique({ where: { id: supaSession.userId } });
      if (!user) {
        clearSessionCookies(req, res);
        throw unauthorized("Compte introuvable.");
      }
      const upgraded = await createOrReplaceDeviceSession(req, user.id, {
        deviceId: req.body?.deviceId,
        persistent: true
      });
      attachSessionCookiesAndHeaders(req, res, {
        accessToken: upgraded.accessToken,
        deviceSessionToken: upgraded.deviceSessionToken,
        deviceId: upgraded.deviceId,
        sessionId: upgraded.sessionId,
        persistent: upgraded.persistent
      });
      return res.json({
        token: upgraded.accessToken,
        refreshToken: upgraded.deviceSessionToken,
        deviceSessionToken: upgraded.deviceSessionToken,
        deviceId: upgraded.deviceId,
        sessionId: upgraded.sessionId,
        user: mapUser(user)
      });
    } catch {
      clearSessionCookies(req, res);
      throw unauthorized("Session expir\xE9e ou r\xE9voqu\xE9e. Veuillez vous reconnecter.");
    }
  })
);
router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    let userId;
    let sessionId;
    const rawAccess = extractAccessTokenFromRequest(req);
    if (rawAccess) {
      try {
        const verified = await verifyAccessToken(rawAccess);
        userId = verified.userId;
        sessionId = verified.sessionId;
      } catch {
      }
      try {
        await revokeSupabaseSession(rawAccess);
      } catch {
      }
    }
    await revokeCurrentDeviceSession(req, userId, sessionId);
    clearSessionCookies(req, res);
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } }).catch(() => null);
      if (user) {
        await logUserActivity({
          userId: user.id,
          userNom: `${user.prenom} ${user.nom}`,
          userEmail: user.email,
          userRole: user.role,
          actionType: "LOGOUT",
          description: "S'est d\xE9connect\xE9 de la plateforme ISJ Revisio sur cet appareil."
        }).catch(() => void 0);
      }
    }
    res.json({ message: "D\xE9connexion r\xE9ussie sur cet appareil." });
  })
);
router.get(
  "/me",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      clearSessionCookies(req, res);
      throw new AppError(401, "Session expir\xE9e ou invalide.");
    }
    const existingDeviceSession = extractDeviceSessionTokenFromRequest(req);
    let activeAccessToken = extractAccessTokenFromRequest(req) || void 0;
    let activeDeviceSessionToken = existingDeviceSession || void 0;
    let activeDeviceId = req.tokenPayload?.deviceId || resolveDeviceId(req);
    let activeSessionId = req.tokenPayload?.sessionId;
    if (!existingDeviceSession && !req.tokenPayload?.sessionId) {
      const created = await createOrReplaceDeviceSession(req, user.id, {
        deviceId: activeDeviceId,
        persistent: true
      });
      attachSessionCookiesAndHeaders(req, res, {
        accessToken: created.accessToken,
        deviceSessionToken: created.deviceSessionToken,
        deviceId: created.deviceId,
        sessionId: created.sessionId,
        persistent: created.persistent
      });
      activeAccessToken = created.accessToken;
      activeDeviceSessionToken = created.deviceSessionToken;
      activeDeviceId = created.deviceId;
      activeSessionId = created.sessionId;
    }
    const renewedAccess = res.getHeader("X-Renewed-Access-Token");
    const rotatedSession = res.getHeader("X-Rotated-Device-Session");
    res.json({
      user: mapUser(user),
      token: typeof renewedAccess === "string" ? renewedAccess : activeAccessToken,
      deviceSessionToken: typeof rotatedSession === "string" ? rotatedSession : activeDeviceSessionToken,
      deviceId: activeDeviceId,
      sessionId: activeSessionId
    });
  })
);
router.get(
  "/sessions",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const currentSessionId = req.tokenPayload?.sessionId;
    const currentDeviceId = req.tokenPayload?.deviceId || resolveDeviceId(req);
    const sessions = await listActiveUserDeviceSessions(
      req.user.id,
      currentSessionId,
      currentDeviceId
    );
    res.json({ sessions });
  })
);
router.delete(
  "/sessions/:sessionId",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const targetSessionId = String(req.params.sessionId || "").trim();
    if (!targetSessionId) {
      throw badRequest("Identifiant de session manquant.");
    }
    await revokeDeviceSessionById(req.user.id, targetSessionId);
    const isCurrent = req.tokenPayload?.sessionId === targetSessionId;
    if (isCurrent) {
      clearSessionCookies(req, res);
    }
    res.json({
      revokedSessionId: targetSessionId,
      revokedCurrentDevice: isCurrent,
      message: isCurrent ? "Session de cet appareil r\xE9voqu\xE9e." : "L'appareil s\xE9lectionn\xE9 a \xE9t\xE9 d\xE9connect\xE9 \xE0 distance."
    });
  })
);
router.post(
  "/logout-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const keepCurrent = req.body?.keepCurrentDevice !== false;
    const currentSessionId = keepCurrent ? req.tokenPayload?.sessionId : void 0;
    const revokedCount = await revokeAllUserSessions(req.user.id, currentSessionId);
    if (!keepCurrent) {
      clearSessionCookies(req, res);
    }
    res.json({
      revokedCount,
      message: keepCurrent ? `${revokedCount} autre(s) appareil(s) d\xE9connect\xE9(s) avec succ\xE8s.` : "Toutes vos sessions ont \xE9t\xE9 d\xE9connect\xE9es."
    });
  })
);
var bootstrapPasswordSchema = z.string().min(12).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9\s]/);
async function bootstrapFirstSuperAdmin(email, password) {
  if (!bootstrapPasswordSchema.safeParse(password).success) {
    throw badRequest("Le premier mot de passe SuperAdministrateur doit contenir au moins 12 caract\xE8res, une lettre, un chiffre et un caract\xE8re sp\xE9cial.");
  }
  const user = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(734112093)`;
    const existingSuperAdmin = await tx.user.findFirst({ where: { role: "SuperAdministrateur" }, select: { id: true } });
    const existingProfile = await tx.user.findUnique({ where: { email } });
    if (existingSuperAdmin || existingProfile) {
      throw unauthorized("Initialisation SuperAdministrateur d\xE9j\xE0 effectu\xE9e.");
    }
    const existingAuthUser = await findSupabaseUserByEmail(email);
    if (existingAuthUser) {
      throw unauthorized("Cette adresse e-mail est d\xE9j\xE0 associ\xE9e \xE0 un compte.");
    }
    const authId = await createSupabaseUser(email, password);
    return tx.user.create({
      data: {
        id: authId,
        nom: "DIRECTION",
        prenom: "Super Admin ISJ",
        email,
        role: "SuperAdministrateur"
      }
    });
  }, { maxWait: 1e4, timeout: 2e4 });
  const session = await signInSupabase(email, password);
  return { user, session };
}
var auth_default = router;

// server/routes/documents.ts
import express, { Router as Router2 } from "express";
import { z as z2 } from "zod";

// server/middlewares/authorize.ts
var requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(forbidden());
  }
  next();
};

// server/services/audit.service.ts
async function logAdminAction(input) {
  const log = await prisma.auditLog.create({
    data: {
      adminId: input.adminId,
      adminNom: input.adminNom,
      adminEmail: input.adminEmail,
      action: input.action,
      details: input.details,
      targetId: input.targetId ?? null,
      targetName: input.targetName ?? null
    }
  });
  await logUserActivity({
    userId: input.adminId,
    userNom: input.adminNom,
    userEmail: input.adminEmail,
    userRole: "Administrateur",
    actionType: input.action,
    description: input.details,
    targetId: input.targetId,
    targetTitle: input.targetName
  });
  return log;
}

// server/services/pdf-watermark.service.ts
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
var MAX_STAMPED_PDF_PAGES = 500;
async function stampPdf(pdfBytes) {
  let pdf;
  try {
    pdf = await PDFDocument.load(pdfBytes);
  } catch {
    throw new AppError(500, "Document illisible : tatouage de tra\xE7abilit\xE9 impossible.");
  }
  if (pdf.getPageCount() > MAX_STAMPED_PDF_PAGES) {
    throw new AppError(413, `Le document d\xE9passe la limite de ${MAX_STAMPED_PDF_PAGES} pages.`);
  }
  const stamp = "Revisio-ISJ";
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const unitWidth = font.widthOfTextAtSize(stamp, 1);
  const angleDeg = -30;
  const angleRad = angleDeg * Math.PI / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const minDim = Math.min(width, height);
    const targetTextWidth = minDim * 0.72;
    const size = Math.max(48, targetTextWidth / unitWidth);
    const textWidth = font.widthOfTextAtSize(stamp, size);
    const textHeight = font.heightAtSize(size, { descender: false });
    const offsetX = textWidth / 2 * cos - textHeight / 2 * sin;
    const offsetY = textWidth / 2 * sin + textHeight / 2 * cos;
    page.drawText(stamp, {
      x: width / 2 - offsetX,
      y: height / 2 - offsetY,
      size,
      font,
      color: rgb(0.18, 0.22, 0.3),
      opacity: 0.2,
      rotate: degrees(angleDeg)
    });
  }
  pdf.setProducer("Revisio-ISJ");
  return pdf.save();
}

// server/services/search.service.ts
var ftsReady = false;
var stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function buildTsQuery(search) {
  const tokens = stripAccents(search.toLowerCase()).split(/[^a-z0-9]+/).filter((t) => t.length > 0).map((t) => `${t}:*`);
  if (tokens.length === 0) return null;
  return tokens.join(" & ");
}
function escapeLike(s) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
function mapRow(row) {
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
    datePublication: row.datePublication ? row.datePublication.toISOString() : void 0,
    dateAjout: row.createdAt.toISOString(),
    telechargementsCount: row.telechargementsCount,
    contributionId: row.contributionId ?? void 0
  };
}
async function searchDocuments(params = {}) {
  const statutDb = params.statut === void 0 || params.statut === "Publi\xE9" ? "Publie" : params.statut === "Refus\xE9" ? "Refuse" : params.statut === "En attente" ? "En_attente" : "Publie";
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 50) : 12;
  const offset = (page - 1) * pageSize;
  const search = (params.search ?? "").trim();
  const hasSearch = search.length > 0;
  const tsQuery = hasSearch && ftsReady ? buildTsQuery(search) : null;
  if (hasSearch && ftsReady && tsQuery === null) {
    return { data: [], total: 0, page, pageSize };
  }
  const likeTerm = hasSearch ? `%${escapeLike(search.toLowerCase())}%` : null;
  const where = [`d."statut" = $1`, `d."visible" = TRUE`];
  const values = [statutDb];
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
  const orderBy = hasSearch && ftsReady ? `ORDER BY
          ts_rank_cd(to_tsvector('simple', public.unaccent_text(d."titre")), to_tsquery('simple', $${searchParam}))
            + ts_rank_cd(to_tsvector('simple', public.unaccent_text(m."nom")), to_tsquery('simple', $${searchParam}))
          DESC, d."createdAt" DESC` : `ORDER BY d."createdAt" DESC`;
  const [rows, countRows] = await Promise.all([
    prisma.$queryRawUnsafe(
      `${select} ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      ...values,
      pageSize,
      offset
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total FROM "documents" d JOIN "matieres" m ON m."id" = d."matiereId" WHERE ${whereSql}`,
      ...values
    )
  ]);
  return {
    data: rows.map(mapRow),
    total: countRows[0]?.total ?? 0,
    page,
    pageSize
  };
}
async function suggestDocuments(q, limit = 6) {
  const query = (q ?? "").trim();
  if (query.length < 2) return [];
  const likeTerm = `%${escapeLike(query.toLowerCase())}%`;
  if (ftsReady) {
    const tsQuery = buildTsQuery(query);
    if (tsQuery === null) return [];
    const rows2 = await prisma.$queryRawUnsafe(
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
    return rows2.map((r) => ({
      id: r.id,
      titre: r.titre,
      matiere: r.matiereNom,
      typeEpreuve: r.typeEpreuve,
      semestre: semestreFromDb(r.semestre),
      anneeAcademique: r.anneeAcademique,
      fichierUrl: "",
      score: r.score
    }));
  }
  const rows = await prisma.$queryRawUnsafe(
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
    score: 0
  }));
}

// server/routes/documents.ts
var router2 = Router2();
var uuidParam = z2.object({ id: z2.string().uuid("Identifiant invalide.") });
var listQuerySchema = z2.object({
  search: z2.string().max(200).optional(),
  matiere: z2.string().max(120).optional(),
  semestre: z2.string().max(20).optional(),
  typeEpreuve: z2.string().max(10).optional(),
  anneeAcademique: z2.string().max(20).optional(),
  statut: z2.string().max(20).optional(),
  page: z2.coerce.number().int().positive().optional(),
  pageSize: z2.coerce.number().int().positive().max(100).optional()
}).refine((query) => query.page === void 0 === (query.pageSize === void 0), {
  message: "page et pageSize doivent \xEAtre fournis ensemble."
});
var suggestQuerySchema = z2.object({
  q: z2.string().min(2).max(200),
  limit: z2.coerce.number().int().positive().max(10).optional()
});
var visibilitySchema = z2.object({ visible: z2.boolean() });
var createSchema = z2.object({
  titre: z2.string().min(2, "Le titre est requis.").max(200),
  matiere: z2.string().min(2, "La mati\xE8re est requise.").max(120),
  semestre: z2.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z2.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]),
  anneeAcademique: z2.string().min(4, "L'ann\xE9e acad\xE9mique est requise.").max(20),
  fichierUrl: z2.string().min(1, "Le fichier est requis.").max(23e6, "Le fichier est trop volumineux (maximum 15 Mo)."),
  fichierNom: z2.string().min(1, "Le nom du fichier est requis.").max(255)
});
var updateSchema = z2.object({
  titre: z2.string().min(2).max(200).optional(),
  matiere: z2.string().min(2).max(120).optional(),
  semestre: z2.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z2.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]).optional(),
  anneeAcademique: z2.string().min(4).max(20).optional()
});
async function resolveMatiere(matiereNom, semestre) {
  const trimmed = matiereNom.trim();
  let matiere = await prisma.matiere.findFirst({ where: { nom: trimmed } });
  if (!matiere) {
    matiere = await prisma.matiere.findFirst({
      where: { nom: { equals: trimmed, mode: "insensitive" } }
    });
  }
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: {
        nom: trimmed,
        code: `AUTO-${Date.now()}`,
        semestre: semestreToDb(semestre)
      }
    });
  }
  return matiere;
}
router2.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { search, matiere, semestre, typeEpreuve, anneeAcademique, statut, page, pageSize } = req.query;
    const where = { visible: true };
    const isAdmin = req.user !== void 0 && (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    where.statut = isAdmin && statut ? statutToDb(statut) : "Publie";
    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { titre: { contains: q, mode: "insensitive" } },
        { anneeAcademique: { contains: q, mode: "insensitive" } },
        { matiere: { nom: { contains: q, mode: "insensitive" } } }
      ];
    }
    if (matiere && matiere !== "Toutes") {
      where.matiere = { nom: matiere };
    }
    if (semestre && semestre !== "Tous") {
      where.semestre = semestreToDb(semestre);
    }
    if (typeEpreuve && typeEpreuve !== "Tous") {
      where.typeEpreuve = typeEpreuve;
    }
    if (anneeAcademique && anneeAcademique !== "Toutes") {
      where.anneeAcademique = anneeAcademique;
    }
    const orderBy = { createdAt: "desc" };
    if (page && pageSize) {
      const [rows2, total] = await Promise.all([
        prisma.document.findMany({ where, include: { matiere: true }, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.document.count({ where })
      ]);
      return res.json({ data: rows2.map(mapDocument), total, page, pageSize });
    }
    const rows = await prisma.document.findMany({ where, include: { matiere: true }, orderBy, take: 500 });
    res.json(rows.map(mapDocument));
  })
);
router2.get(
  "/search",
  searchRateLimiter,
  validate(listQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const query = req.query;
    const isAdmin = req.user !== void 0 && (req.user.role === "Administrateur" || req.user.role === "SuperAdministrateur");
    const result = await searchDocuments({
      search: query.search,
      matiere: query.matiere,
      semestre: query.semestre,
      typeEpreuve: query.typeEpreuve,
      anneeAcademique: query.anneeAcademique,
      statut: isAdmin ? query.statut : void 0,
      page: query.page,
      pageSize: query.pageSize
    });
    res.json(result);
  })
);
router2.get(
  "/suggest",
  suggestRateLimiter,
  validate(suggestQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const suggestions = await suggestDocuments(String(q ?? ""), limit ? Number(limit) : void 0);
    res.json({ data: suggestions });
  })
);
router2.get(
  "/hidden",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.document.findMany({
      where: { visible: false },
      include: { matiere: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(rows.map(mapDocument));
  })
);
var MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
async function loadDocumentPdf(url) {
  if (isSupabaseStorageUrl(url)) {
    const storagePath = url.split(`/storage/v1/object/public/epreuves/`)[1];
    if (!storagePath) throw notFound("Fichier \xE9preuve introuvable.");
    const { data } = await supabaseAdmin.storage.from("epreuves").download(storagePath);
    if (!data) throw notFound("Fichier \xE9preuve introuvable.");
    return Buffer.from(await data.arrayBuffer());
  }
  throw notFound("Fichier \xE9preuve introuvable.");
}
function isPdfBuffer(buffer) {
  const head = buffer.subarray(0, Math.min(buffer.length, 1024 + 5));
  return head.includes(Buffer.from("%PDF-"));
}
function buildAttachmentHeader(safeName) {
  const asciiName = safeName.replace(/[^\x00-\x7F]/g, "_").replace(/["\\]/g, "_") || "epreuve.pdf";
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`;
}
router2.get(
  "/:id/preview",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
    const canPreviewHidden = req.user?.role === "SuperAdministrateur" || req.user?.role === "Administrateur";
    if (!doc || (!doc.visible || doc.statut !== "Publie") && !canPreviewHidden) throw notFound("\xC9preuve non trouv\xE9e.");
    const buffer = await loadDocumentPdf(doc.fichierUrl);
    if (!isPdfBuffer(buffer) || buffer.length > MAX_DOWNLOAD_BYTES) throw notFound("Fichier \xE9preuve introuvable.");
    const stamped = Buffer.from(await stampPdf(buffer));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", String(stamped.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(stamped);
  })
);
var recentUserDocumentDownloads = /* @__PURE__ */ new Map();
var DOWNLOAD_COUNT_COOLDOWN_MS = 5 * 60 * 1e3;
router2.get(
  "/:id/download",
  authenticateJWT,
  downloadRateLimiter,
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    const canDownloadHidden = req.user?.role === "SuperAdministrateur" || req.user?.role === "Administrateur";
    if (!doc || (!doc.visible || doc.statut !== "Publie") && !canDownloadHidden) {
      throw notFound("\xC9preuve non trouv\xE9e.");
    }
    const fileName = doc.fichierNom || `${doc.titre}.pdf`;
    const safeName = fileName.replace(/[^\w.\-éèêëàâîïôûùçÉÈÊËÀÂÎÏÔÛÙÇ]+/g, "_").slice(0, 180) || "epreuve.pdf";
    const buffer = await loadDocumentPdf(doc.fichierUrl);
    if (!isPdfBuffer(buffer) || buffer.length > MAX_DOWNLOAD_BYTES) {
      throw notFound("Fichier \xE9preuve introuvable.");
    }
    const outBuffer = Buffer.from(await stampPdf(buffer));
    const userId = req.user.id;
    const dedupKey = `${userId}::${doc.id}`;
    const nowMs = Date.now();
    const lastMemoryDownload = recentUserDocumentDownloads.get(dedupKey);
    let shouldCountDownload = lastMemoryDownload === void 0 || nowMs - lastMemoryDownload >= DOWNLOAD_COUNT_COOLDOWN_MS;
    if (shouldCountDownload) {
      const recentCutoff = new Date(nowMs - DOWNLOAD_COUNT_COOLDOWN_MS);
      const existingRecentLog = await prisma.userActivity.findFirst({
        where: {
          userId,
          targetId: doc.id,
          actionType: "DOWNLOAD_DOCUMENT",
          timestamp: { gte: recentCutoff }
        }
      }).catch(() => null);
      if (existingRecentLog) {
        shouldCountDownload = false;
      }
    }
    let currentDownloadsCount = doc.telechargementsCount || 0;
    if (shouldCountDownload) {
      recentUserDocumentDownloads.set(dedupKey, nowMs);
      const updated = await prisma.document.update({
        where: { id: doc.id },
        data: { telechargementsCount: { increment: 1 } }
      });
      currentDownloadsCount = updated.telechargementsCount;
      const matiereLabel = doc.matiere?.nom || doc.matiereId;
      await logUserActivity({
        userId,
        userNom: `${req.user.prenom} ${req.user.nom}`,
        userEmail: req.user.email,
        userRole: req.user.role,
        actionType: "DOWNLOAD_DOCUMENT",
        description: `A t\xE9l\xE9charg\xE9 l'\xE9preuve '${doc.titre}' (${matiereLabel}).`,
        targetId: doc.id,
        targetTitle: doc.titre
      });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", buildAttachmentHeader(safeName));
    res.setHeader("Content-Length", String(outBuffer.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Document-Downloads-Count", String(currentDownloadsCount));
    res.send(outBuffer);
  })
);
router2.get(
  "/:id",
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!doc || doc.statut !== "Publie" || !doc.visible) {
      throw notFound("\xC9preuve non trouv\xE9e.");
    }
    res.json(mapDocument(doc));
  })
);
router2.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  express.json({ limit: "22mb" }),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { titre, matiere, semestre, typeEpreuve, anneeAcademique, fichierUrl, fichierNom } = req.body;
    const matiereRow = await resolveMatiere(matiere, semestre);
    const fichierStorageUrl = await resolvePdfUrl(fichierUrl, fichierNom);
    const doc = await prisma.document.create({
      data: {
        titre: titre.trim(),
        matiereId: matiereRow.id,
        semestre: semestreToDb(semestre),
        typeEpreuve,
        anneeAcademique,
        fichierUrl: fichierStorageUrl,
        fichierNom,
        statut: "Publie",
        visible: anneeAcademique !== "2026-2027",
        datePublication: /* @__PURE__ */ new Date()
      }
    });
    if (doc.visible) {
      await prisma.userNotification.create({
        data: {
          userId: "ALL",
          titre: "Nouvelle \xE9preuve disponible",
          message: `${doc.titre} \u2014 ${matiereRow.nom}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
          type: "info",
          linkTab: "exams"
        }
      });
    }
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CREATE_DOCUMENT",
      details: doc.visible ? `A cr\xE9\xE9 et publi\xE9 l'\xE9preuve '${doc.titre}' (${matiere} ${anneeAcademique}).` : `A ajout\xE9 l'\xE9preuve '${doc.titre}' (${matiere} ${anneeAcademique}), masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.status(201).json({
      message: doc.visible ? "Document cr\xE9\xE9 et publi\xE9 avec succ\xE8s." : "\xC9preuve ajout\xE9e et masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.",
      document: mapDocument({ ...doc, matiere: matiereRow })
    });
  })
);
router2.put(
  "/:id/visibility",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam, "params"),
  validate(visibilitySchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id }, include: { matiere: true } });
    if (!existing) throw notFound("\xC9preuve introuvable.");
    const { visible } = req.body;
    if (visible && existing.statut === "Refuse") throw badRequest("Une \xE9preuve refus\xE9e ne peut pas \xEAtre rendue visible.");
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: {
        visible,
        ...visible && existing.statut !== "Publie" ? { statut: "Publie", datePublication: /* @__PURE__ */ new Date() } : {}
      },
      include: { matiere: true }
    });
    if (visible && !existing.visible) {
      await prisma.userNotification.create({
        data: {
          userId: "ALL",
          titre: "Nouvelle \xE9preuve disponible",
          message: `${doc.titre} \u2014 ${doc.matiere.nom}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
          type: "info",
          linkTab: "exams"
        }
      });
    }
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "UPDATE_DOCUMENT",
      details: `${visible ? "A d\xE9masqu\xE9" : "A masqu\xE9"} l'\xE9preuve '${doc.titre}' (${doc.matiere.nom} ${doc.anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.json({
      message: visible ? "\xC9preuve publi\xE9e et d\xE9sormais visible." : "\xC9preuve masqu\xE9e pour les utilisateurs.",
      document: mapDocument(doc)
    });
  })
);
router2.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam, "params"),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouv\xE9.");
    }
    if (!existing.visible && req.user.role !== "SuperAdministrateur") {
      throw forbidden("Seul un super administrateur peut modifier une \xE9preuve masqu\xE9e.");
    }
    const { titre, matiere, semestre, typeEpreuve, anneeAcademique } = req.body;
    let matiereId = existing.matiereId;
    if (matiere) {
      const matiereRow = await resolveMatiere(matiere, semestre ?? (existing.semestre === "Semestre_2" ? "Semestre 2" : "Semestre 1"));
      matiereId = matiereRow.id;
    }
    const doc = await prisma.document.update({
      where: { id: existing.id },
      data: {
        titre: titre ?? existing.titre,
        matiereId,
        semestre: semestre ? semestreToDb(semestre) : existing.semestre,
        typeEpreuve: typeEpreuve ?? existing.typeEpreuve,
        anneeAcademique: anneeAcademique ?? existing.anneeAcademique,
        ...anneeAcademique === "2026-2027" && existing.anneeAcademique !== "2026-2027" && existing.visible ? { visible: false } : {}
      },
      include: { matiere: true }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "UPDATE_DOCUMENT",
      details: `A modifi\xE9 la fiche de l'\xE9preuve '${doc.titre}' (${doc.matiere.nom} ${doc.anneeAcademique}).`,
      targetId: doc.id,
      targetName: doc.titre
    });
    res.json({ message: "Informations mises \xE0 jour avec succ\xE8s.", document: mapDocument(doc) });
  })
);
router2.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam, "params"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.document.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Document non trouv\xE9.");
    }
    if (!existing.visible && req.user.role !== "SuperAdministrateur") {
      throw forbidden("Seul un super administrateur peut supprimer une \xE9preuve masqu\xE9e.");
    }
    await prisma.document.delete({ where: { id: existing.id } });
    await deleteStorageFileByUrl(existing.fichierUrl ?? "");
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "DELETE_DOCUMENT",
      details: `A supprim\xE9 l'\xE9preuve publique '${existing.titre}'.`,
      targetId: existing.id,
      targetName: existing.titre
    });
    res.json({ message: "Document supprim\xE9 avec succ\xE8s." });
  })
);
var documents_default = router2;

// server/routes/contributions.ts
import express2, { Router as Router3 } from "express";
import { z as z3 } from "zod";

// server/config/upload.ts
import multer from "multer";
import path4 from "path";
import fs3 from "fs";
import os from "os";
var uploadsDir = process.env.VERCEL ? path4.join(os.tmpdir(), "uploads") : path4.join(process.cwd(), "uploads");
try {
  if (!fs3.existsSync(uploadsDir)) {
    fs3.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
}
var storage = multer.memoryStorage();
var uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new AppError(400, "Seuls les fichiers PDF (application/pdf) sont accept\xE9s."));
      return;
    }
    cb(null, true);
  }
});

// server/services/notification.service.ts
async function createNotification(userId, titre, message, type = "info", linkTab) {
  return prisma.userNotification.create({
    data: { userId, titre, message, type, linkTab: linkTab ?? null }
  });
}

// server/routes/contributions.ts
var router3 = Router3();
var uuidParam2 = z3.object({ id: z3.string().uuid("Identifiant invalide.") });
var MAX_PREVIEW_BYTES = 25 * 1024 * 1024;
var submitSchema = z3.object({
  anneeAcademique: z3.string().max(20).optional(),
  matiere: z3.string().max(120).optional(),
  semestre: z3.enum(["Semestre 1", "Semestre 2"]).optional(),
  typeEpreuve: z3.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]).optional(),
  titre: z3.string().max(200).optional(),
  commentaire: z3.string().max(2e3).optional(),
  fichierUrl: z3.string().max(23e6, "Le fichier est trop volumineux (maximum 15 Mo).").optional(),
  fichierNom: z3.string().max(255).optional()
});
var approveSchema = z3.object({
  titre: z3.string().min(2, "Le titre est requis.").max(200),
  matiere: z3.string().min(2, "La mati\xE8re est requise.").max(120),
  semestre: z3.enum(["Semestre 1", "Semestre 2"]),
  typeEpreuve: z3.enum(["CC", "SN", "SR", "TD", "TP", "Cours"]),
  anneeAcademique: z3.string().min(4, "L'ann\xE9e acad\xE9mique est requise.").max(20)
});
router3.get(
  "/:id/preview",
  authenticateJWT,
  validate(uuidParam2, "params"),
  asyncHandler(async (req, res) => {
    const contribution = await prisma.contribution.findUnique({
      where: { id: req.params.id },
      include: { document: true }
    });
    if (!contribution || contribution.utilisateurId !== req.user.id && !["Administrateur", "SuperAdministrateur"].includes(req.user.role)) {
      throw notFound("Contribution introuvable.");
    }
    if (contribution.document?.visible === false && !["Administrateur", "SuperAdministrateur"].includes(req.user.role)) {
      throw notFound("\xC9preuve masqu\xE9e.");
    }
    const candidateUrls = [
      contribution.fichierUrl,
      contribution.document?.fichierUrl
    ].filter((u) => Boolean(u && isSupabaseStorageUrl(u)));
    if (!candidateUrls.length) throw notFound("Fichier introuvable.");
    let data = null;
    for (const url of candidateUrls) {
      const storagePath = url.split("/storage/v1/object/public/epreuves/")[1];
      if (!storagePath) continue;
      const resDownload = await supabaseAdmin.storage.from("epreuves").download(storagePath);
      if (resDownload.data) {
        data = resDownload.data;
        break;
      }
    }
    if (!data) throw notFound("Fichier introuvable.");
    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.length > MAX_PREVIEW_BYTES || !buffer.subarray(0, 1029).includes(Buffer.from("%PDF-"))) {
      throw notFound("Fichier introuvable.");
    }
    const stamped = Buffer.from(await stampPdf(buffer));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", String(stamped.length));
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(stamped);
  })
);
router3.get(
  "/my",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.contribution.findMany({
      where: { utilisateurId: req.user.id },
      orderBy: { dateEnvoi: "desc" }
    });
    res.json(rows.map(mapContribution));
  })
);
router3.post(
  "/",
  authenticateJWT,
  express2.json({ limit: "22mb" }),
  uploadPdf.single("fichier"),
  validate(submitSchema),
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const user = req.user;
    let fichierUrl = body.fichierUrl;
    let fichierNom = body.fichierNom || "Epreuve_Soumise.pdf";
    if (req.file) {
      fichierUrl = await uploadPdfBuffer(req.file.buffer, req.file.originalname);
      fichierNom = req.file.originalname;
    } else if (fichierUrl) {
      fichierUrl = await resolvePdfUrl(fichierUrl, fichierNom);
    }
    if (!fichierUrl) {
      throw badRequest("Veuillez joindre un fichier PDF de l'\xE9preuve.");
    }
    const contribution = await prisma.contribution.create({
      data: {
        utilisateurId: user.id,
        utilisateurNom: `${user.prenom} ${user.nom}`,
        utilisateurEmail: user.email,
        anneeAcademique: body.anneeAcademique || "2025-2026",
        matiere: body.matiere || "Analyse 1",
        semestre: body.semestre ? semestreToDb(body.semestre) : "Semestre_1",
        typeEpreuve: body.typeEpreuve || "SN",
        titre: body.titre || null,
        commentaire: body.commentaire?.trim() || null,
        fichierUrl,
        fichierNom,
        statut: "En_attente"
      }
    });
    await logUserActivity(
      {
        userId: user.id,
        userNom: contribution.utilisateurNom,
        userEmail: contribution.utilisateurEmail,
        userRole: user.role,
        actionType: "SUBMIT_CONTRIBUTION",
        description: `A soumis l'\xE9preuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere} ${contribution.anneeAcademique}) pour mod\xE9ration.`,
        targetId: contribution.id,
        targetTitle: contribution.titre || contribution.fichierNom
      }
    );
    await createNotification(
      user.id,
      "Sujet transmis avec succ\xE8s",
      `Votre \xE9preuve '${contribution.titre || contribution.fichierNom}' (${contribution.matiere}) a bien \xE9t\xE9 re\xE7ue et est en cours de mod\xE9ration.`,
      "info"
    );
    await createNotification(
      "ADMINS",
      "Nouvelle \xE9preuve en attente de mod\xE9ration",
      `${contribution.utilisateurNom} a d\xE9pos\xE9 l'\xE9preuve '${contribution.titre || contribution.fichierNom}' pour la mati\xE8re ${contribution.matiere}.`,
      "warning",
      "admin-documents"
    );
    res.status(201).json({
      message: "Votre \xE9preuve a \xE9t\xE9 transmise avec succ\xE8s ! Elle est en cours de validation par l'administration.",
      contribution: mapContribution(contribution)
    });
  })
);
router3.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { statut } = req.query;
    const where = statut ? { statut: statutToDb(statut) } : {};
    const rows = await prisma.contribution.findMany({
      where,
      orderBy: { dateEnvoi: "desc" }
    });
    res.json(rows.map(mapContribution));
  })
);
var approveHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }
  if (contribution.statut !== "En_attente") {
    throw badRequest("Cette contribution a d\xE9j\xE0 \xE9t\xE9 trait\xE9e.");
  }
  const semestre = semestreToDb(body.semestre);
  let matiere = await prisma.matiere.findFirst({ where: { nom: body.matiere } });
  if (!matiere) {
    matiere = await prisma.matiere.create({
      data: { nom: body.matiere, code: `AUTO-${Date.now()}`, semestre }
    });
  }
  const [updated, doc] = await prisma.$transaction([
    prisma.contribution.update({ where: { id }, data: { statut: "Publie" } }),
    prisma.document.create({
      data: {
        titre: body.titre.trim(),
        matiereId: matiere.id,
        semestre,
        typeEpreuve: body.typeEpreuve,
        anneeAcademique: body.anneeAcademique,
        fichierUrl: contribution.fichierUrl,
        fichierNom: contribution.fichierNom,
        statut: "Publie",
        visible: body.anneeAcademique !== "2026-2027",
        datePublication: /* @__PURE__ */ new Date(),
        contributionId: contribution.id
      },
      include: { matiere: true }
    })
  ]);
  if (doc.visible) {
    await prisma.userNotification.create({
      data: {
        userId: "ALL",
        titre: "Nouvelle \xE9preuve disponible",
        message: `${doc.titre} \u2014 ${body.matiere}, ${doc.typeEpreuve} (${doc.anneeAcademique}).`,
        type: "info",
        linkTab: "exams"
      }
    });
  }
  await logAdminAction({
    adminId: req.user.id,
    adminNom: `${req.user.prenom} ${req.user.nom}`,
    adminEmail: req.user.email,
    action: "APPROVE_CONTRIBUTION",
    details: doc.visible ? `A approuv\xE9 et publi\xE9 l'\xE9preuve '${doc.titre}' (${body.matiere} - ${body.typeEpreuve} ${body.anneeAcademique}) soumise par ${contribution.utilisateurNom}.` : `A valid\xE9 l'\xE9preuve '${doc.titre}' (${body.matiere} - ${body.typeEpreuve} ${body.anneeAcademique}) soumise par ${contribution.utilisateurNom}; elle reste masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.`,
    targetId: doc.id,
    targetName: doc.titre
  });
  await createNotification(
    contribution.utilisateurId,
    doc.visible ? "\xC9preuve approuv\xE9e et publi\xE9e" : "\xC9preuve valid\xE9e \u2014 publication \xE0 venir",
    doc.visible ? `F\xE9licitations ! Votre sujet '${doc.titre}' pour ${body.matiere} a \xE9t\xE9 valid\xE9 par l'administration et est d\xE9sormais disponible en ligne.` : `F\xE9licitations ! Votre sujet '${doc.titre}' pour ${body.matiere} a \xE9t\xE9 valid\xE9. Il sera visible apr\xE8s publication par un super administrateur.`,
    "success",
    "exams"
  );
  res.json({
    message: doc.visible ? "Document approuv\xE9 et publi\xE9 avec succ\xE8s sur la plateforme !" : "\xC9preuve 2026-2027 approuv\xE9e et masqu\xE9e jusqu'\xE0 sa publication par un super administrateur.",
    document: mapDocument(doc),
    contribution: mapContribution(updated)
  });
});
var rejectHandler = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const contribution = await prisma.contribution.findUnique({ where: { id } });
  if (!contribution) {
    throw notFound("Contribution introuvable.");
  }
  if (contribution.statut !== "En_attente") {
    throw badRequest("Cette contribution a d\xE9j\xE0 \xE9t\xE9 trait\xE9e.");
  }
  const updated = await prisma.contribution.update({
    where: { id },
    data: { statut: "Refuse" }
  });
  await deleteStorageFileByUrl(contribution.fichierUrl ?? "");
  await logAdminAction({
    adminId: req.user.id,
    adminNom: `${req.user.prenom} ${req.user.nom}`,
    adminEmail: req.user.email,
    action: "REJECT_CONTRIBUTION",
    details: `A refus\xE9 la contribution '${contribution.titre || contribution.fichierNom}' soumise par ${contribution.utilisateurNom}.`,
    targetId: contribution.id,
    targetName: contribution.fichierNom
  });
  await createNotification(
    contribution.utilisateurId,
    "Soumission non retenue",
    `Votre soumission '${contribution.titre || contribution.fichierNom}' pour ${contribution.matiere} n'a pas \xE9t\xE9 valid\xE9e par l'administration.`,
    "error"
  );
  res.json({ message: "Contribution refus\xE9e.", contribution: mapContribution(updated) });
});
router3.put("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), validate(approveSchema), approveHandler);
router3.post("/:id/approve", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), validate(approveSchema), approveHandler);
router3.put("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), rejectHandler);
router3.post("/:id/reject", authenticateJWT, requireRole("Administrateur", "SuperAdministrateur"), validate(uuidParam2, "params"), rejectHandler);
var contributions_default = router3;

// server/routes/matieres.ts
import { Router as Router4 } from "express";
import { z as z4 } from "zod";
var router4 = Router4();
var uuidParam3 = z4.object({ id: z4.string().uuid("Identifiant invalide.") });
var createSchema2 = z4.object({
  nom: z4.string().min(2, "Le nom de la mati\xE8re est requis.").max(120),
  code: z4.string().min(2, "Le code est requis.").max(20),
  semestre: z4.enum(["Semestre 1", "Semestre 2"]),
  description: z4.string().max(500).optional()
});
var updateSchema2 = createSchema2.partial();
router4.get(
  "/",
  asyncHandler(async (_req, res) => {
    const matieres = await prisma.matiere.findMany({ orderBy: [{ semestre: "asc" }, { nom: "asc" }] });
    const docsByMatiere = await prisma.document.groupBy({
      by: ["matiereId"],
      where: { statut: "Publie", visible: true },
      _count: { _all: true }
    });
    const countMap = new Map(docsByMatiere.map((d) => [d.matiereId, d._count._all]));
    res.json(matieres.map((m) => mapMatiere(m, countMap.get(m.id) ?? 0)));
  })
);
router4.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema2),
  asyncHandler(async (req, res) => {
    const { nom, code, semestre, description } = req.body;
    const existing = await prisma.matiere.findUnique({ where: { code: code.trim() } });
    if (existing) {
      throw badRequest("Un code de mati\xE8re existe d\xE9j\xE0.");
    }
    const matiere = await prisma.matiere.create({
      data: { nom: nom.trim(), code: code.trim(), semestre: semestreToDb(semestre), description: description?.trim() || null }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "ADD_MATIERE",
      details: `A ajout\xE9 la mati\xE8re '${matiere.nom}' (${matiere.code}).`,
      targetId: matiere.id,
      targetName: matiere.nom
    });
    res.status(201).json({ message: "Mati\xE8re cr\xE9\xE9e avec succ\xE8s.", matiere: mapMatiere(matiere, 0) });
  })
);
router4.put(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam3, "params"),
  validate(updateSchema2),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Mati\xE8re introuvable.");
    }
    const { nom, code, semestre, description } = req.body;
    const matiere = await prisma.matiere.update({
      where: { id: existing.id },
      data: {
        nom: nom?.trim() ?? existing.nom,
        code: code?.trim() ?? existing.code,
        semestre: semestre ? semestreToDb(semestre) : existing.semestre,
        description: description !== void 0 ? description.trim() || null : existing.description
      }
    });
    res.json({ message: "Mati\xE8re mise \xE0 jour avec succ\xE8s.", matiere: mapMatiere(matiere, 0) });
  })
);
router4.delete(
  "/:id",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam3, "params"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.matiere.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw notFound("Mati\xE8re introuvable.");
    }
    await prisma.matiere.delete({ where: { id: existing.id } });
    res.json({ message: "Mati\xE8re supprim\xE9e avec succ\xE8s." });
  })
);
var matieres_default = router4;

// server/routes/users.ts
import { Router as Router5 } from "express";
import { z as z5 } from "zod";
import { randomBytes as randomBytes2 } from "crypto";
var router5 = Router5();
var uuidParam4 = z5.object({ id: z5.string().uuid("Identifiant invalide.") });
var nullableCameroonPhoneSchema = z5.preprocess((val) => {
  if (val === null) return null;
  if (typeof val !== "string") return void 0;
  const trimmed = val.trim();
  if (!trimmed || trimmed === "+237") return null;
  return normalizePhoneNumber(trimmed);
}, z5.string().regex(/^\+237[0-9]{9}$/, "Num\xE9ro de t\xE9l\xE9phone invalide : saisissez les 9 chiffres apr\xE8s +237 (ex : 655123456).").optional().nullable());
var profileSchema = z5.object({
  nom: z5.string().min(1).max(80).optional(),
  prenom: z5.string().min(1).max(80).optional(),
  email: z5.string().email().max(200).optional(),
  telephone: nullableCameroonPhoneSchema,
  currentMotDePasse: z5.string().min(1).max(128).optional(),
  nouveauMotDePasse: z5.string().min(8, "Le mot de passe doit contenir au moins 8 caract\xE8res.").max(128).regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.").regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.").optional()
});
var createUserSchema = z5.object({
  nom: z5.string().min(1).max(80),
  prenom: z5.string().min(1).max(80),
  email: z5.string().email().max(200),
  role: z5.enum(["Etudiant", "Administrateur", "SuperAdministrateur"]).optional(),
  telephone: nullableCameroonPhoneSchema,
  motDePasse: z5.string().min(8).max(128).regex(/[a-zA-Z]/).regex(/[0-9]/).optional()
});
var updateRoleSchema = z5.object({
  role: z5.enum(["Etudiant", "Administrateur", "SuperAdministrateur"])
});
router5.get(
  "/favorites",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    if (error || !data.user) {
      return res.json({ favorites: [] });
    }
    const raw = data.user.user_metadata?.favorites;
    const favs = Array.isArray(raw) ? raw.filter((id) => typeof id === "string" && id.length > 0) : [];
    res.json({ favorites: favs });
  })
);
var toggleFavoriteSchema = z5.object({
  documentId: z5.string().uuid("Identifiant de document invalide.")
});
router5.post(
  "/favorites/toggle",
  authenticateJWT,
  validate(toggleFavoriteSchema),
  asyncHandler(async (req, res) => {
    const { documentId } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(req.user.id);
    if (error || !data.user) {
      throw notFound("Compte utilisateur introuvable.");
    }
    const raw = data.user.user_metadata?.favorites;
    const currentFavs = Array.isArray(raw) ? raw.filter((id) => typeof id === "string" && id.length > 0) : [];
    const isFav = currentFavs.includes(documentId);
    const updatedFavs = isFav ? currentFavs.filter((id) => id !== documentId) : [...currentFavs, documentId];
    const currentMeta = data.user.user_metadata || {};
    await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      user_metadata: {
        ...currentMeta,
        favorites: updatedFavs
      }
    });
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    await logUserActivity({
      userId: req.user.id,
      userNom: `${req.user.prenom} ${req.user.nom}`,
      userEmail: req.user.email,
      userRole: req.user.role,
      actionType: isFav ? "FAVORITE_REMOVE" : "FAVORITE_ADD",
      description: isFav ? `A retir\xE9 l'\xE9preuve '${doc?.titre || documentId}' de ses favoris.` : `A ajout\xE9 l'\xE9preuve '${doc?.titre || documentId}' \xE0 ses favoris de r\xE9vision.`,
      targetId: documentId,
      targetTitle: doc?.titre
    });
    res.json({
      favorites: updatedFavs,
      isFavorite: !isFav,
      message: !isFav ? "\xC9preuve ajout\xE9e \xE0 vos favoris !" : "\xC9preuve retir\xE9e de vos favoris."
    });
  })
);
router5.put(
  "/profile",
  authenticateJWT,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    const { nom, prenom, email, telephone, nouveauMotDePasse, currentMotDePasse } = req.body;
    let newEmail = user.email;
    if (email && email.trim().toLowerCase() !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existing) {
        throw badRequest("Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e par un autre compte.");
      }
      newEmail = email.trim().toLowerCase();
    }
    const newTelephone = telephone !== void 0 ? telephone?.trim() || null : user.telephone;
    const requiresReauthentication = newEmail !== user.email || !!nouveauMotDePasse;
    if (requiresReauthentication) {
      if (!currentMotDePasse) {
        throw badRequest("Confirmez votre mot de passe actuel pour modifier l'e-mail ou le mot de passe.");
      }
      await signInSupabase(user.email, currentMotDePasse);
    }
    if (newEmail !== user.email) {
      await updateSupabaseEmail(user.id, newEmail);
    }
    if (newTelephone !== user.telephone) {
      await updateSupabasePhone(user.id, newTelephone);
    }
    if (nouveauMotDePasse) {
      await updateSupabasePassword(user.id, nouveauMotDePasse.trim());
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        nom: nom?.trim().toUpperCase() ?? user.nom,
        prenom: prenom?.trim() ?? user.prenom,
        email: newEmail,
        telephone: newTelephone
      }
    });
    res.json({ user: mapUser(updated), message: "Vos informations de profil ont \xE9t\xE9 mises \xE0 jour avec succ\xE8s !" });
  })
);
router5.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    res.json(users.map(mapUser));
  })
);
router5.get(
  "/:id/details",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(uuidParam4, "params"),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    const [supaUserRes, activities, userContribs] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(target.id).catch(() => ({ data: { user: null }, error: null })),
      prisma.userActivity.findMany({
        where: { userId: target.id },
        orderBy: { timestamp: "desc" }
      }).catch(() => []),
      prisma.contribution.findMany({
        where: { utilisateurId: target.id },
        orderBy: { dateEnvoi: "desc" }
      }).catch(() => [])
    ]);
    const supaUser = supaUserRes?.data?.user ?? null;
    const loginActivities = activities.filter((a) => a.actionType === "LOGIN" || a.actionType === "REGISTER").map(mapActivity);
    const lastSignInAt = supaUser?.last_sign_in_at || loginActivities[0]?.timestamp || null;
    const lastLogins = [...loginActivities];
    if (supaUser?.last_sign_in_at) {
      const supaTime = new Date(supaUser.last_sign_in_at).getTime();
      const hasCloseMatch = lastLogins.some(
        (l) => Math.abs(new Date(l.timestamp).getTime() - supaTime) < 60 * 1e3
      );
      if (!hasCloseMatch) {
        lastLogins.unshift({
          id: `supa-login-${target.id}`,
          userId: target.id,
          userNom: `${target.prenom} ${target.nom}`,
          userEmail: target.email,
          userRole: target.role,
          actionType: "LOGIN",
          description: "Session authentifi\xE9e sur la plateforme Revisio ISJ.",
          targetId: "",
          targetTitle: "",
          timestamp: new Date(supaUser.last_sign_in_at).toISOString()
        });
      }
    }
    lastLogins.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const rawFavs = supaUser?.user_metadata?.favorites;
    let favoriteIds = Array.isArray(rawFavs) ? rawFavs.filter((id) => typeof id === "string" && id.length > 0) : [];
    if (favoriteIds.length === 0) {
      const reconstructed = /* @__PURE__ */ new Set();
      const chronological = [...activities].reverse();
      for (const act of chronological) {
        if (act.actionType === "FAVORITE_ADD" && act.targetId) {
          reconstructed.add(act.targetId);
        } else if (act.actionType === "FAVORITE_REMOVE" && act.targetId) {
          reconstructed.delete(act.targetId);
        }
      }
      favoriteIds = Array.from(reconstructed);
    }
    let favoriteDocuments = [];
    if (favoriteIds.length > 0) {
      const docs = await prisma.document.findMany({
        where: { id: { in: favoriteIds } },
        include: { matiere: true }
      }).catch(() => []);
      favoriteDocuments = docs.map(mapDocument);
    }
    const mappedContribs = userContribs.map(mapContribution);
    const pendingContributions = mappedContribs.filter((c) => c.statut === "En attente");
    res.json({
      user: mapUser(target),
      lastSignInAt,
      lastLogins: lastLogins.slice(0, 10),
      favoriteIds,
      favoriteDocuments,
      pendingContributions,
      allContributions: mappedContribs,
      recentActivities: activities.slice(0, 12).map(mapActivity)
    });
  })
);
router5.post(
  "/",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const { nom, prenom, email, role, telephone, motDePasse } = req.body;
    const trimmedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      throw badRequest("Un utilisateur avec cet e-mail existe d\xE9j\xE0.");
    }
    const assignedRole = role ?? "Administrateur";
    const trimmedTelephone = telephone?.trim() || null;
    const temporaryPassword = motDePasse?.trim() || `${randomBytes2(18).toString("base64url")}aA1!`;
    const authId = await createSupabaseUser(trimmedEmail, temporaryPassword, trimmedTelephone ?? void 0);
    const user = await prisma.user.create({
      data: {
        id: authId,
        nom: nom.trim().toUpperCase(),
        prenom: prenom.trim(),
        email: trimmedEmail,
        telephone: trimmedTelephone,
        role: assignedRole
      }
    });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CREATE_USER",
      details: `A cr\xE9\xE9 le compte '${user.prenom} ${user.nom}' (${user.email}) attribu\xE9 au r\xF4le '${user.role}'.`,
      targetId: user.id,
      targetName: `${user.prenom} ${user.nom}`
    });
    res.status(201).json({
      message: motDePasse ? "Utilisateur cr\xE9\xE9 avec succ\xE8s." : "Utilisateur cr\xE9\xE9 avec succ\xE8s. Un mot de passe temporaire al\xE9atoire lui a \xE9t\xE9 attribu\xE9.",
      user: mapUser(user),
      ...motDePasse ? {} : { temporaryPassword }
    });
  })
);
router5.put(
  "/:id/role",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam4, "params"),
  validate(updateRoleSchema),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    if (target.id === req.user.id) {
      throw forbidden("Vous ne pouvez pas modifier votre propre r\xF4le.");
    }
    const { role } = req.body;
    const oldRole = target.role;
    const updated = await prisma.user.update({ where: { id: target.id }, data: { role } });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "CHANGE_USER_ROLE",
      details: `A modifi\xE9 le r\xF4le de ${updated.prenom} ${updated.nom} (${updated.email}) de '${oldRole}' \xE0 '${role}'.`,
      targetId: updated.id,
      targetName: `${updated.prenom} ${updated.nom}`
    });
    await createNotification(
      updated.id,
      "\xC9l\xE9vation / Modification de R\xF4le",
      `F\xE9licitations ! Vos privil\xE8ges syst\xE8me sur la plateforme ISJ Revisio ont \xE9t\xE9 mis \xE0 jour au statut '${role}'.`,
      role === "Administrateur" || role === "SuperAdministrateur" ? "success" : "info",
      role === "Administrateur" ? "admin-documents" : role === "SuperAdministrateur" ? "super-admin-audit" : void 0
    );
    res.json({ message: "Le r\xF4le a \xE9t\xE9 mis \xE0 jour avec succ\xE8s.", user: mapUser(updated) });
  })
);
router5.delete(
  "/:id",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  validate(uuidParam4, "params"),
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) {
      throw notFound("Utilisateur non trouv\xE9.");
    }
    if (target.id === req.user.id) {
      throw forbidden("Vous ne pouvez pas supprimer votre propre compte.");
    }
    await deleteSupabaseUser(target.id);
    await prisma.user.delete({ where: { id: target.id } });
    await logAdminAction({
      adminId: req.user.id,
      adminNom: `${req.user.prenom} ${req.user.nom}`,
      adminEmail: req.user.email,
      action: "DELETE_USER",
      details: `A supprim\xE9 le compte '${target.prenom} ${target.nom}' (${target.email}, r\xF4le ${target.role}).`,
      targetId: target.id,
      targetName: `${target.prenom} ${target.nom}`
    });
    res.json({ message: "Compte supprim\xE9 avec succ\xE8s." });
  })
);
var users_default = router5;

// server/routes/activities.ts
import { Router as Router6 } from "express";
import { z as z6 } from "zod";
var router6 = Router6();
var uuidParam5 = z6.object({ id: z6.string().uuid("Identifiant invalide.") });
var ALLOWED_ACTION_TYPES = [
  "REGISTER",
  "LOGIN",
  "DOWNLOAD_DOCUMENT",
  "SUBMIT_CONTRIBUTION",
  "APPROVE_CONTRIBUTION",
  "REJECT_CONTRIBUTION",
  "CREATE_DOCUMENT",
  "DELETE_DOCUMENT",
  "ADD_MATIERE",
  "UPDATE_DOCUMENT",
  "DELETE_USER",
  "CREATE_USER",
  "CHANGE_USER_ROLE"
];
var listQuerySchema2 = z6.object({
  actionType: z6.string().max(50).optional(),
  actionTypes: z6.string().max(300).optional(),
  search: z6.string().max(200).optional(),
  page: z6.coerce.number().int().positive().optional(),
  pageSize: z6.coerce.number().int().positive().max(100).optional()
});
var createSchema3 = z6.object({
  actionType: z6.enum(ALLOWED_ACTION_TYPES),
  description: z6.string().min(1, "La description est requise.").max(500, "La description est trop longue."),
  targetId: z6.string().uuid().optional(),
  targetTitle: z6.string().max(200).optional()
});
router6.get(
  "/",
  authenticateJWT,
  validate(listQuerySchema2, "query"),
  asyncHandler(async (req, res) => {
    const { actionType, actionTypes, search, page = 1, pageSize = 50 } = req.query;
    const user = req.user;
    const where = {};
    if (user.role !== "SuperAdministrateur") {
      where.userId = user.id;
    }
    if (actionTypes) {
      const types = actionTypes.split(",").map((t) => t.trim()).filter(Boolean);
      if (types.length) {
        where.actionType = { in: types };
      }
    } else if (actionType && actionType !== "all") {
      where.actionType = actionType;
    }
    if (search) {
      const q = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { userNom: { contains: q, mode: "insensitive" } },
            { userEmail: { contains: q, mode: "insensitive" } },
            { actionType: { contains: q, mode: "insensitive" } },
            { targetTitle: { contains: q, mode: "insensitive" } }
          ]
        }
      ];
    }
    const [rows, total, groupAgg] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.userActivity.count({ where }),
      prisma.userActivity.groupBy({
        by: ["actionType"],
        where: user.role !== "SuperAdministrateur" ? { userId: user.id } : {},
        _count: { _all: true }
      })
    ]);
    const countByType = {};
    for (const g of groupAgg) {
      countByType[g.actionType] = g._count._all;
    }
    const counts = Object.fromEntries(
      Object.entries(CATEGORY_ACTION_TYPES).map(([key, types]) => [
        key,
        types.reduce((sum, t) => sum + (countByType[t] ?? 0), 0)
      ])
    );
    res.json({
      data: rows.map(mapActivity),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      counts
    });
  })
);
var CATEGORY_ACTION_TYPES = {
  download: ["DOWNLOAD_DOCUMENT"],
  submit: ["SUBMIT_CONTRIBUTION"],
  moderation: ["APPROVE_CONTRIBUTION", "REJECT_CONTRIBUTION", "CREATE_DOCUMENT", "DELETE_DOCUMENT"]
};
router6.post(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  validate(createSchema3),
  asyncHandler(async (req, res) => {
    const { actionType, description, targetId, targetTitle } = req.body;
    const user = req.user;
    const act = await logUserActivity({
      userId: user.id,
      userNom: `${user.prenom} ${user.nom}`,
      userEmail: user.email,
      userRole: user.role,
      actionType,
      description,
      targetId,
      targetTitle
    });
    res.status(201).json(mapActivity(act));
  })
);
var activities_default = router6;

// server/routes/notifications.ts
import { Router as Router7 } from "express";
import { z as z7 } from "zod";
var router7 = Router7();
var uuidParam6 = z7.object({ id: z7.string().uuid("Identifiant invalide.") });
function visibleIds(user) {
  if (user.role === "Administrateur" || user.role === "SuperAdministrateur") {
    return [user.id, "ALL", "ADMINS"];
  }
  return [user.id, "ALL"];
}
function receiptKey(userId, notificationId) {
  return { userId_notificationId: { userId, notificationId } };
}
router7.get(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(req.user) } },
      orderBy: { createdAt: "desc" }
    });
    const receipts = await prisma.notificationReceipt.findMany({
      where: { userId: req.user.id, notificationId: { in: rows.map((row) => row.id) } }
    });
    const receiptsByNotification = new Map(receipts.map((receipt) => [receipt.notificationId, receipt]));
    const visibleRows = rows.flatMap((row) => {
      const receipt = receiptsByNotification.get(row.id);
      if (receipt?.deletedAt) return [];
      const isShared = row.userId !== req.user.id;
      return [mapNotification({
        ...row,
        lue: isShared ? !!receipt?.readAt : row.lue || !!receipt?.readAt
      })];
    });
    res.json(visibleRows);
  })
);
router7.put(
  "/read-all",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const rows = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user) } },
      select: { id: true, userId: true }
    });
    const personalIds = rows.filter((row) => row.userId === user.id).map((row) => row.id);
    const sharedIds = rows.filter((row) => row.userId !== user.id).map((row) => row.id);
    const readAt = /* @__PURE__ */ new Date();
    await prisma.$transaction([
      prisma.userNotification.updateMany({
        where: { id: { in: personalIds }, userId: user.id },
        data: { lue: true }
      }),
      ...sharedIds.map((notificationId) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, notificationId),
        create: { userId: user.id, notificationId, readAt },
        update: { readAt, deletedAt: null }
      }))
    ]);
    res.json({ message: "Toutes les notifications ont \xE9t\xE9 marqu\xE9es comme lues.", count: rows.length });
  })
);
router7.put(
  "/:id/read",
  authenticateJWT,
  validate(uuidParam6, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    if (notif.userId === req.user.id) {
      const updated = await prisma.userNotification.update({
        where: { id: notif.id },
        data: { lue: true }
      });
      return res.json({ message: "Notification marqu\xE9e comme lue.", notification: mapNotification(updated) });
    }
    const readAt = /* @__PURE__ */ new Date();
    await prisma.notificationReceipt.upsert({
      where: receiptKey(req.user.id, notif.id),
      create: { userId: req.user.id, notificationId: notif.id, readAt },
      update: { readAt, deletedAt: null }
    });
    res.json({
      message: "Notification marqu\xE9e comme lue.",
      notification: mapNotification({ ...notif, lue: true })
    });
  })
);
router7.delete(
  "/",
  authenticateJWT,
  asyncHandler(async (req, res) => {
    const user = req.user;
    const shared = await prisma.userNotification.findMany({
      where: { userId: { in: visibleIds(user), not: user.id } },
      select: { id: true }
    });
    const deletedAt = /* @__PURE__ */ new Date();
    const results = await prisma.$transaction([
      prisma.userNotification.deleteMany({ where: { userId: user.id } }),
      ...shared.map(({ id }) => prisma.notificationReceipt.upsert({
        where: receiptKey(user.id, id),
        create: { userId: user.id, notificationId: id, deletedAt },
        update: { deletedAt }
      }))
    ]);
    res.json({ message: "Toutes les notifications ont \xE9t\xE9 effac\xE9es.", count: results[0].count + shared.length });
  })
);
router7.delete(
  "/:id",
  authenticateJWT,
  validate(uuidParam6, "params"),
  asyncHandler(async (req, res) => {
    const notif = await prisma.userNotification.findUnique({ where: { id: req.params.id } });
    if (!notif || !visibleIds(req.user).includes(notif.userId)) {
      throw notFound("Notification introuvable.");
    }
    if (notif.userId === req.user.id) {
      await prisma.userNotification.delete({ where: { id: notif.id } });
    } else {
      const deletedAt = /* @__PURE__ */ new Date();
      await prisma.notificationReceipt.upsert({
        where: receiptKey(req.user.id, notif.id),
        create: { userId: req.user.id, notificationId: notif.id, deletedAt },
        update: { deletedAt }
      });
    }
    res.json({ message: "Notification supprim\xE9e." });
  })
);
var notifications_default = router7;

// server/routes/stats.ts
import { Router as Router8 } from "express";
var router8 = Router8();
async function computeStats() {
  const [totalUsers, totalDocuments, documentsPublies, documentsEnAttente, totalContributions, totalAuditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.document.count(),
    prisma.document.count({ where: { statut: "Publie", visible: true } }),
    prisma.contribution.count({ where: { statut: "En_attente" } }),
    prisma.contribution.count(),
    prisma.auditLog.count()
  ]);
  return {
    totalUsers,
    totalDocuments,
    documentsPublies,
    documentsEnAttente,
    totalContributions,
    totalAuditLogs
  };
}
router8.get(
  "/daily-analytics",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const daysParam = Number(req.query.days) || 30;
    const daysCount = Math.min(Math.max(daysParam, 7), 90);
    const now = /* @__PURE__ */ new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);
    const [activities, contributions, dbUsers, supaUsersRes] = await Promise.all([
      prisma.userActivity.findMany({
        where: {
          actionType: {
            in: ["DOWNLOAD_DOCUMENT", "SUBMIT_CONTRIBUTION", "LOGIN", "REGISTER"]
          },
          timestamp: { gte: startDate }
        },
        orderBy: { timestamp: "desc" },
        take: 1e4
      }).catch(() => []),
      prisma.contribution.findMany({
        where: { dateEnvoi: { gte: startDate } },
        orderBy: { dateEnvoi: "desc" },
        take: 2e3
      }).catch(() => []),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" }
      }).catch(() => []),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }).catch(() => ({ data: { users: [] }, error: null }))
    ]);
    const mappedActivities = activities.map(mapActivity);
    const mappedContributions = contributions.map(mapContribution);
    const userById = /* @__PURE__ */ new Map();
    for (const u of dbUsers) {
      userById.set(u.id, u);
    }
    const supaUsers = supaUsersRes?.data?.users || [];
    const syntheticLogins = [];
    for (const su of supaUsers) {
      if (!su?.last_sign_in_at) continue;
      const signInDate = new Date(su.last_sign_in_at);
      if (isNaN(signInDate.getTime()) || signInDate < startDate) continue;
      const dbUser = userById.get(su.id);
      const hasCloseMatch = mappedActivities.some(
        (a) => (a.actionType === "LOGIN" || a.actionType === "REGISTER") && a.userId === su.id && Math.abs(new Date(a.timestamp).getTime() - signInDate.getTime()) < 5 * 60 * 1e3
      );
      if (!hasCloseMatch && dbUser) {
        syntheticLogins.push({
          id: `supa-signin-${dbUser.id}-${signInDate.getTime()}`,
          userId: dbUser.id,
          userNom: `${dbUser.prenom} ${dbUser.nom}`,
          userEmail: dbUser.email,
          userRole: dbUser.role,
          actionType: "LOGIN",
          description: "S'est connect\xE9 \xE0 la plateforme ISJ Revisio.",
          targetId: void 0,
          targetTitle: void 0,
          timestamp: signInDate.toISOString()
        });
      }
    }
    const allEvents = [...mappedActivities, ...syntheticLogins].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const toDateKey = (iso) => {
      try {
        const d = new Date(iso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return iso.slice(0, 10);
      }
    };
    const dailyMap = /* @__PURE__ */ new Map();
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const fullLabel = d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
      dailyMap.set(key, {
        dateIso: key,
        label,
        fullLabel,
        downloads: 0,
        contributions: 0,
        logins: 0,
        uniqueConnectedUsers: /* @__PURE__ */ new Set(),
        connectedUserNames: /* @__PURE__ */ new Set(),
        downloadedDocTitles: /* @__PURE__ */ new Set(),
        contributedDocTitles: /* @__PURE__ */ new Set()
      });
    }
    const countedContribDates = /* @__PURE__ */ new Set();
    for (const act of allEvents) {
      const key = toDateKey(act.timestamp);
      const bucket = dailyMap.get(key);
      if (!bucket) continue;
      if (act.actionType === "DOWNLOAD_DOCUMENT") {
        bucket.downloads += 1;
        if (act.targetTitle) bucket.downloadedDocTitles.add(act.targetTitle);
      } else if (act.actionType === "SUBMIT_CONTRIBUTION") {
        bucket.contributions += 1;
        if (act.targetId) countedContribDates.add(act.targetId);
        if (act.targetTitle) bucket.contributedDocTitles.add(act.targetTitle);
      } else if (act.actionType === "LOGIN" || act.actionType === "REGISTER") {
        bucket.logins += 1;
        bucket.uniqueConnectedUsers.add(act.userId || act.userEmail);
        if (act.userNom) bucket.connectedUserNames.add(act.userNom);
      }
    }
    for (const c of mappedContributions) {
      if (countedContribDates.has(c.id)) continue;
      const key = toDateKey(c.dateEnvoi);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.contributions += 1;
        if (c.titre || c.fichierNom) {
          bucket.contributedDocTitles.add(c.titre || c.fichierNom);
        }
      }
    }
    const dailySeries = Array.from(dailyMap.values()).map((b) => ({
      dateIso: b.dateIso,
      label: b.label,
      fullLabel: b.fullLabel,
      downloads: b.downloads,
      contributions: b.contributions,
      logins: b.logins,
      uniqueUsers: b.uniqueConnectedUsers.size,
      connectedUsersList: Array.from(b.connectedUserNames).slice(0, 4),
      downloadedDocsList: Array.from(b.downloadedDocTitles).slice(0, 3),
      contributedDocsList: Array.from(b.contributedDocTitles).slice(0, 3)
    }));
    const downloadEvents = allEvents.filter((a) => a.actionType === "DOWNLOAD_DOCUMENT").slice(0, 60);
    const loginEvents = allEvents.filter((a) => a.actionType === "LOGIN" || a.actionType === "REGISTER").slice(0, 60);
    const contributionEvents = mappedContributions.slice(0, 60).map((c) => ({
      id: c.id,
      userId: c.utilisateurId,
      userNom: c.utilisateurNom,
      userEmail: c.utilisateurEmail,
      userRole: userById.get(c.utilisateurId)?.role || "Etudiant",
      actionType: "SUBMIT_CONTRIBUTION",
      description: `A soumis \xAB ${c.titre || c.fichierNom} \xBB (${c.matiere || "Mati\xE8re"} \u2022 ${c.typeEpreuve || "\xC9preuve"})`,
      targetId: c.id,
      targetTitle: c.titre || c.fichierNom,
      matiere: c.matiere,
      typeEpreuve: c.typeEpreuve,
      statut: c.statut,
      timestamp: c.dateEnvoi
    }));
    res.json({
      dailySeries,
      downloadEvents,
      loginEvents,
      contributionEvents
    });
  })
);
router8.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
router8.get(
  "/stats",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
router8.get(
  "/dashboard",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);
var stats_default = router8;

// server/routes/admin.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.get(
  "/audit-logs",
  authenticateJWT,
  requireRole("SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const { adminId, action, search } = req.query;
    const where = {};
    if (adminId && adminId !== "all") {
      where.OR = [{ adminId }, { adminEmail: { equals: adminId.toLowerCase(), mode: "insensitive" } }];
    }
    if (action && action !== "all") {
      where.action = action;
    }
    if (search) {
      const q = search.toLowerCase();
      where.AND = [
        {
          OR: [
            { details: { contains: q, mode: "insensitive" } },
            { adminNom: { contains: q, mode: "insensitive" } },
            { adminEmail: { contains: q, mode: "insensitive" } },
            { targetName: { contains: q, mode: "insensitive" } }
          ]
        }
      ];
    }
    const rows = await prisma.auditLog.findMany({ where, orderBy: { date: "desc" } });
    res.json(rows.map(mapAuditLog));
  })
);
var admin_default = router9;

// server/routes/contact.ts
import { Router as Router10 } from "express";
import { z as z8 } from "zod";
import { randomUUID as randomUUID5 } from "crypto";

// server/services/feedback.service.ts
import { promises as fs4 } from "fs";
import path5 from "path";
import os2 from "os";
var DATA_DIR2 = process.env.VERCEL ? path5.join(os2.tmpdir(), "data") : path5.join(process.cwd(), "data");
var FILE = path5.join(DATA_DIR2, "contact-messages.json");
var writeQueue = Promise.resolve();
async function readRecords() {
  try {
    const raw = await fs4.readFile(FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
async function appendFeedback(record) {
  writeQueue = writeQueue.then(async () => {
    const rows = await readRecords();
    rows.push(record);
    await fs4.mkdir(DATA_DIR2, { recursive: true });
    await fs4.writeFile(FILE, JSON.stringify(rows, null, 2), "utf8");
  });
  return writeQueue;
}
async function feedbackFileExists() {
  try {
    await fs4.access(FILE);
    return true;
  } catch {
    return false;
  }
}
function getFeedbackFilePath() {
  return FILE;
}

// server/routes/contact.ts
var router10 = Router10();
var contactSchema = z8.object({
  nom: z8.string().min(1, "Le nom est requis.").max(100, "Le nom est trop long."),
  email: z8.string().email("Adresse e-mail invalide.").max(200),
  sujet: z8.string().max(150, "Le sujet est trop long.").optional(),
  message: z8.string().min(1, "Le message est requis.").max(2e3, "Le message est trop long."),
  categorie: z8.string().max(50, "La cat\xE9gorie est trop longue.").optional()
});
router10.post(
  "/",
  authRateLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { nom, email, sujet, message, categorie } = req.body;
    await appendFeedback({
      id: randomUUID5(),
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      categorie: String(categorie ?? "").trim() || "G\xE9n\xE9ral",
      sujet: String(sujet ?? "").trim(),
      message: String(message).trim(),
      date: (/* @__PURE__ */ new Date()).toISOString()
    });
    res.json({ message: "Message envoy\xE9 avec succ\xE8s. L'\xE9quipe ISJ vous r\xE9pondra rapidement." });
  })
);
router10.get(
  "/feedback",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const file = getFeedbackFilePath();
    if (!await feedbackFileExists()) {
      return res.status(404).json({ message: "Aucun retour utilisateur pour le moment." });
    }
    res.download(file, `retours-utilisateurs-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`);
  })
);
var contact_default = router10;

// server/middlewares/errorHandler.ts
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }
  if (err && typeof err === "object") {
    const e = err;
    if (e.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Corps de requ\xEAte invalide (JSON malform\xE9)." });
    }
    if (e.type === "entity.too.large") {
      return res.status(413).json({ message: "Corps de requ\xEAte trop volumineux." });
    }
    if (e.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Fichier trop volumineux (maximum 15 Mo)." });
    }
    if (e.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Champ de fichier invalide." });
    }
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Ressource introuvable." });
    }
    if (e.code === "P2023") {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Conflit : une ressource identique existe d\xE9j\xE0." });
    }
  }
  console.error("Erreur serveur:", err);
  return res.status(500).json({ message: "Erreur interne du serveur." });
}

// server/middlewares/security.ts
import helmet from "helmet";
function cspDirectives(isProduction) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...isProduction ? [] : ["'unsafe-inline'"]],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'", ...isProduction ? [] : ["ws:", "wss:"]],
    frameSrc: ["'self'", "https:", "blob:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'", "https://*.run.app", "https://*.google.com", "https://*.googleapis.com"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"]
  };
  if (isProduction) {
    directives.upgradeInsecureRequests = [];
  }
  return directives;
}
function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives(process.env.NODE_ENV === "production")
    },
    // Désactive X-Frame-Options: SAMEORIGIN pour autoriser le rendu dans l'iframe du studio
    frameguard: false,
    // Cross-Origin-Embedder-Policy require-corp bloquerait l'affichage des PDF
    // hébergés sur un autre domaine (Supabase). Désactivé volontairement.
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 15552e3, includeSubDomains: true } : false
  });
}
function apiNotFound(_req, res, _next) {
  res.status(404).json({ message: "Ressource introuvable." });
}

// server/app.ts
function createApp() {
  const app2 = express3();
  app2.disable("x-powered-by");
  if (process.env.VERCEL) {
    app2.use((req, _res, next) => {
      if (req.url && !req.url.startsWith("/api")) {
        req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
      }
      next();
    });
  }
  if (env.trustProxy > 0) {
    app2.set("trust proxy", env.trustProxy);
  }
  app2.use(securityHeaders());
  const standardJsonParser = express3.json({ limit: "1mb" });
  app2.use((req, res, next) => {
    const isLargePdfJsonUpload = req.method === "POST" && /^\/api\/(documents|contributions)\/?$/.test(req.path);
    if (isLargePdfJsonUpload) return next();
    return standardJsonParser(req, res, next);
  });
  app2.use("/api", apiLimiter);
  app2.use("/api/contact", contact_default);
  app2.use("/api/auth", auth_default);
  app2.use("/api/documents", documents_default);
  app2.use("/api/contributions", contributions_default);
  app2.use("/api/matieres", matieres_default);
  app2.use("/api/subjects", matieres_default);
  app2.use("/api/users", users_default);
  app2.use("/api/admin/users", users_default);
  app2.use("/api/admin", admin_default);
  app2.use("/api/admin", stats_default);
  app2.use("/api/stats", stats_default);
  app2.use("/api/activities", activities_default);
  app2.use("/api/notifications", notifications_default);
  app2.get(["/api", "/api/health"], (_req, res) => {
    res.json({
      status: "ok",
      name: "Revisio ISJ API",
      message: "API op\xE9rationnelle",
      version: "1.0.0",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.get("/api/debug-env", async (_req, res) => {
    let dbStatus = "unknown";
    let dbError = null;
    let counts = { matieres: 0, documents: 0, users: 0 };
    try {
      const [matCount, docCount, userCount] = await Promise.all([
        prisma.matiere.count().catch(() => 0),
        prisma.document.count().catch(() => 0),
        prisma.user.count().catch(() => 0)
      ]);
      counts = { matieres: matCount, documents: docCount, users: userCount };
      dbStatus = "connected";
    } catch (err) {
      dbStatus = "error";
      dbError = err?.message || String(err);
    }
    res.json({
      status: "ok",
      environment: {
        isVercel: Boolean(process.env.VERCEL),
        nodeEnv: process.env.NODE_ENV || "development",
        hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
        hasSupabaseUrl: Boolean(process.env.SUPABASE_URL),
        supabaseUrl: process.env.SUPABASE_URL || null,
        hasSupabaseAnonKey: Boolean(process.env.SUPABASE_ANON_KEY),
        hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        hasSupabaseJwtSecret: Boolean(process.env.SUPABASE_JWT_SECRET)
      },
      database: {
        status: dbStatus,
        error: dbError,
        counts
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.use("/api", apiNotFound);
  app2.use(errorHandler);
  return app2;
}

// server/api.ts
var app = createApp();
var api_default = app;
export {
  api_default as default
};
