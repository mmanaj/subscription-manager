import Link from "next/link";
import type { Payment } from "@/lib/data";
import { dateShort, money, relative } from "@/lib/format";
import { cycleLabel } from "@/lib/billing";
import { ScopeBadge } from "./scope";
import { Avatar } from "./ui";

export function PaymentRow({ p, today, index = 0 }: { p: Payment; today: string; index?: number }) {
  const s = p.sub;
  return (
    <Link
      href={`/subscriptions/${s.id}`}
      style={{ "--i": index } as React.CSSProperties}
      className="rise press -mx-2 flex items-center gap-3 rounded-[var(--radius-field)] px-2 py-3 hover:bg-canvas active:bg-canvas"
    >
      <div className="w-12 shrink-0 text-center">
        <div className="text-lg font-semibold leading-none tracking-tight text-ink">{dateShort(p.date).split(" ")[0]}</div>
        <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">{dateShort(p.date).split(" ")[1]}</div>
      </div>
      <span className="relative shrink-0">
        <Avatar name={s.name} color={s.color} logo={s.logo} size={40} />
        <ScopeBadge scope={s.scope} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{s.name}</div>
        <div className="truncate text-sm text-muted">
          {relative(p.date, today)} · {cycleLabel(s.intervalUnit, s.intervalCount)}
        </div>
      </div>
      <div className="text-right">
        <div className="tabular font-medium text-ink">{money(p.amount, s.currency)}</div>
        {s.currency !== "PLN" && <div className="tabular text-xs text-muted">≈ {money(p.pln)}</div>}
      </div>
    </Link>
  );
}
