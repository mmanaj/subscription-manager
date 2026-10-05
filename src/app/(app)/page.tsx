import Link from "next/link";
import { after } from "next/server";
import { backfillLogos } from "@/lib/logos";
import { AlertTriangle, CalendarClock, CreditCard, Hourglass, TrendingUp } from "lucide-react";
import { Bars } from "@/components/bars";
import { PaymentCalendar } from "@/components/payment-calendar";
import { PaymentRow } from "@/components/payment-row";
import { CountUpMoney } from "@/components/count-up";
import { ScopeTabs } from "@/components/scope";
import { btn, Empty, SectionTitle } from "@/components/ui";
import { dashboardStats, isScope, loadAll, sum } from "@/lib/data";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const alertIcon = { trial: Hourglass, card: CreditCard, ending: CalendarClock, fx: AlertTriangle, price: TrendingUp };

export default async function Dashboard(props: PageProps<"/">) {
  const { typ } = await props.searchParams;
  const scope = isScope(typ) ? typ : undefined;
  const data = await loadAll();
  after(() => backfillLogos());
  const st = dashboardStats(data, scope);
  const scopesInUse = new Set(data.subs.map((s) => s.scope));

  if (data.subs.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="display text-4xl sm:text-5xl">Zero subskrypcji</h1>
        <Empty title="Dodaj pierwszą, żeby zobaczyć ile naprawdę płacisz.">
          <Link href="/subscriptions/new" className={btn.primary}>
            Dodaj subskrypcję
          </Link>
          <Link href="/cards/new" className={btn.link}>
            albo najpierw kartę
          </Link>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Hero */}
      <div className="flex flex-col gap-4">
        {scopesInUse.size > 1 && (
          <ScopeTabs active={scope} available={scopesInUse} href={(t) => (t ? `/?typ=${t}` : "/")} />
        )}
        <section className="rise card p-5 sm:p-8">
          <p className="caption">Płacisz średnio miesięcznie</p>
          <CountUpMoney value={st.monthly} className="mt-2 block text-5xl sm:text-6xl" />
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-field)] bg-hairline sm:grid-cols-4">
            <Stat label="Rocznie" value={money(st.yearly, "PLN", { compact: true })} />
            <Stat label="W tym miesiącu" value={money(st.thisMonthTotal, "PLN", { compact: true })} />
            <Stat label="Zostało w tym mies." value={money(st.thisMonthLeft, "PLN", { compact: true })} />
            <Stat
              label="Aktywne"
              value={String(st.liveCount)}
              hint={st.trialCount ? `${st.trialCount} w okresie próbnym` : undefined}
            />
          </div>
        </section>
      </div>

      {st.alerts.length > 0 && (
        <section className="card flex flex-col divide-y divide-hairline overflow-hidden">
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
              <Link
                key={i}
                href={a.href}
                style={{ "--i": i + 1 } as React.CSSProperties}
                className="rise press flex items-center gap-3 px-4 py-3 hover:bg-surface-alt"
              >
                {body}
              </Link>
            ) : (
              <div key={i} style={{ "--i": i + 1 } as React.CSSProperties} className="rise flex items-center gap-3 px-4 py-3">
                {body}
              </div>
            );
          })}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rise min-w-0 lg:col-start-2 lg:row-start-1" style={{ "--i": 2 } as React.CSSProperties}>
          <PaymentCalendar payments={st.calendar} today={data.today} />
        </section>

        <section className="card min-w-0 self-start p-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
          <SectionTitle
            action={
              <span className="tabular text-sm text-muted">{money(sum(st.next30.map((p) => p.pln)))}</span>
            }
          >
            Najbliższe 30 dni
          </SectionTitle>
          {st.next30.length ? (
            <div className="divide-y divide-hairline">
              {st.next30.map((p, i) => (
                <PaymentRow key={`${p.sub.id}-${p.date}`} p={p} today={data.today} index={i + 2} />
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-muted">Spokój. Nic nie schodzi w ciągu 30 dni.</p>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-6 lg:col-start-2 lg:row-start-2">
          {!scope && st.byScope.length > 1 && (
            <div className="card p-5">
              <SectionTitle>Czyje</SectionTitle>
              <Bars data={st.byScope} total={st.monthly} />
            </div>
          )}
          <div className="card p-5">
            <SectionTitle>Na co idzie</SectionTitle>
            <Bars
              data={st.byCategory}
              total={st.monthly}
              href={(c) => `/subscriptions?${new URLSearchParams({ kat: c, ...(scope ? { typ: scope } : {}) })}`}
            />
          </div>
          <div className="card p-5">
            <SectionTitle>Z jakiej karty</SectionTitle>
            <Bars data={st.byCard} total={st.monthly} />
          </div>
          <p className="px-1 text-[13px] text-muted">
            Kwoty miesięczne to średnia: płatności roczne dzielone na 12, kwartalne na 3. W walutach obcych przeliczone po
            kursie średnim NBP{data.rates.date ? ` z ${data.rates.date}` : ""}. Następne 12 mies.:{" "}
            <span className="tabular font-medium text-ink">{money(st.next12m)}</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-surface-alt px-4 py-3">
      <div className="caption">{label}</div>
      <div className="tabular mt-1 text-xl font-semibold tracking-tight text-ink sm:text-2xl">{value}</div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </div>
  );
}
