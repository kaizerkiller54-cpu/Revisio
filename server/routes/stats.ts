import { Router } from "express";
import { prisma } from "../prisma/client";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { mapActivity, mapContribution } from "../utils/mappers";
import { supabaseAdmin } from "../services/supabase";

const router = Router();

async function computeStats() {
  const [totalUsers, totalDocuments, documentsPublies, documentsEnAttente, totalContributions, totalAuditLogs] =
    await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.document.count({ where: { statut: "Publie", visible: true } }),
      prisma.contribution.count({ where: { statut: "En_attente" } }),
      prisma.contribution.count(),
      prisma.auditLog.count(),
    ]);

  return {
    totalUsers,
    totalDocuments,
    documentsPublies,
    documentsEnAttente,
    totalContributions,
    totalAuditLogs,
  };
}

router.get(
  "/daily-analytics",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (req, res) => {
    const daysParam = Number(req.query.days) || 30;
    const daysCount = Math.min(Math.max(daysParam, 7), 90);

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - (daysCount - 1));
    startDate.setHours(0, 0, 0, 0);

    const [activities, contributions, dbUsers, supaUsersRes] = await Promise.all([
      prisma.userActivity.findMany({
        where: {
          actionType: {
            in: ["DOWNLOAD_DOCUMENT", "SUBMIT_CONTRIBUTION", "LOGIN", "REGISTER"],
          },
          timestamp: { gte: startDate },
        },
        orderBy: { timestamp: "desc" },
        take: 10000,
      }).catch(() => []),
      prisma.contribution.findMany({
        where: { dateEnvoi: { gte: startDate } },
        orderBy: { dateEnvoi: "desc" },
        take: 2000,
      }).catch(() => []),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
      }).catch(() => []),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 500 }).catch(() => ({ data: { users: [] }, error: null })),
    ]);

    const mappedActivities = activities.map(mapActivity);
    const mappedContributions = contributions.map(mapContribution);

    // Enrich login events from Supabase Auth last_sign_in_at if not already in UserActivity
    const userById = new Map<string, (typeof dbUsers)[number]>();
    for (const u of dbUsers) {
      userById.set(u.id, u);
    }
    const supaUsers: any[] = supaUsersRes?.data?.users || [];
    const syntheticLogins: ReturnType<typeof mapActivity>[] = [];

    for (const su of supaUsers) {
      if (!su?.last_sign_in_at) continue;
      const signInDate = new Date(su.last_sign_in_at);
      if (isNaN(signInDate.getTime()) || signInDate < startDate) continue;

      const dbUser = userById.get(su.id);
      const hasCloseMatch = mappedActivities.some(
        (a) =>
          (a.actionType === "LOGIN" || a.actionType === "REGISTER") &&
          a.userId === su.id &&
          Math.abs(new Date(a.timestamp).getTime() - signInDate.getTime()) < 5 * 60 * 1000
      );

      if (!hasCloseMatch && dbUser) {
        syntheticLogins.push({
          id: `supa-signin-${dbUser.id}-${signInDate.getTime()}`,
          userId: dbUser.id,
          userNom: `${dbUser.prenom} ${dbUser.nom}`,
          userEmail: dbUser.email,
          userRole: dbUser.role,
          actionType: "LOGIN",
          description: "S'est connecté à la plateforme ISJ Revisio.",
          targetId: undefined,
          targetTitle: undefined,
          timestamp: signInDate.toISOString(),
        });
      }
    }

    const allEvents = [...mappedActivities, ...syntheticLogins].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const toDateKey = (iso: string) => {
      try {
        const d = new Date(iso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      } catch {
        return iso.slice(0, 10);
      }
    };

    // Build daily buckets
    const dailyMap = new Map<
      string,
      {
        dateIso: string;
        label: string;
        fullLabel: string;
        downloads: number;
        contributions: number;
        logins: number;
        uniqueConnectedUsers: Set<string>;
        connectedUserNames: Set<string>;
        downloadedDocTitles: Set<string>;
        contributedDocTitles: Set<string>;
      }
    >();

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const key = `${yyyy}-${mm}-${dd}`;
      const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
      const fullLabel = d.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      dailyMap.set(key, {
        dateIso: key,
        label,
        fullLabel,
        downloads: 0,
        contributions: 0,
        logins: 0,
        uniqueConnectedUsers: new Set<string>(),
        connectedUserNames: new Set<string>(),
        downloadedDocTitles: new Set<string>(),
        contributedDocTitles: new Set<string>(),
      });
    }

    // Track contribution IDs already counted via SUBMIT_CONTRIBUTION so we don't double-count
    const countedContribDates = new Set<string>();

    for (const act of allEvents) {
      const key = toDateKey(act.timestamp);
      const bucket = dailyMap.get(key);
      if (!bucket) continue;

      if (act.actionType === "DOWNLOAD_DOCUMENT") {
        bucket.downloads += 1;
        if (act.targetTitle) bucket.downloadedDocTitles.add(act.targetTitle);
      } else if (act.actionType === "SUBMIT_CONTRIBUTION") {
        bucket.contributions += 1;
        if (act.targetId) countedContribDates.add(act.targetId);
        if (act.targetTitle) bucket.contributedDocTitles.add(act.targetTitle);
      } else if (act.actionType === "LOGIN" || act.actionType === "REGISTER") {
        bucket.logins += 1;
        bucket.uniqueConnectedUsers.add(act.userId || act.userEmail);
        if (act.userNom) bucket.connectedUserNames.add(act.userNom);
      }
    }

    // Also include contributions directly from the contributions table if not already in activity logs
    for (const c of mappedContributions) {
      if (countedContribDates.has(c.id)) continue;
      const key = toDateKey(c.dateEnvoi);
      const bucket = dailyMap.get(key);
      if (bucket) {
        bucket.contributions += 1;
        if (c.titre || c.fichierNom) {
          bucket.contributedDocTitles.add(c.titre || c.fichierNom);
        }
      }
    }

    const dailySeries = Array.from(dailyMap.values()).map((b) => ({
      dateIso: b.dateIso,
      label: b.label,
      fullLabel: b.fullLabel,
      downloads: b.downloads,
      contributions: b.contributions,
      logins: b.logins,
      uniqueUsers: b.uniqueConnectedUsers.size,
      connectedUsersList: Array.from(b.connectedUserNames).slice(0, 4),
      downloadedDocsList: Array.from(b.downloadedDocTitles).slice(0, 3),
      contributedDocsList: Array.from(b.contributedDocTitles).slice(0, 3),
    }));

    const downloadEvents = allEvents
      .filter((a) => a.actionType === "DOWNLOAD_DOCUMENT")
      .slice(0, 60);

    const loginEvents = allEvents
      .filter((a) => a.actionType === "LOGIN" || a.actionType === "REGISTER")
      .slice(0, 60);

    // Combine SUBMIT_CONTRIBUTION events with Contribution rows for complete who-contributed list
    const contributionEvents = mappedContributions.slice(0, 60).map((c) => ({
      id: c.id,
      userId: c.utilisateurId,
      userNom: c.utilisateurNom,
      userEmail: c.utilisateurEmail,
      userRole: (userById.get(c.utilisateurId)?.role || "Etudiant") as string,
      actionType: "SUBMIT_CONTRIBUTION",
      description: `A soumis « ${c.titre || c.fichierNom} » (${c.matiere || "Matière"} • ${c.typeEpreuve || "Épreuve"})`,
      targetId: c.id,
      targetTitle: c.titre || c.fichierNom,
      matiere: c.matiere,
      typeEpreuve: c.typeEpreuve,
      statut: c.statut,
      timestamp: c.dateEnvoi,
    }));

    res.json({
      dailySeries,
      downloadEvents,
      loginEvents,
      contributionEvents,
    });
  })
);

router.get(
  "/",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

router.get(
  "/stats",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

router.get(
  "/dashboard",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    res.json(await computeStats());
  })
);

export default router;
