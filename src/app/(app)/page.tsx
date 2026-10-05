import Link from "next/link";
import { AlertTriangle, CalendarClock, CreditCard, Hourglass } from "lucide-react";
import { Bars } from "@/components/bars";
import { PaymentRow } from "@/components/payment-row";
import { BigMoney, btn, Empty, SectionTitle } from "@/components/ui";
import { dashboardStats, loadAll, sum } from "@/lib/data";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

const alertIcon = { trial: Hourglass, card: CreditCard, ending: CalendarClock, fx: AlertTriangle };

export default async function Dashboard() {
  const data = await loadAll();
  const st = dashboardStats(data);

  if (data.subs.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="display text-[64px] text-obsidian sm:text-[105px]">
          ZERO
          <br />
          SUBSKRYPCJI.
        </h1>
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
    <div className="flex flex-col gap-10 sm:gap-16">
      {/* Hero */}
      <section className="rounded-large bg-forest p-6 text-paper sm:p-10">
        <p className="text-sm font-semibold text-mist">Płacisz średnio miesięcznie</p>
        <BigMoney value={st.monthly} className="mt-3 block text-[64px] text-lime sm:text-[105px]" />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4">
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

      {st.alerts.length > 0 && (
        <section className="flex flex-col gap-2">
          {st.alerts.map((a, i) => {
            const Icon = alertIcon[a.kind];
            const body = (
              <>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-lime">
                  <Icon size={20} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-forest">{a.title}</span>
                  <span className="block truncate text-sm text-spruce">{a.detail}</span>
                </span>
              </>
            );
            return a.href ? (
              <Link key={i} href={a.href} className="flex items-center gap-3 rounded-card bg-mist p-3 transition hover:brightness-[0.98]">
                {body}
              </Link>
            ) : (
              <div key={i} className="flex items-center gap-3 rounded-card bg-mist p-3">
                {body}
              </div>
            );
          })}
        </section>
      )}

      <div className="grid grid-cols-1 gap-10 sm:gap-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <SectionTitle
            action={
              <span className="tabular text-sm font-semibold text-slate">{money(sum(st.next30.map((p) => p.pln)))}</span>
            }
          >
            Najbliższe 30 dni
          </SectionTitle>
          {st.next30.length ? (
            <div className="-mx-2 divide-y divide-fog">
              {st.next30.map((p) => (
                <PaymentRow key={`${p.sub.id}-${p.date}`} p={p} today={data.today} />
              ))}
            </div>
          ) : (
            <Empty title="Spokój. Nic nie schodzi w ciągu 30 dni." />
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-10">
          <div>
            <SectionTitle>Na co idzie</SectionTitle>
            <Bars data={st.byCategory} total={st.monthly} />
          </div>
          <div>
            <SectionTitle>Z jakiej karty</SectionTitle>
            <Bars data={st.byCard} total={st.monthly} />
          </div>
          <p className="text-sm text-pebble">
            Kwoty miesięczne to średnia: płatności roczne dzielone na 12, kwartalne na 3. W walutach obcych przeliczone po
            kursie średnim NBP{data.rates.date ? ` z ${data.rates.date}` : ""}. Następne 12 mies.:{" "}
            <span className="tabular font-semibold text-charcoal">{money(st.next12m)}</span>.
          </p>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-mist/70">{label}</div>
      <div className="tabular mt-1 text-2xl font-black tracking-tight text-paper sm:text-3xl">{value}</div>
      {hint && <div className="text-xs text-lime">{hint}</div>}
    </div>
  );
}
