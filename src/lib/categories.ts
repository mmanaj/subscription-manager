import "server-only";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, subscriptions } from "@/db/schema";
import { isOtherCategory } from "./i18n";

/** Saved categories plus any free-text ones already used, alphabetical with "Other" last. */
export async function listCategories(): Promise<string[]> {
  const [saved, used] = await Promise.all([
    db.select({ c: categories.name }).from(categories),
    db.selectDistinct({ c: subscriptions.category }).from(subscriptions).where(isNotNull(subscriptions.category)),
  ]);
  const all = [...new Set([...saved, ...used].map((r) => r.c!.trim()).filter(Boolean))];
  return all.sort((a, b) => (isOtherCategory(a) ? 1 : isOtherCategory(b) ? -1 : a.localeCompare(b, "pl")));
}

/** Category name → number of subscriptions using it. */
export async function categoryUsage(): Promise<Map<string, number>> {
  const rows = await db.select({ c: subscriptions.category }).from(subscriptions).where(isNotNull(subscriptions.category));
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.c!.trim(), (m.get(r.c!.trim()) ?? 0) + 1);
  return m;
}
