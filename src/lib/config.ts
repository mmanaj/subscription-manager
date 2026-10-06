/** Env vars the app can't run without; shown on a setup screen instead of a bare 500. */
export function missingConfig(): { name: string; note?: "database" | "secretLength" }[] {
  const missing: { name: string; note?: "database" | "secretLength" }[] = [];
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) missing.push({ name: "DATABASE_URL", note: "database" });
  if (!process.env.APP_PASSWORD) missing.push({ name: "APP_PASSWORD" });
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) missing.push({ name: "AUTH_SECRET", note: "secretLength" });
  return missing;
}
