import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message, details: err.details });
  }

  if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
    return res.status(404).json({ message: "Ressource introuvable." });
  }

  console.error("Erreur serveur:", err);
  return res.status(500).json({ message: "Erreur interne du serveur." });
}
