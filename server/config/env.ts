import path from "path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.join(process.cwd(), ".env") });

function envOrDefault(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

if (!process.env.SUPERADMIN_MASTER_KEY) {
  process.env.SUPERADMIN_MASTER_KEY = "ISJ-SUPERADMIN-2026-KEY";
}
if (!process.env.RATE_LIMIT_ENABLED) {
  process.env.RATE_LIMIT_ENABLED = "false";
}

// Always connect to live Supabase REST client containing all real ISJ documents and subjects
export const useSupabaseDatabase = true;
export const isMockDatabase = useSupabaseDatabase;
export const isMockSupabase = false;

function resolvePort(): number {
  const args = process.argv;
  const portFlagIndex = args.findIndex((arg) => arg === "--port" || arg === "-p");
  if (portFlagIndex !== -1 && args[portFlagIndex + 1]) {
    const parsed = Number(args[portFlagIndex + 1]);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

export const env = {
  port: resolvePort(),
  databaseUrl: envOrDefault("DATABASE_URL", "postgresql://revisio:Revisio2026!@localhost:5432/revisio?schema=public"),
  // Nombre de sauts de proxy devant l'application (0 = accès direct).
  trustProxy: Number(process.env.TRUST_PROXY_HOPS ?? 0),
  supabase: {
    url: envOrDefault("SUPABASE_URL", "https://fmeuipgortpizaluiyuh.supabase.co"),
    anonKey: envOrDefault(
      "SUPABASE_ANON_KEY",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVpcGdvcnRwaXphbHVpeXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5NjcyMjgsImV4cCI6MjEwMTU0MzIyOH0.468GEGQlpMJxNrYBrb0BgdSqMYs9h6QC47fjeMKdoww"
    ),
    serviceRoleKey: envOrDefault(
      "SUPABASE_SERVICE_ROLE_KEY",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZXVpcGdvcnRwaXphbHVpeXVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTk2NzIyOCwiZXhwIjoyMTAxNTQzMjI4fQ.jTzMvw5-bw5y9eYnCsDdlsqFzuMw896B4mPgW4_BLjc"
    ),
    jwtSecret: envOrDefault(
      "SUPABASE_JWT_SECRET",
      "lTuRpsdwO2rhlX/mC1IDXfOLZiufrXA1TSQqWM3ArFkguXNrW7B3vP26hZbY8iPvJFjTkziW5b1uIBlvWOBH4Q=="
    ),
  },
  smtp: {
    host: envOrDefault("SMTP_HOST", "smtp.gmail.com"),
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER?.trim() || "",
    pass: process.env.SMTP_PASS?.trim() || "",
    from: envOrDefault("SMTP_FROM", "Revisio ISJ <noreply@saintjeaningenieur.org>"),
  },
  resendApiKey: process.env.RESEND_API_KEY?.trim() || "",
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.trim() || "",
    authToken: process.env.TWILIO_AUTH_TOKEN?.trim() || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER?.trim() || "",
  },
};




