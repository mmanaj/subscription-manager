"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarPayment } from "@/lib/data";
import { Avatar } from "./ui";

const WEEKDAYS = ["pn", "wt", "śr", "cz", "pt", "so", "nd"];

function monthKey(d: string) {
  return d.slice(0, 7);
}

function shiftMonth(key: string, n: number) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const pln = (n: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN", maximumFractionDigits: 0 }).format(n);
const money = (n: number, c: string) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: c, minimumFractionDigits: 2 }).format(n);

export function PaymentCalendar({ payments, today }: { payments: CalendarPayment[]; today: string }) {
  const first = monthKey(today);
  const last = shiftMonth(first, 5);
  const [month, setMonth] = useState(first);
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
  const monthLabel = new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const dayList = byDay.get(selected) ?? [];
  const selectedLabel = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${selected}T00:00:00Z`),
  );

  return (
    <div className="rounded-large bg-fog p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Poprzedni miesiąc"
          disabled={month <= first}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-full p-2 text-forest transition hover:bg-paper disabled:opacity-30"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <div className="font-black capitalize tracking-tight text-obsidian">{monthLabel}</div>
          <div className="tabular text-xs font-semibold text-slate">{monthTotal ? pln(monthTotal) : "bez płatności"}</div>
        </div>
        <button
          type="button"
          aria-label="Następny miesiąc"
          disabled={month >= last}
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-full p-2 text-forest transition hover:bg-paper disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[11px] font-semibold uppercase text-pebble">
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
              aria-label={`${Number(d.slice(8))}${items.length ? `, ${items.length} płatn.` : ""}`}
              className={`flex aspect-square min-h-11 flex-col items-center justify-start gap-0.5 rounded-card pt-1 transition ${
                items.length || isSel ? "bg-paper" : "hover:bg-paper/60"
              } ${isSel ? "ring-2 ring-forest" : ""} ${past && !isSel ? "opacity-45" : ""}`}
            >
              <span
                className={`tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs ${
                  isToday ? "bg-forest font-bold text-lime" : items.length ? "font-bold text-obsidian" : "text-slate"
                }`}
              >
                {Number(d.slice(8))}
              </span>
              {items.length > 0 && (
                <span className="flex items-center -space-x-1.5">
                  {items.slice(0, 2).map((p) => (
                    <Avatar key={p.id} name={p.name} color={p.color} logo={p.logo} size={16} />
                  ))}
                  {items.length > 2 && <span className="pl-2 text-[9px] font-bold text-forest">+{items.length - 2}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 border-t border-paper pt-3">
        <div className="mb-1 text-sm font-semibold text-obsidian first-letter:uppercase">{selectedLabel}</div>
        {dayList.length === 0 ? (
          <p className="text-sm text-slate">Nic nie schodzi.</p>
        ) : (
          <ul className="flex flex-col">
            {dayList.map((p) => (
              <li key={p.id}>
                <Link href={`/subscriptions/${p.id}`} className="flex items-center gap-2 rounded-card py-1.5 hover:bg-paper/60">
                  <Avatar name={p.name} color={p.color} logo={p.logo} size={24} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-obsidian">{p.name}</span>
                  <span className="tabular text-sm text-charcoal">{money(p.amount, p.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
