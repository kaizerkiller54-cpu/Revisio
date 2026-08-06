import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { AppError, badRequest } from "../utils/errors";

export const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAuth = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = "epreuves";

export function isSupabaseStorageUrl(url: string): boolean {
  return url.startsWith(`${env.supabase.url}/storage/`);
}

function publicStorageUrl(path: string): string {
  return `${env.supabase.url}/storage/v1/object/public/${BUCKET}/${path}`;
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "epreuve.pdf";
  return /\.pdf$/i.test(base) ? base : `${base}.pdf`;
}

let bucketReady = false;

export async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (error && /not found/i.test(error.message)) {
    const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET, {
      public: true,
    });
    if (createError) {
      throw new AppError(500, `Impossible de créer le bucket de stockage : ${createError.message}`);
    }
  }
  bucketReady = true;
}

export async function uploadPdfBuffer(buffer: Buffer, originalName: string): Promise<string> {
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
  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0) {
    throw badRequest("Le fichier PDF est vide.");
  }
  return uploadPdfBuffer(buffer, fileName);
}

export async function resolvePdfUrl(fichierUrl: string, fichierNom: string): Promise<string> {
  if (isSupabaseStorageUrl(fichierUrl)) return fichierUrl;
  if (fichierUrl.startsWith("data:")) return uploadPdfFromDataUrl(fichierUrl, fichierNom);
  return fichierUrl;
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
