import type { IntervalUnit } from "@/db/schema";
import { diffDays, parse, type ISODate } from "../dates";
import { en } from "./en";
import { pl, type Dict } from "./pl";

export type { Dict };
export const LOCALES = ["pl", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pl";
export const LOCALE_COOKIE = "subs_lang";
export const LOCALE_NAMES: Record<Locale, string> = { pl: "Polski", en: "English" };

const dicts: Record<Locale, Dict> = { pl, en };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function dict(locale: Locale): Dict {
  return dicts[locale];
}

/** Number, date and relative-time formatting for one language. */
export function formatters(locale: Locale) {
  const tag = locale === "en" ? "en-GB" : "pl-PL";
  const t = dicts[locale];
  const dateFmt = (opts: Intl.DateTimeFormatOptions) => (d: ISODate) =>
    new Intl.DateTimeFormat(tag, { ...opts, timeZone: "UTC" }).format(parse(d));
  return {
    tag,
    money(amount: number, currency = "PLN", opts: { compact?: boolean } = {}): string {
      return new Intl.NumberFormat(tag, {
        style: "currency",
        currency,
        minimumFractionDigits: opts.compact ? 0 : 2,
        maximumFractionDigits: opts.compact ? 0 : 2,
      }).format(amount);
    },
    /** Number split for big display figures: grouped integer part, decimals, decimal separator. */
    amountParts(amount: number): { int: string; dec: string; sep: string } {
      const [i, d] = Math.abs(amount).toFixed(2).split(".");
      const int = new Intl.NumberFormat(tag, { useGrouping: "always" }).format(Number(i));
      return { int: (amount < 0 ? "-" : "") + int, dec: d, sep: locale === "en" ? "." : "," };
    },
    /** Currency label next to a big figure: "zł" reads naturally in Polish, the code elsewhere. */
    currencyLabel(currency: string) {
      return currency === "PLN" && locale === "pl" ? "zł" : currency;
    },
    dateLong: dateFmt({ day: "numeric", month: "long", year: "numeric" }),
    dateShort: dateFmt({ day: "numeric", month: "short" }),
    monthName: dateFmt({ month: "long" }),
    relative(d: ISODate, today: ISODate): string {
      const n = diffDays(d, today);
      if (n === 0) return t.relative.today;
      if (n === 1) return t.relative.tomorrow;
      if (n === -1) return t.relative.yesterday;
      return n > 0 ? t.relative.inDays(n) : t.relative.daysAgo(-n);
    },
    cycle(unit: IntervalUnit, count: number) {
      return t.cycle(unit, count);
    },
    compare(a: string, b: string) {
      return a.localeCompare(b, tag);
    },
  };
}

export type Formatters = ReturnType<typeof formatters>;
export type I18n = { locale: Locale; t: Dict; f: Formatters };

export function i18n(locale: Locale): I18n {
  return { locale, t: dicts[locale], f: formatters(locale) };
}

/** Category names that sort last, whatever language they were created in. */
export function isOtherCategory(name: string) {
  return name === pl.otherCategory || name === en.otherCategory;
}
