import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/errors";

import os from "os";

// Sur Vercel / serverless, le dossier courant est en lecture seule (EROFS).
// On bascule sur /tmp (os.tmpdir()) pour éviter le crash au démarrage.
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), "uploads")
  : path.join(process.cwd(), "uploads");

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch {
  // Ignorer l'erreur si le système de fichiers est en lecture seule
}

const storage = multer.memoryStorage();

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      cb(new AppError(400, "Seuls les fichiers PDF (application/pdf) sont acceptés.") as unknown as Error);
      return;
    }
    cb(null, true);
  },
});

export const uploadsDirPath = uploadsDir;
