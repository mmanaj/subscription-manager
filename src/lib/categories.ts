import "server-only";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { categories, subscriptions } from "@/db/schema";

/** Saved categories plus any free-text ones already used, alphabetical with "Inne" last. */
export async function listCategories(): Promise<string[]> {
  const [saved, used] = await Promise.all([
    db.select({ c: categories.name }).from(categories),
    db.selectDistinct({ c: subscriptions.category }).from(subscriptions).where(isNotNull(subscriptions.category)),
  ]);
  const all = [...new Set([...saved, ...used].map((r) => r.c!.trim()).filter(Boolean))];
  return all.sort((a, b) => (a === "Inne" ? 1 : b === "Inne" ? -1 : a.localeCompare(b, "pl")));
}
