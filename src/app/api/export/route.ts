import { db } from "@/db";
import { cards, subscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuth();
  const [c, s] = await Promise.all([db.select().from(cards), db.select().from(subscriptions)]);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), cards: c, subscriptions: s }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="subskrypcje-${today()}.json"`,
    },
  });
}
