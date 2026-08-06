import { AuthUser, JwtPayload } from "../services/auth.service";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tokenPayload?: JwtPayload;
    }
  }
}

export {};
