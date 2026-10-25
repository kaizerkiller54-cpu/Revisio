import type { Request, Response } from "express";
import { createApp } from "../server/app";
import { ensureSearchIndexes } from "../server/services/search.service";

// Initialisation non bloquante des index de recherche
ensureSearchIndexes().catch(() => {
  // La recherche basique reste opérationnelle en cas d'échec
});

const app = createApp();

export default function handler(req: Request, res: Response) {
  // Assure la compatibilité si Vercel transmet le chemin sans le préfixe /api
  if (req.url && !req.url.startsWith("/api")) {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  return app(req, res);
}
