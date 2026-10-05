import type { IntervalUnit, Subscription } from "@/db/schema";
import { addDays, addMonths, type ISODate } from "./dates";

type BillingFields = Pick<
  Subscription,
  "intervalCount" | "intervalUnit" | "startDate" | "firstBillingDate" | "trialEndDate" | "endDate" | "status"
>;

/** First charge date: explicit first billing date, else trial end, else start. */
export function billingAnchor(s: BillingFields): ISODate {
  return s.firstBillingDate ?? s.trialEndDate ?? s.startDate;
}

/** k-th charge date counting from the anchor (k = 0 is the anchor itself). */
export function nthCharge(anchor: ISODate, unit: IntervalUnit, count: number, k: number): ISODate {
  switch (unit) {
    case "day":
      return addDays(anchor, k * count);
    case "week":
      return addDays(anchor, k * count * 7);
    case "month":
      return addMonths(anchor, k * count);
    case "year":
      return addMonths(anchor, k * count * 12);
  }
}

/** Approximate period length in days, used only to jump close to a date range quickly. */
function approxDays(unit: IntervalUnit, count: number) {
  return { day: 1, week: 7, month: 30.436875, year: 365.2425 }[unit] * count;
}

/**
 * All charge dates within [from, to] (inclusive). A charge on/after endDate does not happen —
 * endDate means "access ends / no longer renews".
 */
export function chargesBetween(s: BillingFields, from: ISODate, to: ISODate, ignoreStatus = false): ISODate[] {
  if (!ignoreStatus && s.status !== "active") return [];
  const anchor = billingAnchor(s);
  const count = Math.max(1, s.intervalCount);
  const out: ISODate[] = [];
  let k = 0;
  if (from > anchor) {
    const daysAhead = (Date.parse(from) - Date.parse(anchor)) / 86_400_000;
    k = Math.max(0, Math.floor(daysAhead / approxDays(s.intervalUnit, count)) - 1);
  }
  for (let i = 0; i < 5000; i++, k++) {
    const d = nthCharge(anchor, s.intervalUnit, count, k);
    if (d > to) break;
    if (s.endDate && d >= s.endDate) break;
    if (d >= from) out.push(d);
  }
  return out;
}

export function nextCharge(s: BillingFields, from: ISODate): ISODate | null {
  return chargesBetween(s, from, addMonths(from, 12 * Math.max(1, s.intervalCount) + 12))[0] ?? null;
}

/** Charges per month on average for this cycle. */
export function monthlyFactor(unit: IntervalUnit, count: number): number {
  const c = Math.max(1, count);
  return { day: 30.436875, week: 30.436875 / 7, month: 1, year: 1 / 12 }[unit] / c;
}

export function isLive(s: BillingFields, today: ISODate): boolean {
  return s.status === "active" && (!s.endDate || s.endDate > today);
}

export function inTrial(s: BillingFields, today: ISODate): boolean {
  return !!s.trialEndDate && s.trialEndDate > today && s.status === "active";
}

export function cycleLabel(unit: IntervalUnit, count: number): string {
  if (count === 1) return { day: "codziennie", week: "co tydzień", month: "co miesiąc", year: "co rok" }[unit];
  if (unit === "month" && count === 3) return "co kwartał";
  if (unit === "month" && count === 6) return "co pół roku";
  const forms: Record<IntervalUnit, [string, string, string]> = {
    day: ["dzień", "dni", "dni"],
    week: ["tydzień", "tygodnie", "tygodni"],
    month: ["miesiąc", "miesiące", "miesięcy"],
    year: ["rok", "lata", "lat"],
  };
  return `co ${count} ${plural(count, forms[unit])}`;
}

export function plural(n: number, [one, few, many]: [string, string, string]): string {
  if (n === 1) return one;
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return few;
  return many;
}
