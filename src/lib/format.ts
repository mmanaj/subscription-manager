import { diffDays, parse, type ISODate } from "./dates";
import { plural } from "./billing";

export function money(amount: number, currency = "PLN", opts: { compact?: boolean } = {}): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: opts.compact ? 0 : 2,
    maximumFractionDigits: opts.compact ? 0 : 2,
  }).format(amount);
}

/** Number without currency, for big display figures. */
export function amountParts(amount: number): { int: string; dec: string } {
  const fixed = Math.abs(amount).toFixed(2);
  const [i, d] = fixed.split(".");
  return { int: (amount < 0 ? "-" : "") + new Intl.NumberFormat("pl-PL", { useGrouping: "always" }).format(Number(i)), dec: d };
}

export function dateLong(d: ISODate): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(parse(d));
}

export function dateShort(d: ISODate): string {
  return new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" }).format(parse(d));
}

export function weekday(d: ISODate): string {
  return new Intl.DateTimeFormat("pl-PL", { weekday: "short", timeZone: "UTC" }).format(parse(d));
}

export function relative(d: ISODate, today: ISODate): string {
  const n = diffDays(d, today);
  if (n === 0) return "dziś";
  if (n === 1) return "jutro";
  if (n === -1) return "wczoraj";
  if (n > 0) return `za ${n} ${plural(n, ["dzień", "dni", "dni"])}`;
  return `${-n} ${plural(-n, ["dzień", "dni", "dni"])} temu`;
}
