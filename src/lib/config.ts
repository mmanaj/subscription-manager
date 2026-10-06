/** Env vars the app can't run without; shown on a setup screen instead of a bare 500. */
export function missingConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) missing.push("DATABASE_URL (dodaj Neon Postgres w Vercel → Storage)");
  if (!process.env.GOOGLE_CLIENT_ID) missing.push("GOOGLE_CLIENT_ID (Google Cloud Console → Credentials)");
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push("GOOGLE_CLIENT_SECRET");
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) missing.push("AUTH_SECRET (min. 32 znaki)");
  return missing;
}
