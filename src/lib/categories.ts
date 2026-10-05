import "server-only";
import { isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";

export async function usedCategories(): Promise<string[]> {
  const rows = await db.selectDistinct({ c: subscriptions.category }).from(subscriptions).where(isNotNull(subscriptions.category));
  return rows.map((r) => r.c!).sort((a, b) => a.localeCompare(b, "pl"));
}
