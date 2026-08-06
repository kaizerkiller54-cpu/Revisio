import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authRateLimiter } from "../middlewares/rateLimit";

const router = Router();

router.post(
  "/",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { nom, email, sujet, message } = req.body ?? {};

    if (!nom || !email || !message) {
      return res.status(400).json({ message: "Nom, email et message sont requis." });
    }

    console.log(
      `[CONTACT] ${new Date().toISOString()} — ${nom} <${email}> — ${sujet ?? "Sans sujet"}\n${message}`
    );

    res.json({ message: "Message envoyé avec succès. L'équipe ISJ vous répondra rapidement." });
  })
);

export default router;
