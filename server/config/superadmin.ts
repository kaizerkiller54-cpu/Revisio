import path from "path";
import fs from "fs";

export function getSuperAdminMasterKey(): string {
  try {
    const configPath = path.join(process.cwd(), "superadmin.config.json");
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.superadminMasterKey) {
        return parsed.superadminMasterKey.trim();
      }
    }
  } catch (err) {
    console.error("Erreur lors de la lecture de superadmin.config.json:", err);
  }
  return "ISJ-SUPERADMIN-2026-KEY";
}
