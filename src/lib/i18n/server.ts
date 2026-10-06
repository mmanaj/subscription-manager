import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, i18n, isLocale, LOCALE_COOKIE, type Locale } from "./index";

/** Language saved in settings — used where there's no browser cookie (cron, calendar feed). */
export async function storedLocale(): Promise<Locale> {
  try {
    const { db } = await import("@/db");
    const { settings } = await import("@/db/schema");
    const [row] = await db.select({ locale: settings.locale }).from(settings);
    return isLocale(row?.locale) ? row.locale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** This request's language: the cookie set from settings, else the stored setting. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) return DEFAULT_LOCALE;
  return storedLocale();
});

export async function getI18n() {
  return i18n(await getLocale());
}
