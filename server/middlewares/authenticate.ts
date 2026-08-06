import type { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma/client";
import { verifyAccessToken } from "../services/auth.service";
import { unauthorized } from "../utils/errors";

export async function authenticateJWT(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(unauthorized());
    }
    const token = authHeader.replace("Bearer ", "");
    const payload = await verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
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
