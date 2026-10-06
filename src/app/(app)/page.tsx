import Link from "next/link";
import { after } from "next/server";
import { backfillLogos } from "@/lib/logos";
import { AlertTriangle, CalendarClock, CircleAlert, CreditCard, Hourglass, TrendingUp } from "lucide-react";
import { PaidButton } from "@/components/paid-button";
import { CardTiles, CategoryRanking, ScopeSplit } from "@/components/breakdowns";
import { PaymentCalendar } from "@/components/payment-calendar";
import { PaymentRow } from "@/components/payment-row";
import { CountUpMoney } from "@/components/count-up";
import { ScopeTabs } from "@/components/scope";
import { btn, Empty, SectionTitle } from "@/components/ui";
import { dashboardStats, isScope, loadAll, sum } from "@/lib/data";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const alertIcon = { trial: Hourglass, card: CreditCard, ending: CalendarClock, fx: AlertTriangle, price: TrendingUp, unpaid: CircleAlert };

export default async function Dashboard(props: PageProps<"/">) {
  const { typ } = await props.searchParams;
  const scope = isScope(typ) ? typ : undefined;
  const [data, i18n] = await Promise.all([loadAll(), getI18n()]);
  const { t, f } = i18n;
  const { money } = f;
  after(() => backfillLogos());
  const st = dashboardStats(data, scope, i18n);
  const scopesInUse = new Set(data.subs.map((s) => s.scope));

  if (data.subs.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="display text-4xl sm:text-5xl">{t.dashboard.emptyTitle}</h1>
        <Empty title={t.dashboard.emptyBody}>
          <Link href="/subscriptions/new" className={btn.primary}>
            {t.nav.addSubscription}
          </Link>
          <Link href="/cards/new" className={btn.link}>
            {t.dashboard.orCardFirst}
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      {/* Hero */}
      <div className="flex flex-col gap-6">
        {scopesInUse.size > 1 && (
          <ScopeTabs active={scope} available={scopesInUse} href={(t) => (t ? `/?typ=${t}` : "/")} />
        )}
        <section className="rise grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end sm:gap-12">
          <div>
            <p className="caption">
              {t.dashboard.avgMonthly}
              {scope && <> · {t.dashboard.scopeSuffix[scope]}</>}
            </p>
            <CountUpMoney value={st.monthly} currency={f.currencyLabel("PLN")} className="mt-2 block text-5xl sm:text-6xl" />
            <p className="mt-3 text-muted">
              <span className="tabular font-medium text-ink">{money(st.yearly, "PLN", { compact: true })}</span> {t.dashboard.perYear}
              <span className="px-1.5 text-hairline">·</span>
              <span className="tabular font-medium text-ink">{st.liveCount}</span>{" "}
              {t.dashboard.activeWord(st.liveCount)}
              {st.trialCount > 0 && (
                <>
                  <span className="px-1.5 text-hairline">·</span>
                  {t.dashboard.inTrial(st.trialCount)}
                </>
              )}
            </p>
          </div>
          <MonthProgress
            month={f.monthName(data.today)}
            i18n={i18n}
            total={st.thisMonthTotal}
            paid={st.thisMonthPaid}
            left={st.thisMonthLeft}
          />
        </section>
      </div>

      {st.alerts.length > 0 && (
        <section className="flex flex-col divide-y divide-hairline border-y border-hairline">
          {st.alerts.map((a, i) => {
            const Icon = alertIcon[a.kind];
            const body = (
              <>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink">{a.title}</span>
                  <span className="block truncate text-sm text-muted">{a.detail}</span>
                </span>
              </>
            );
            return a.href ? (
              <div
                key={i}
                className="rise -mx-3 flex items-center gap-2 rounded-[var(--radius-field)] pr-3 transition-colors hover:bg-surface-alt"
                style={{ "--i": i + 1 } as React.CSSProperties}
              >
                <Link href={a.href} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3 active:opacity-70">
                  {body}
                </Link>
                {a.pay && <PaidButton subId={a.pay.subId} date={a.pay.date} paid={false} />}
              </div>
            ) : (
              <div key={i} style={{ "--i": i + 1 } as React.CSSProperties} className="rise flex items-center gap-3 py-3">
                {body}
              </div>
            );
          })}
        </section>
      )}

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-x-16 lg:gap-y-20">
        <section className="rise min-w-0 lg:col-start-2 lg:row-start-1" style={{ "--i": 2 } as React.CSSProperties}>
          <PaymentCalendar payments={st.calendar} today={data.today} />
        </section>

        <section className="min-w-0 self-start lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <SectionTitle
            action={
              <span className="tabular text-sm text-muted">{money(sum(st.next30.map((p) => p.pln)))}</span>
            }
          >
            {t.dashboard.next30}
          </SectionTitle>
          {st.next30.length ? (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {st.next30.map((p, i) => (
                <li key={`${p.sub.id}-${p.date}`} className="rise" style={{ "--i": i + 2 } as React.CSSProperties}>
                  <PaymentRow p={p} today={data.today} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-muted">{t.dashboard.next30Empty}</p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-14 lg:col-start-2 lg:row-start-2">
          {!scope && st.byScope.length > 1 && (
            <div>
              <SectionTitle>{t.dashboard.byScope}</SectionTitle>
              <ScopeSplit data={st.byScope} total={st.monthly} />
            </div>
          )}
          <div>
            <SectionTitle>{t.dashboard.byCategory}</SectionTitle>
            <CategoryRanking
              data={st.byCategory}
              total={st.monthly}
              href={(c) => `/subscriptions?${new URLSearchParams({ kat: c, ...(scope ? { typ: scope } : {}) })}`}
            />
          </div>
          <div>
            <SectionTitle>{t.dashboard.byCard}</SectionTitle>
            <CardTiles data={st.byCard} total={st.monthly} />
          </div>
          <p className="text-[13px] text-muted">
            {t.dashboard.footnote(data.rates.date ? f.dateLong(data.rates.date) : null)}{" "}
            <span className="tabular font-medium text-ink">{money(st.next12m)}</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

/** This month at a glance: what's already gone vs. still to come, as one split bar. */
function MonthProgress({ month, total, paid, left, i18n }: { month: string; total: number; paid: number; left: number; i18n: I18n }) {
  const { t, f } = i18n;
  const { money } = f;
  const pct = total ? Math.round((paid / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="caption first-letter:uppercase">{month}</span>
        <span className="tabular text-xl font-semibold tracking-tight text-ink">{money(total, "PLN", { compact: true })}</span>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
        role="img"
        aria-label={t.dashboard.paidAria(pct, money(total))}
      >
        <div className="grow-x h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-sm">
        <span className="text-muted">
          {t.dashboard.paid} <span className="tabular font-medium text-ink">{money(paid, "PLN", { compact: true })}</span>
        </span>
        <span className="text-muted">
          {t.dashboard.left} <span className="tabular font-medium text-ink">{money(left, "PLN", { compact: true })}</span>
        </span>
      </div>
    </div>
  );
}
