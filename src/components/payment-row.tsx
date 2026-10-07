import Link from "next/link";
import { canMarkPaid, type Payment } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { PaidButton } from "./paid-button";
import { ScopeBadge } from "./scope";
import { Avatar } from "./ui";

export async function PaymentRow({ p, today }: { p: Payment; today: string }) {
  const { t, f } = await getI18n();
  const { dateShort, money, relative } = f;
  const s = p.sub;
  return (
    <div className="-mx-3 flex items-center gap-2 rounded-[var(--radius-field)] pr-3 transition-colors hover:bg-surface-alt">
      <Link href={`/subscriptions/${s.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 active:opacity-70">
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
            {p.paidOn ? (
              <>
                {t.status.paidOn(dateShort(p.paidOn))}
                {p.paidOn !== p.due && ` · ${t.status.dueOn(dateShort(p.due))}`}
              </>
            ) : (
              <>
                {s.manual ? (p.paid ? t.status.paid : p.overdue ? <span className="text-ember">{t.status.overdue}</span> : t.status.manual) : relative(p.date, today)}
                {" · "}
                {s.manual ? relative(p.date, today) : f.cycle(s.intervalUnit, s.intervalCount)}
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`tabular font-medium ${p.paidOn || (p.paid && s.manual) ? "text-muted line-through decoration-hairline" : "text-ink"}`}>
            {money(p.amount, s.currency)}
          </div>
          {s.currency !== "PLN" && <div className="tabular text-xs text-muted">≈ {money(p.pln)}</div>}
        </div>
      </Link>
      {canMarkPaid(s, p.due, today) && <PaidButton subId={s.id} date={p.due} paid={!!p.paidOn || (s.manual && p.paid)} />}
    </div>
  );
}
