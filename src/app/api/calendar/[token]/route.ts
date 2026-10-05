import { timingSafeEqual } from "node:crypto";
import { addDays, addMonths } from "@/lib/dates";
import { loadAll, paymentsBetween } from "@/lib/data";

export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function tokenOk(given: string) {
  const expected = process.env.ICS_TOKEN;
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(_req: Request, ctx: RouteContext<"/api/calendar/[token]">) {
  const { token } = await ctx.params;
  if (!tokenOk(token.replace(/\.ics$/, ""))) return new Response("Not found", { status: 404 });

  const data = await loadAll();
  const payments = paymentsBetween(data.subs, addDays(data.today, -31), addMonths(data.today, 12));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//subs//PL",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:Subskrypcje",
    "X-PUBLISHED-TTL:PT6H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
  ];
  for (const p of payments) {
    const d = p.date.replace(/-/g, "");
    const end = addDays(p.date, 1).replace(/-/g, "");
    const amount = `${p.sub.myAmount.toFixed(2)} ${p.sub.currency}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:sub-${p.sub.id}-${d}@subs`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${d}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${esc(`💳 ${p.sub.name} — ${amount}`)}`,
      `DESCRIPTION:${esc(
        [p.sub.card ? `Karta: ${p.sub.card.name}${p.sub.card.last4 ? ` ••${p.sub.card.last4}` : ""}` : "", p.sub.url ?? ""]
          .filter(Boolean)
          .join("\n"),
      )}`,
      "TRANSP:TRANSPARENT",
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${esc(`Jutro płatność: ${p.sub.name}`)}`,
      "TRIGGER:-PT12H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=3600" },
  });
}
