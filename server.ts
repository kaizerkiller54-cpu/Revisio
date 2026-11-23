import http from "http";
import express from "express";
import path from "path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import { createApp } from "./server/app";
import { env } from "./server/config/env";
import { prisma } from "./server/prisma/client";
import { ensureSearchIndexes } from "./server/services/search.service";

async function startServer() {
  ensureSearchIndexes().catch(() => {
    // La recherche basique reste opérationnelle en cas d'échec.
  });
  const app = createApp();
  const httpServer = http.createServer(app);
  let vite: ViteDevServer | undefined;

  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
        // Autorise l'accès depuis ngrok / réseau local (hosts dynamiques).
        allowedHosts: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(env.port, "0.0.0.0", () => {
    console.log(`🚀 Serveur ISJ démarré avec succès sur http://0.0.0.0:${env.port}`);
  });

  const shutdown = async () => {
    try {
      if (vite) await vite.close();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      await prisma.$disconnect();
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((err) => {
  console.error("Erreur au démarrage du serveur:", err);
  process.exit(1);
});
