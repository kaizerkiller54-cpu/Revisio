import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import { asyncHandler } from "../utils/asyncHandler";
import { authRateLimiter } from "../middlewares/rateLimit";
import { authenticateJWT } from "../middlewares/authenticate";
import { requireRole } from "../middlewares/authorize";
import { validate } from "../middlewares/validate";
import {
  appendFeedback,
  feedbackFileExists,
  getFeedbackFilePath,
} from "../services/feedback.service";

const router = Router();

const contactSchema = z.object({
  nom: z.string().min(1, "Le nom est requis.").max(100, "Le nom est trop long."),
  email: z.string().email("Adresse e-mail invalide.").max(200),
  sujet: z.string().max(150, "Le sujet est trop long.").optional(),
  message: z.string().min(1, "Le message est requis.").max(2000, "Le message est trop long."),
  categorie: z.string().max(50, "La catégorie est trop longue.").optional(),
});

router.post(
  "/",
  authRateLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const { nom, email, sujet, message, categorie } = req.body;

    await appendFeedback({
      id: randomUUID(),
      nom: String(nom).trim(),
      email: String(email).trim().toLowerCase(),
      categorie: String(categorie ?? "").trim() || "Général",
      sujet: String(sujet ?? "").trim(),
      message: String(message).trim(),
      date: new Date().toISOString(),
    });

    res.json({ message: "Message envoyé avec succès. L'équipe ISJ vous répondra rapidement." });
  })
);

router.get(
  "/feedback",
  authenticateJWT,
  requireRole("Administrateur", "SuperAdministrateur"),
  asyncHandler(async (_req, res) => {
    const file = getFeedbackFilePath();
    if (!(await feedbackFileExists())) {
      return res.status(404).json({ message: "Aucun retour utilisateur pour le moment." });
    }
    res.download(file, `retours-utilisateurs-${new Date().toISOString().slice(0, 10)}.json`);
  })
);

export default router;