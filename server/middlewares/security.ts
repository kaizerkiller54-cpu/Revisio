import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";

function cspDirectives(isProduction: boolean) {
  const directives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...(isProduction ? [] : ["'unsafe-inline'"])],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:", "https:"],
    fontSrc: ["'self'", "data:"],
    connectSrc: ["'self'", ...(isProduction ? [] : ["ws:", "wss:"])],
    frameSrc: ["'self'", "https:", "blob:"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'self'", "https://*.run.app", "https://*.google.com", "https://*.googleapis.com"],
    manifestSrc: ["'self'"],
    workerSrc: ["'self'", "blob:"],
  } as const;
  if (isProduction) {
    (directives as any).upgradeInsecureRequests = [];
  }
  return directives;
}

export function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: cspDirectives(process.env.NODE_ENV === "production"),
    },
    // Désactive X-Frame-Options: SAMEORIGIN pour autoriser le rendu dans l'iframe du studio
    frameguard: false,
    // Cross-Origin-Embedder-Policy require-corp bloquerait l'affichage des PDF
    // hébergés sur un autre domaine (Supabase). Désactivé volontairement.
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 15552000, includeSubDomains: true } : false,
  });
}

export function apiNotFound(_req: Request, res: Response, _next: NextFunction) {
  res.status(404).json({ message: "Ressource introuvable." });
}
