-- Auth gérée par Supabase Auth : la colonne passwordHash n'est plus nécessaire.
ALTER TABLE "users" DROP COLUMN "passwordHash";
