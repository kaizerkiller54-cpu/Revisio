import express from "express";
import { uploadsDirPath } from "./config/upload";
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

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));
  app.use("/uploads", express.static(uploadsDirPath));

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

  app.use(errorHandler);

  return app;
}
