import { db } from "@/db";
import { cards, subscriptions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { today } from "@/lib/dates";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAuth();
  const [c, s, { t }] = await Promise.all([db.select().from(cards), db.select().from(subscriptions), getI18n()]);
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), cards: c, subscriptions: s }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${t.settings.exportFile}-${today()}.json"`,
    },
  });
}
