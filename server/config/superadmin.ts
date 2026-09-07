import path from "path";
import fs from "fs";

// La clé master du SuperAdmin provient d'abord de la variable d'environnement
// SUPERADMIN_MASTER_KEY, puis du fichier superadmin.config.json (gitignoré).
// Aucune valeur par défaut n'est codée en dur : sans clé explicite, le bootstrap
// SuperAdmin est refusé.
export function getSuperAdminMasterKey(): string {
  const value = readSuperAdminMasterKey();
  if (!value) {
    throw new Error(
      "SUPERADMIN_MASTER_KEY non configurée. Définissez cette variable dans .env " +
        "ou dans superadmin.config.json avant d'utiliser le bootstrap SuperAdmin."
    );
  }
  return value;
}

export function tryGetSuperAdminMasterKey(): string | null {
  return readSuperAdminMasterKey();
}

function readSuperAdminMasterKey(): string | null {
  const fromEnv = process.env.SUPERADMIN_MASTER_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const configPath = path.join(process.cwd(), "superadmin.config.json");
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed.superadminMasterKey) {
        return String(parsed.superadminMasterKey).trim();
      }
    }
  } catch (err) {
    console.error("Erreur lors de la lecture de superadmin.config.json:", err);
  }

  return null;
}
