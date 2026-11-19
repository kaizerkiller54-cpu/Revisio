import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma/client";
import { verifyAccessToken, type JwtPayload } from "../services/auth.service";
import {
  attachSessionCookiesAndHeaders,
  clearSessionCookies,
  extractAccessTokenFromRequest,
  extractDeviceSessionTokenFromRequest,
  isSessionActiveOnServer,
  verifyAndRotateDeviceSessionToken,
} from "../services/session.service";
import { unauthorized } from "../utils/errors";

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const rawAccessToken = extractAccessTokenFromRequest(req);
    const rawDeviceSessionToken = extractDeviceSessionTokenFromRequest(req);

    let payload: JwtPayload | null = null;

    // 1. Vérification du jeton d'accès court terme (si présent)
    if (rawAccessToken) {
      try {
        const verified = await verifyAccessToken(rawAccessToken);
        const isActive = await isSessionActiveOnServer(
          verified.userId,
          verified.sessionId,
          rawAccessToken
        );
        if (isActive) {
          payload = verified;
        }
      } catch {
        // Jeton d'accès expiré ou invalide : on tente le renouvellement via la session persistante de l'appareil
        payload = null;
      }
    }

    // 2. Restauration automatique & rotation de jeton si la session persistante de l'appareil est valide
    if (!payload && rawDeviceSessionToken) {
      const rotatedSession = await verifyAndRotateDeviceSessionToken(
        req,
        rawDeviceSessionToken,
        false
      );
      if (rotatedSession) {
        attachSessionCookiesAndHeaders(req, res, {
          accessToken: rotatedSession.accessToken,
          deviceSessionToken: rotatedSession.deviceSessionToken,
          deviceId: rotatedSession.deviceId,
          sessionId: rotatedSession.sessionId,
          persistent: rotatedSession.persistent,
        });
        payload = {
          userId: rotatedSession.userId,
          role: "authenticated",
          tokenType: "access",
          sessionId: rotatedSession.sessionId,
          deviceId: rotatedSession.deviceId,
        };
      }
    }

    if (!payload) {
      clearSessionCookies(req, res);
      return next(unauthorized("Session expirée ou non authentifiée."));
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      clearSessionCookies(req, res);
      return next(unauthorized("Compte introuvable ou supprimé."));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
    };
    req.tokenPayload = payload;
    next();
  } catch (err) {
    next(err);
  }
}
