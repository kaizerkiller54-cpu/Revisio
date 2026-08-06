import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app";
import { env } from "./server/config/env";
import { prisma } from "./server/prisma/client";

async function startServer() {
  const app = createApp();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`🚀 Serveur ISJ démarré avec succès sur http://0.0.0.0:${env.port}`);
  });
}

startServer().catch((err) => {
  console.error("Erreur au démarrage du serveur:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
