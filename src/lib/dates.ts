// All dates are plain "YYYY-MM-DD" strings handled in UTC so server timezone never shifts them.

export type ISODate = string;

export function parse(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function fmt(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function today(tz = process.env.APP_TZ || "Europe/Warsaw"): ISODate {
  // en-CA renders as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
}

export function addDays(d: ISODate, n: number): ISODate {
  const x = parse(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fmt(x);
}

/** Adds months keeping the anchor's day-of-month, clamped to the target month length (Jan 31 → Feb 28 → Mar 31). */
export function addMonths(d: ISODate, n: number): ISODate {
  const x = parse(d);
  const day = x.getUTCDate();
  const target = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return fmt(target);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / 86_400_000);
}

export function startOfMonth(d: ISODate): ISODate {
  return d.slice(0, 8) + "01";
}

export function endOfMonth(d: ISODate): ISODate {
  return addDays(addMonths(startOfMonth(d), 1), -1);
}
