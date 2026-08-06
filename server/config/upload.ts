import multer from "multer";
import path from "path";
import fs from "fs";
import { AppError } from "../utils/errors";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
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
