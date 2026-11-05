import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { env, isMockSupabase } from "../config/env";
import { AppError, badRequest } from "../utils/errors";

export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAuth = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "epreuves";
const MAX_PDF_SIZE = 15 * 1024 * 1024;

// In-memory storage for PDF files when Supabase is not configured
const mockPdfStore = new Map<string, Buffer>();

export function makeSamplePdfBuffer(title: string, bodyLines: string[]): Buffer {
  const esc = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, " ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  const objects: string[] = [];
  objects.push(`<< /Type /Catalog /Pages 2 0 R >>`);
  objects.push(`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`);
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`
  );
  const contentLines: string[] = [];
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
  objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  objects.push(`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function registerMockPdf(pathName: string, buffer: Buffer): string {
  mockPdfStore.set(pathName, buffer);
  return publicStorageUrl(pathName);
}

export function getMockPdf(storagePath: string): Buffer | null {
  return mockPdfStore.get(storagePath) ?? null;
}

if (isMockSupabase) {
  const origFrom = supabaseAdmin.storage.from.bind(supabaseAdmin.storage);
  supabaseAdmin.storage.from = ((bucket: string) => {
    if (bucket === BUCKET) {
      return {
        upload: async (path: string, fileBody: Buffer | ArrayBuffer) => {
          const buf = Buffer.isBuffer(fileBody) ? fileBody : Buffer.from(fileBody);
          mockPdfStore.set(path, buf);
          return { data: { path }, error: null };
        },
        download: async (path: string) => {
          let buf = mockPdfStore.get(path);
          if (!buf) {
            buf = makeSamplePdfBuffer(path.replace(/\.pdf$/i, ""), [
              "Sujet d'epreuve - Institut Universitaire Saint Jean",
              "Exercice 1 : Questions de cours et applications directes (5 pts)",
              "Exercice 2 : Probleme d'analyse et resolution (10 pts)",
              "Exercice 3 : Synthese et deduction (5 pts)",
            ]);
            mockPdfStore.set(path, buf);
          }
          const blob = new Blob([new Uint8Array(buf)], { type: "application/pdf" });
          return { data: blob, error: null };
        },
        remove: async (paths: string[]) => {
          for (const p of paths) mockPdfStore.delete(p);
          return { data: [], error: null };
        },
      } as any;
    }
    return origFrom(bucket);
  }) as any;
}

function isPdfMagic(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export function isSupabaseStorageUrl(url: string): boolean {
  try {
    const candidate = new URL(url);
    return candidate.origin === new URL(env.supabase.url).origin &&
      candidate.pathname.startsWith(`/storage/v1/object/public/${BUCKET}/`);
  } catch {
    return false;
  }
}

export function publicStorageUrl(path: string): string {
  return `${env.supabase.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "epreuve.pdf";
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

let bucketReady = false;

export async function ensureBucket() {
  if (bucketReady || isMockSupabase) {
    bucketReady = true;
    return;
  }
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (error && !/not found/i.test(error.message)) {
    throw new AppError(500, `Impossible de vérifier le stockage des PDF : ${error.message}`);
  }
  if (error) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: `${MAX_PDF_SIZE}`,
      allowedMimeTypes: ["application/pdf"],
    });
    if (createError) {
      throw new AppError(500, `Impossible de créer le bucket de stockage : ${createError.message}`);
    }
  } else if (!error) {
    const { error: updateError } = await supabaseAdmin.storage.updateBucket(BUCKET, { public: false });
    if (updateError) {
      throw new AppError(500, `Impossible de sécuriser le stockage des PDF : ${updateError.message}`);
    }
  }
  bucketReady = true;
}

export async function uploadPdfBuffer(buffer: Buffer, originalName: string): Promise<string> {
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
  const path = `${randomUUID()}-${sanitizeFilename(originalName)}`;
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) {
    throw new AppError(500, `Échec de l'upload du fichier : ${error.message}`);
  }
  return publicStorageUrl(path);
}

export async function uploadPdfFromDataUrl(dataUrl: string, fileName: string): Promise<string> {
  const match = /^data:application\/pdf;base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw badRequest("Le fichier doit être un PDF encodé en base64 (data:application/pdf;base64,...).");
  }
  if (match[1].length > Math.ceil(MAX_PDF_SIZE * 1.4) + 10) {
    throw badRequest("Le fichier est trop volumineux (maximum 15 Mo).");
  }
  const buffer = Buffer.from(match[1], "base64");
  return uploadPdfBuffer(buffer, fileName);
}

export async function resolvePdfUrl(fichierUrl: string, fichierNom: string): Promise<string> {
  if (isSupabaseStorageUrl(fichierUrl)) return fichierUrl;
  if (/^data:application\/pdf;base64,/i.test(fichierUrl)) return uploadPdfFromDataUrl(fichierUrl, fichierNom);
  throw badRequest("URL de fichier invalide. Seul un PDF du stockage de la plateforme est accepté.");
}

export async function deleteStorageFileByUrl(url: string): Promise<void> {
  if (!isSupabaseStorageUrl(url)) return;
  const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
  if (!path) return;
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  if (error && !/not found/i.test(error.message)) {
    console.error("Échec de la suppression du fichier du storage :", error.message);
  }
}

