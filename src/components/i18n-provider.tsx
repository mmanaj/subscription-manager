"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, i18n, type I18n, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** Dictionary + formatters for client components. */
export function useI18n(): I18n {
  const locale = useContext(LocaleContext);
  return useMemo(() => i18n(locale), [locale]);
}
