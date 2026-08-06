export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) => new AppError(400, message, details);
export const unauthorized = (message = "Non authentifié.") => new AppError(401, message);
export const forbidden = (message = "Accès refusé : privilèges insuffisants.") => new AppError(403, message);
export const notFound = (message = "Ressource introuvable.") => new AppError(404, message);
