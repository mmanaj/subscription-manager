import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { notificationLog, settings } from "@/db/schema";
import { loadAll } from "@/lib/data";
import { dateLong, money } from "@/lib/format";
import { pushConfigured, sendToAll } from "@/lib/push";
import { dueReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Daily job (Vercel Cron): push reminders for opted-in subscriptions. Safe to run more than once a day. */
export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  if (!pushConfigured()) return Response.json({ skipped: "VAPID keys not set" });

  const [cfg] = await db.select().from(settings);
  const opts = { daysBefore: cfg?.remindDaysBefore ?? 3, sameDay: cfg?.remindSameDay ?? true };
  const { subs, today } = await loadAll();
  const due = dueReminders(subs, today, opts);

  const results = [];
  for (const r of due) {
    // Claim the reminder first; if it's already logged (earlier run), skip it.
    const claimed = await db
      .insert(notificationLog)
      .values({ subscriptionId: r.subId, chargeDate: r.chargeDate, kind: r.kind })
      .onConflictDoNothing()
      .returning({ id: notificationLog.id });
    if (!claimed.length) continue;

    const s = subs.find((x) => x.id === r.subId)!;
    const amount = money(s.myAmountOn(r.chargeDate), s.currency);
    const card = s.card ? ` · ${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}` : "";
    const days = opts.daysBefore === 1 ? "Jutro" : `Za ${opts.daysBefore} dni`;
    const res = await sendToAll({
      title: r.kind === "day" ? `Dziś płatność: ${s.name}` : `${days}: ${s.name}`,
      body: `${amount} · ${dateLong(r.chargeDate)}${card}`,
      url: `/subscriptions/${s.id}`,
      tag: `sub-${s.id}-${r.chargeDate}-${r.kind}`,
    });
    results.push({ ...r, ...res });
  }
  return Response.json({ today, due: due.length, results });
}
