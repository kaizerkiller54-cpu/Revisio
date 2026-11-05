import express from "express";
import authRoutes from "./routes/auth";
import documentRoutes from "./routes/documents";
import contributionRoutes from "./routes/contributions";
import matiereRoutes from "./routes/matieres";
import userRoutes from "./routes/users";
import activityRoutes from "./routes/activities";
import notificationRoutes from "./routes/notifications";
import statsRoutes from "./routes/stats";
import adminRoutes from "./routes/admin";
import contactRoutes from "./routes/contact";
import { errorHandler } from "./middlewares/errorHandler";
import { securityHeaders, apiNotFound } from "./middlewares/security";
import { apiLimiter } from "./middlewares/rateLimit";
import { env } from "./config/env";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Normalise l'URL uniquement sur Vercel serverless lorsque la fonction /api reçoit le chemin sans préfixe /api
  if (process.env.VERCEL) {
    app.use((req, _res, next) => {
      if (req.url && !req.url.startsWith("/api")) {
        req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
      }
      next();
    });
  }

  // Ne révèle l'adresse IP réelle que si l'app est derrière un reverse proxy
  // configuré (TRUST_PROXY_HOPS) — évite le contournement des rate limiters.
  if (env.trustProxy > 0) {
    app.set("trust proxy", env.trustProxy);
  }

  app.use(securityHeaders());
  const standardJsonParser = express.json({ limit: "1mb" });
  app.use((req, res, next) => {
    const isLargePdfJsonUpload = req.method === "POST" && /^\/api\/(documents|contributions)\/?$/.test(req.path);
    if (isLargePdfJsonUpload) return next();
    return standardJsonParser(req, res, next);
  });
  app.use("/api", apiLimiter);

  app.use("/api/contact", contactRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/contributions", contributionRoutes);
  app.use("/api/matieres", matiereRoutes);
  app.use("/api/subjects", matiereRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/admin/users", userRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/admin", statsRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/activities", activityRoutes);
  app.use("/api/notifications", notificationRoutes);

  // Endpoint d'accueil et de contrôle d'état de l'API
  app.get(["/api", "/api/health"], (_req, res) => {
    res.json({
      status: "ok",
      name: "Revisio ISJ API",
      message: "API opérationnelle",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api", apiNotFound);

  app.use(errorHandler);

  return app;
}
