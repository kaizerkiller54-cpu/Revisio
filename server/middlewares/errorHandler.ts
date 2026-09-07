import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err && typeof err === "object") {
    const e = err as { code?: string; type?: string; message?: string };

    // Erreurs du body-parser (JSON mal formé / corps trop volumineux)
    if (e.type === "entity.parse.failed") {
      return res.status(400).json({ message: "Corps de requête invalide (JSON malformé)." });
    }
    if (e.type === "entity.too.large") {
      return res.status(413).json({ message: "Corps de requête trop volumineux." });
    }

    // Erreurs multer (fichier trop volumineux / champ inattendu)
    if (e.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "Fichier trop volumineux (maximum 15 Mo)." });
    }
    if (e.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Champ de fichier invalide." });
    }

    // Prisma : enregistrement introuvable ou identifiant invalide
    if (e.code === "P2025") {
      return res.status(404).json({ message: "Ressource introuvable." });
    }
    if (e.code === "P2023") {
      return res.status(400).json({ message: "Identifiant invalide." });
    }
    if (e.code === "P2002") {
      return res.status(409).json({ message: "Conflit : une ressource identique existe déjà." });
    }
  }

  console.error("Erreur serveur:", err);
  return res.status(500).json({ message: "Erreur interne du serveur." });
}
