import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, categories, subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const [c, s, cats] = await Promise.all([
    db.select().from(cards).where(eq(cards.userId, user.id)),
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select({ name: categories.name }).from(categories).where(eq(categories.userId, user.id)),
  ]);
  const body = { exportedAt: new Date().toISOString(), account: user.email, categories: cats.map((x) => x.name), cards: c, subscriptions: s };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="subskrypcje-${today()}.json"`,
    },
  });
}
