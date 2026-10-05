// Runs DB migrations during the Vercel build. Without a database configured yet (e.g. the first
// deploy right after importing the repo) it skips instead of failing the whole build.
import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.warn(
    "\n⚠️  DATABASE_URL is not set — skipping migrations.\n" +
      "   Add Neon Postgres in Vercel → Storage, then redeploy.\n",
  );
  process.exit(0);
}
execSync("drizzle-kit migrate", { stdio: "inherit" });
