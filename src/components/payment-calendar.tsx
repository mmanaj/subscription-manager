"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarPayment } from "@/lib/data";
import { useI18n } from "./i18n-provider";
import { Avatar } from "./ui";

function monthKey(d: string) {
  return d.slice(0, 7);
}

function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function PaymentCalendar({ payments, today }: { payments: CalendarPayment[]; today: string }) {
  const { t, f } = useI18n();
  const pln = (n: number) => f.money(n, "PLN", { compact: true });
  const first = monthKey(today);
  const last = shiftMonth(first, 5);
  const [month, setMonth] = useState(first);
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const go = (n: number) => {
    setDir(n > 0 ? "next" : "prev");
    setMonth(shiftMonth(month, n));
  };
  const byDay = useMemo(() => {
    const m = new Map<string, CalendarPayment[]>();
    for (const p of payments) m.set(p.date, [...(m.get(p.date) ?? []), p]);
    return m;
  }, [payments]);
  // Default selection: the next day with a payment, so the list below is never empty without reason.
  const [selected, setSelected] = useState<string>(() => payments.find((p) => p.date >= today)?.date ?? today);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  const monthTotal = payments.filter((p) => monthKey(p.date) === month).reduce((a, p) => a + p.pln, 0);
  const monthLabel = new Intl.DateTimeFormat(f.tag, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const dayList = byDay.get(selected) ?? [];
  const selectedLabel = new Intl.DateTimeFormat(f.tag, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${selected}T00:00:00Z`),
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t.calendar.prev}
          disabled={month <= first}
          onClick={() => go(-1)}
          className="rounded-full p-2 text-ink transition hover:bg-canvas disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div key={month} className={`text-center ${dir === "next" ? "slide-from-right" : dir === "prev" ? "slide-from-left" : ""}`}>
          <div className="font-semibold capitalize tracking-tight text-ink">{monthLabel}</div>
          <div className="tabular text-xs text-muted">{monthTotal ? pln(monthTotal) : t.calendar.noPayments}</div>
        </div>
        <button
          type="button"
          aria-label={t.calendar.next}
          disabled={month >= last}
          onClick={() => go(1)}
          className="rounded-full p-2 text-ink transition hover:bg-canvas disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        key={month}
        className={`grid grid-cols-7 gap-1 text-center ${dir === "next" ? "slide-from-right" : dir === "prev" ? "slide-from-left" : ""}`}
      >
        {t.calendar.weekdays.map((d) => (
          <div key={d} className="pb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            {d}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`x${i}`} />;
          const items = byDay.get(d) ?? [];
          const past = d < today;
          const isToday = d === today;
          const isSel = d === selected;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              aria-pressed={isSel}
              aria-label={t.calendar.dayAria(Number(d.slice(8)), items.length)}
              className={`flex aspect-square min-h-11 flex-col active:scale-95 items-center justify-start gap-0.5 rounded-card pt-1 transition ${
                items.length || isSel ? "bg-canvas" : "hover:bg-canvas"
              } ${isSel ? "ring-2 ring-ink" : ""} ${past && !isSel ? "opacity-45" : ""}`}
            >
              <span
                className={`tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                  isToday ? "bg-ink font-medium text-paper" : items.length ? "font-semibold text-ink" : "text-muted"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              {items.length > 0 && (
                <span className="flex items-center -space-x-1.5">
                  {items.slice(0, 2).map((p) => (
                    <Avatar key={p.id} name={p.name} color={p.color} logo={p.logo} size={16} />
                  ))}
                  {items.length > 2 && <span className="pl-2 text-[9px] font-medium text-ink">+{items.length - 2}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div key={selected} className="fade-in mt-4 border-t border-hairline pt-3">
        <div className="mb-1 text-sm font-medium text-ink first-letter:uppercase">{selectedLabel}</div>
        {dayList.length === 0 ? (
          <p className="text-sm text-muted">{t.calendar.nothing}</p>
        ) : (
          <ul className="flex flex-col">
            {dayList.map((p) => (
              <li key={p.id}>
                <Link href={`/subscriptions/${p.id}`} className="flex items-center gap-2 rounded-card py-1.5 hover:bg-canvas">
                  <Avatar name={p.name} color={p.color} logo={p.logo} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.name}</span>
                  <span className="tabular text-sm text-ink-soft">{f.money(p.amount, p.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
