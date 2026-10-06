"use client";

import { useOptimistic, useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/lib/i18n";

export function LanguagePicker({ current }: { current: Locale }) {
  const [active, setActive] = useOptimistic(current);
  const [pending, start] = useTransition();
  return (
    <div className={`inline-grid grid-cols-2 self-start rounded-full bg-hairline/60 p-1 ${pending ? "opacity-70" : ""}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={active === l}
          onClick={() =>
            start(async () => {
              setActive(l);
              await setLocale(l);
            })
          }
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${active === l ? "bg-paper text-ink shadow-card" : "text-muted hover:text-ink"}`}
        >
          {LOCALE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}
