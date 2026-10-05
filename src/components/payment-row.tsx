import Link from "next/link";
import type { Payment } from "@/lib/data";
import { dateShort, money, relative } from "@/lib/format";
import { cycleLabel } from "@/lib/billing";
import { Avatar } from "./ui";

export function PaymentRow({ p, today }: { p: Payment; today: string }) {
  const s = p.sub;
  return (
    <Link href={`/subscriptions/${s.id}`} className="flex items-center gap-3 rounded-card px-2 py-3 transition hover:bg-fog/60 active:bg-fog">
      <div className="w-12 shrink-0 text-center">
        <div className="text-xl font-black leading-none tracking-tight text-obsidian">{dateShort(p.date).split(" ")[0]}</div>
        <div className="text-[11px] font-semibold uppercase text-pebble">{dateShort(p.date).split(" ")[1]}</div>
      </div>
      <Avatar name={s.name} color={s.color} logo={s.logo} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-obsidian">{s.name}</div>
        <div className="truncate text-sm text-slate">
          {relative(p.date, today)} · {cycleLabel(s.intervalUnit, s.intervalCount)}
        </div>
      </div>
      <div className="text-right">
        <div className="tabular font-semibold text-obsidian">{money(p.amount, s.currency)}</div>
        {s.currency !== "PLN" && <div className="tabular text-xs text-pebble">≈ {money(p.pln)}</div>}
      </div>
    </Link>
  );
}
