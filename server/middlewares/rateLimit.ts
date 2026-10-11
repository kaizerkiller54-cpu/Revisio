import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import type { NextFunction, Request, Response } from "express";

/**
 * Coupe-circuit temporaire du rate limiting (ex. import en masse d'épreuves).
 * Si RATE_LIMIT_ENABLED=false, tous les limiteurs laissent passer.
 * Lu à chaque requête (insensible à l'ordre de chargement de dotenv).
 * NE JAMAIS mettre "false" en production.
 */
function buildLimiter(
  options: Parameters<typeof rateLimit>[0]
): RateLimitRequestHandler {
  const limiter = rateLimit(options);
  const wrapped = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.RATE_LIMIT_ENABLED === "false") return next();
    return limiter(req, res, next);
  };
  // Conserve les méthodes du limiteur (resetKey/getKey) pour rester
  // compatible avec le type RateLimitRequestHandler.
  return Object.assign(wrapped, limiter) as unknown as RateLimitRequestHandler;
}

export const apiLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes. Réessayez dans quelques minutes." },
});

export const authRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de connexion. Réessayez dans une minute." },
});

export const downloadRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de téléchargements. Réessayez dans une minute." },
});

export const searchRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de recherches. Réessayez dans une minute." },
});

export const suggestRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de requêtes de suggestion. Réessayez dans une minute." },
});

export const refreshRateLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives de rafraîchissement. Réessayez dans une minute." },
});
