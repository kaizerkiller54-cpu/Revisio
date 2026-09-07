import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  // Nombre de sauts de proxy devant l'application (0 = accès direct).
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  supabase: {
    url: required("SUPABASE_URL"),
    anonKey: required("SUPABASE_ANON_KEY"),
    serviceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    jwtSecret: required("SUPABASE_JWT_SECRET"),
  },
};
