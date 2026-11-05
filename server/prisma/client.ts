import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env, useSupabaseDatabase } from "../config/env";
import { supabaseAdmin } from "../services/supabase";

const MODEL_TO_TABLE: Record<string, string> = {
  user: "users",
  matiere: "matieres",
  document: "documents",
  contribution: "contributions",
  userActivity: "user_activities",
  userNotification: "user_notifications",
  notificationReceipt: "notification_receipts",
  auditLog: "audit_logs",
};

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "datePublication",
  "dateEnvoi",
  "timestamp",
  "date",
  "readAt",
  "deletedAt",
]);

function normalizeRow(model: string, row: any): any {
  if (!row || typeof row !== "object") return row;
  const out: any = { ...row };
  for (const [k, v] of Object.entries(out)) {
    if (DATE_FIELDS.has(k) && typeof v === "string") {
      out[k] = new Date(v);
    }
  }
  if (model === "document" && out.visible === undefined) {
    out.visible = true;
  }
  return out;
}

function serializeForSupabase(model: string, data: Record<string, any>, supportedColumns?: Set<string>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (supportedColumns && !supportedColumns.has(k)) continue;
    if (v instanceof Date) {
      out[k] = v.toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

function createSupabaseBackedPrisma(): PrismaClient {
  // In-memory fallback only for notification_receipts if migration 20261102140000 was not yet applied on Supabase
  const memoryReceipts: any[] = [];
  let hasRemoteReceiptsTable: boolean | null = null;
  let documentHasVisibleColumn: boolean | null = null;

  async function fetchTable(model: string): Promise<any[]> {
    if (model === "notificationReceipt") {
      if (hasRemoteReceiptsTable === false) return memoryReceipts.map((r) => normalizeRow(model, r));
      const { data, error } = await supabaseAdmin.from("notification_receipts").select("*");
      if (error) {
        hasRemoteReceiptsTable = false;
        return memoryReceipts.map((r) => normalizeRow(model, r));
      }
      hasRemoteReceiptsTable = true;
      return (data ?? []).map((r) => normalizeRow(model, r));
    }

    const table = MODEL_TO_TABLE[model];
    if (!table) return [];
    const { data, error } = await supabaseAdmin.from(table).select("*");
    if (error) {
      console.error(`Erreur Supabase lecture ${table}:`, error.message);
      return [];
    }
    if (model === "document" && data && data.length > 0 && documentHasVisibleColumn === null) {
      documentHasVisibleColumn = "visible" in data[0];
    }
    return (data ?? []).map((r) => normalizeRow(model, r));
  }

  const matchesCondition = (val: any, cond: any, item: any, key: string, matieresMap: Map<string, any>): boolean => {
    if (cond === undefined) return true;
    if (cond === null || typeof cond !== "object" || cond instanceof Date) {
      if (cond instanceof Date && val instanceof Date) return val.getTime() === cond.getTime();
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
      return cond.mode === "insensitive"
        ? val.toLowerCase().includes(target.toLowerCase())
        : val.includes(target);
    }
    if ("in" in cond && Array.isArray(cond.in)) {
      const inMatch = cond.in.includes(val);
      if ("not" in cond) return inMatch && val !== cond.not;
      return inMatch;
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

  const matchesWhere = (item: any, where: any, matieresMap: Map<string, any>): boolean => {
    if (!where) return true;
    for (const [key, cond] of Object.entries(where)) {
      if (cond === undefined) continue;
      if (key === "OR" && Array.isArray(cond)) {
        if (!cond.some((sub) => matchesWhere(item, sub, matieresMap))) return false;
        continue;
      }
      if (key === "AND" && Array.isArray(cond)) {
        if (!cond.every((sub) => matchesWhere(item, sub, matieresMap))) return false;
        continue;
      }
      if (key === "userId_notificationId" && typeof cond === "object" && cond !== null) {
        const c = cond as { userId: string; notificationId: string };
        if (item.userId !== c.userId || item.notificationId !== c.notificationId) return false;
        continue;
      }
      if (!matchesCondition(item[key], cond, item, key, matieresMap)) return false;
    }
    return true;
  };

  const sortRows = (rows: any[], orderBy?: any): any[] => {
    if (!orderBy) return rows;
    const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
    return [...rows].sort((a, b) => {
      for (const ord of orders) {
        const [field, dir] = Object.entries(ord)[0] as [string, "asc" | "desc"];
        const va = a[field] instanceof Date ? a[field].getTime() : a[field];
        const vb = b[field] instanceof Date ? b[field].getTime() : b[field];
        if (va === vb) continue;
        const cmp = va > vb ? 1 : -1;
        return dir === "desc" ? -cmp : cmp;
      }
      return 0;
    });
  };

  async function resolveRelations(model: string, rows: any[], include?: any): Promise<any[]> {
    if (!rows.length) return rows;
    if (model === "document") {
      const matieres = await fetchTable("matiere");
      const matMap = new Map(matieres.map((m) => [m.id, m]));
      return rows.map((r) => ({
        ...r,
        matiere: matMap.get(r.matiereId) ?? r.matiere,
      }));
    }
    if (model === "contribution" && include?.document) {
      const docs = await fetchTable("document");
      const docByContrib = new Map(docs.filter((d) => d.contributionId).map((d) => [d.contributionId, d]));
      return rows.map((r) => ({
        ...r,
        document: docByContrib.get(r.id) ?? null,
      }));
    }
    return rows;
  }

  async function getMatieresMap(model: string, where?: any): Promise<Map<string, any>> {
    if (model === "document" && where && (where.matiere || where.OR || where.AND)) {
      const matieres = await fetchTable("matiere");
      return new Map(matieres.map((m) => [m.id, m]));
    }
    return new Map();
  }

  const makeDelegate = (model: string) => ({
    findMany: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      let list = store.filter((item) => matchesWhere(item, args?.where, matMap));
      list = sortRows(list, args?.orderBy);
      if (typeof args?.skip === "number") list = list.slice(args.skip);
      if (typeof args?.take === "number") list = list.slice(0, args.take);
      return resolveRelations(model, list, args?.include);
    },
    findFirst: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const list = sortRows(
        store.filter((item) => matchesWhere(item, args?.where, matMap)),
        args?.orderBy
      );
      if (!list[0]) return null;
      const [withRel] = await resolveRelations(model, [list[0]], args?.include);
      return withRel;
    },
    findUnique: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const item = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!item) return null;
      const [withRel] = await resolveRelations(model, [item], args?.include);
      return withRel;
    },
    count: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      return store.filter((item) => matchesWhere(item, args?.where, matMap)).length;
    },
    groupBy: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const filtered = store.filter((item) => matchesWhere(item, args?.where, matMap));
      const byField = Array.isArray(args?.by) ? args.by[0] : args?.by;
      const groups = new Map<any, number>();
      for (const item of filtered) {
        const key = item[byField];
        groups.set(key, (groups.get(key) ?? 0) + 1);
      }
      return Array.from(groups.entries()).map(([key, cnt]) => ({
        [byField]: key,
        _count: { _all: cnt },
      }));
    },
    create: async (args: any) => {
      const ts = new Date();
      const record: any = {
        id: args.data?.id ?? randomUUID(),
        ...args.data,
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
      if (error) {
        if (model === "document" && /visible/i.test(error.message)) {
          documentHasVisibleColumn = false;
          delete payload.visible;
          const retry = await supabaseAdmin.from(table).insert(payload).select("*").single();
          if (!retry.error && retry.data) {
            const [res] = await resolveRelations(model, [normalizeRow(model, { ...retry.data, visible: record.visible })], args?.include);
            return res;
          }
        }
        throw new Error(`Erreur insertion ${table}: ${error.message}`);
      }
      const [res] = await resolveRelations(model, [normalizeRow(model, data ?? record)], args?.include);
      return res;
    },
    update: async (args: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const current = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!current) throw new Error(`${model} introuvable.`);

      const updates: Record<string, any> = {};
      for (const [k, v] of Object.entries(args.data ?? {})) {
        if (v && typeof v === "object" && "increment" in (v as any)) {
          updates[k] = (Number(current[k]) || 0) + Number((v as any).increment);
        } else if (v !== undefined) {
          updates[k] = v;
        }
      }
      if ("updatedAt" in current) {
        updates.updatedAt = new Date();
      }

      const table = MODEL_TO_TABLE[model];
      const payload = serializeForSupabase(model, updates);
      if (model === "document" && documentHasVisibleColumn === false) {
        delete payload.visible;
      }

      const { data, error } = await supabaseAdmin.from(table).update(payload).eq("id", current.id).select("*").single();
      if (error) {
        if (model === "document" && /visible/i.test(error.message)) {
          documentHasVisibleColumn = false;
          delete payload.visible;
          if (Object.keys(payload).length > 0) {
            await supabaseAdmin.from(table).update(payload).eq("id", current.id);
          }
          const [res] = await resolveRelations(model, [normalizeRow(model, { ...current, ...updates })], args?.include);
          return res;
        }
        throw new Error(`Erreur mise à jour ${table}: ${error.message}`);
      }
      const [res] = await resolveRelations(model, [normalizeRow(model, data ?? { ...current, ...updates })], args?.include);
      return res;
    },
    updateMany: async (args: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const targets = store.filter((x) => matchesWhere(x, args?.where, matMap));
      if (!targets.length) return { count: 0 };

      const table = MODEL_TO_TABLE[model];
      const payload = serializeForSupabase(model, args.data ?? {});
      const ids = targets.map((t) => t.id).filter(Boolean);
      if (ids.length) {
        await supabaseAdmin.from(table).update(payload).in("id", ids);
      }
      return { count: targets.length };
    },
    upsert: async (args: any) => {
      if (model === "notificationReceipt") {
        await fetchTable(model);
        if (hasRemoteReceiptsTable === false) {
          const idx = memoryReceipts.findIndex((x) => matchesWhere(x, args?.where, new Map()));
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
        return normalizeRow(model, data ?? payload);
      }
      const existing = await makeDelegate(model).findUnique({ where: args.where });
      if (existing) {
        return makeDelegate(model).update({ where: args.where, data: args.update });
      }
      return makeDelegate(model).create({ data: args.create });
    },
    delete: async (args: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const target = store.find((x) => matchesWhere(x, args?.where, matMap));
      if (!target) return null;
      const table = MODEL_TO_TABLE[model];
      await supabaseAdmin.from(table).delete().eq("id", target.id);
      return target;
    },
    deleteMany: async (args?: any) => {
      const [store, matMap] = await Promise.all([
        fetchTable(model),
        getMatieresMap(model, args?.where),
      ]);
      const targets = store.filter((x) => matchesWhere(x, args?.where, matMap));
      if (!targets.length) return { count: 0 };
      const table = MODEL_TO_TABLE[model];
      const ids = targets.map((t) => t.id).filter(Boolean);
      if (ids.length) {
        await supabaseAdmin.from(table).delete().in("id", ids);
      }
      return { count: targets.length };
    },
  });

  const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const client: any = {
    user: makeDelegate("user"),
    matiere: makeDelegate("matiere"),
    document: makeDelegate("document"),
    contribution: makeDelegate("contribution"),
    userActivity: makeDelegate("userActivity"),
    userNotification: makeDelegate("userNotification"),
    notificationReceipt: makeDelegate("notificationReceipt"),
    auditLog: makeDelegate("auditLog"),
    $transaction: async (arg: any) => {
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
    $queryRawUnsafe: async (sql: string, ...values: any[]) => {
      // Support raw SQL queries from search.service.ts against live Supabase documents & matieres
      const isCount = /SELECT\s+COUNT/i.test(sql);
      const [documents, matieres] = await Promise.all([
        fetchTable("document"),
        fetchTable("matiere"),
      ]);
      const matMap = new Map(matieres.map((m) => [m.id, m]));

      let rows = documents.map((d) => {
        const m = matMap.get(d.matiereId);
        return {
          ...d,
          matiereNom: m?.nom ?? "",
          score: 1,
        };
      });

      const isSuggest = /LIMIT\s+\$2/i.test(sql) && values.length === 2 && typeof values[0] === "string" && typeof values[1] === "number";

      if (isSuggest) {
        const q = stripAccents(String(values[0]).replace(/^%|%$/g, "").toLowerCase());
        rows = rows.filter(
          (r) =>
            r.visible !== false &&
            r.statut === "Publie" &&
            (stripAccents(r.titre.toLowerCase()).includes(q) ||
              stripAccents(r.matiereNom.toLowerCase()).includes(q) ||
              stripAccents(r.anneeAcademique.toLowerCase()).includes(q))
        );
        rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows.slice(0, Number(values[1]));
      }

      // Filter by visible & statut ($1)
      const targetStatut = typeof values[0] === "string" ? values[0] : "Publie";
      rows = rows.filter((r) => r.visible !== false && r.statut === targetStatut);

      // Filter by remaining parameters
      for (let i = 1; i < values.length; i++) {
        const val = values[i];
        if (typeof val === "string") {
          if (val.startsWith("%") && val.endsWith("%")) {
            const q = stripAccents(val.slice(1, -1).toLowerCase());
            rows = rows.filter(
              (r) =>
                stripAccents(r.titre.toLowerCase()).includes(q) ||
                stripAccents(r.matiereNom.toLowerCase()).includes(q) ||
                stripAccents(r.anneeAcademique.toLowerCase()).includes(q)
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

      const nums = values.filter((v) => typeof v === "number") as number[];
      if (nums.length >= 2) {
        const [limit, offset] = nums.slice(-2);
        return rows.slice(offset, offset + limit);
      } else if (nums.length === 1) {
        return rows.slice(0, nums[0]);
      }
      return rows;
    },
    $disconnect: async () => {},
  };

  return client as PrismaClient;
}

function initPrisma(): PrismaClient {
  if (useSupabaseDatabase) {
    console.log("🔗 Connexion directe à la base de données Supabase (utilisateurs, matières, épreuves et journaux existants)...");
    return createSupabaseBackedPrisma();
  }
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "production" ? ["warn", "error"] : ["warn"],
  });
}

export const prisma = initPrisma();


