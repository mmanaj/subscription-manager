import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import { cancelSubscription, deleteSubscription, setStatus } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PriceHistory } from "@/components/price-history";
import { LogoSheet } from "@/components/logo-sheet";
import { logoDomainFor } from "@/lib/logo-domains";
import { BigMoney, btn, Tag } from "@/components/ui";
import { chargesBetween, cycleLabel, monthlyFactor } from "@/lib/billing";
import { addDays, addMonths } from "@/lib/dates";
import { cardExpiry, loadOne, SCOPES, sum } from "@/lib/data";
import { dateLong, dateShort, money, relative } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetail(props: PageProps<"/subscriptions/[id]">) {
  const id = Number((await props.params).id);
  const { sub: s, today, rates } = await loadOne(id);
  if (!s) notFound();

  const upcoming = s.live ? chargesBetween(s, today, addMonths(today, 24)).slice(0, 6) : [];
  const past = chargesBetween(s, "1970-01-01", addDays(today, -1), true);
  const paidSoFar = sum(past.map((d) => s.myAmountOn(d)));
  const cardExp = s.card ? cardExpiry(s.card) : null;
  const perYear = s.myAmount * monthlyFactor(s.intervalUnit, s.intervalCount) * 12;
  const foreign = s.currency !== "PLN";
  const cur = s.currency === "PLN" ? "zł" : s.currency;

  const status = s.trial ? (
    <Tag>okres próbny do {dateShort(s.trialEndDate!)}</Tag>
  ) : s.status === "paused" ? (
    <Tag tone="fog">wstrzymana</Tag>
  ) : s.status === "cancelled" ? (
    <Tag tone="fog">anulowana{s.endDate ? ` · dostęp do ${dateShort(s.endDate)}` : ""}</Tag>
  ) : s.live ? (
    <Tag tone="dark">aktywna</Tag>
  ) : (
    <Tag tone="fog">zakończona</Tag>
  );

  return (
    <div className="flex flex-col gap-8">
      <Link href="/subscriptions" className="text-sm font-semibold text-slate hover:text-forest">
        ← Subskrypcje
      </Link>

      <header className="rise flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <LogoSheet
            id={s.id}
            name={s.name}
            color={s.color}
            logo={s.logo}
            domain={s.logoCustom && !s.logo ? null : logoDomainFor(s)}
            overridden={s.logoCustom || !!s.logoDomain}
          />
          <div className="min-w-0">
            <h1 className="heading truncate text-[40px] sm:text-[61px]">{s.name}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              {status}
              {s.scope !== "personal" && <Tag tone="fog">{SCOPES[s.scope].label.toLowerCase()}</Tag>}
              {s.category && <Tag tone="fog">{s.category}</Tag>}
            </div>
          </div>
        </div>
        <div>
          <BigMoney value={s.myAmount} currency={cur} className="text-[64px] text-obsidian sm:text-[89px]" />
          <p className="mt-2 text-slate">
            {cycleLabel(s.intervalUnit, s.intervalCount)}
            {s.splitWith > 1 && ` · Twoja część z ${money(s.amountNum, s.currency)} ÷ ${s.splitWith}`}
            {foreign && ` · ≈ ${money(s.chargePLN)}`}
          </p>
        </div>
      </header>

      {s.next && (
        <section className="rise rounded-large bg-forest p-6 text-paper sm:p-8" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="text-sm font-semibold text-mist">Następna płatność</p>
          <p className="display mt-2 text-[44px] text-lime sm:text-[61px]">{relative(s.next, today)}</p>
          <p className="mt-2 text-mist">
            {dateLong(s.next)}
            {s.card && ` · ${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}`}
          </p>
          {cardExp && s.next > cardExp && (
            <p className="mt-3 rounded-card bg-paper/10 px-3 py-2 text-sm text-lime">
              Karta wygasa przed tą płatnością — zaktualizuj ją w serwisie.
            </p>
          )}
        </section>
      )}

      <div className="rise grid gap-8 md:grid-cols-2" style={{ "--i": 2 } as React.CSSProperties}>
        <dl className="divide-y divide-fog rounded-card shadow-hairline">
          {s.startDate && <Row label="Od">{dateLong(s.startDate)}</Row>}
          <Row label="Do">{s.endDate ? dateLong(s.endDate) : "bezterminowo"}</Row>
          {s.trialEndDate && <Row label="Okres próbny do">{dateLong(s.trialEndDate)}</Row>}
          <Row label="Cykl">{cycleLabel(s.intervalUnit, s.intervalCount)}</Row>
          <Row label="Karta">{s.card ? `${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}` : "—"}</Row>
          <Row label="Rocznie">{money(perYear, s.currency)}</Row>
          <Row label="Średnio / mies.">{money(perYear / 12, s.currency)}</Row>
          <Row label="Zapłacono dotąd">
            {money(paidSoFar, s.currency)} <span className="text-pebble">({past.length}×)</span>
          </Row>
          {foreign && <Row label="Kurs NBP">{rates.rates[s.currency]?.toFixed(4) ?? "—"} zł</Row>}
        </dl>

        <div className="flex flex-col gap-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="heading mb-3 text-2xl">Kolejne płatności</h2>
              <ul className="flex flex-col gap-1">
                {upcoming.map((d) => (
                  <li key={d} className="flex justify-between rounded-card bg-fog px-4 py-2.5 text-sm">
                    <span className="font-semibold text-obsidian">{dateLong(d)}</span>
                    <span className="tabular text-charcoal">
                      {money(s.myAmountOn(d), s.currency)}
                      {foreign && <span className="text-pebble"> · {money(s.plnOn(d))}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.notes && (
            <div>
              <h2 className="heading mb-2 text-2xl">Notatki</h2>
              <p className="whitespace-pre-wrap text-charcoal">{s.notes}</p>
            </div>
          )}
          {s.url && (
            <a href={s.url} target="_blank" rel="noreferrer" className={btn.link}>
              Zarządzaj w serwisie <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>

      <PriceHistory
        subId={s.id}
        events={s.priceEvents}
        currency={s.currency}
        split={Math.max(1, s.splitWith)}
        today={today}
        startDate={s.startDate}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href={`/subscriptions/${s.id}/edit`} className={btn.primary}>
          <Pencil size={18} /> Edytuj
        </Link>
        {s.status === "active" && (
          <>
            <ConfirmButton
              action={cancelSubscription.bind(null, s.id)}
              confirm="Oznaczyć jako anulowaną? Dostęp do daty najbliższej płatności."
              className={btn.outline}
            >
              Anuluj subskrypcję
            </ConfirmButton>
            <ConfirmButton action={setStatus.bind(null, s.id, "paused")} className={btn.outline}>
              Wstrzymaj
            </ConfirmButton>
          </>
        )}
        {s.status !== "active" && (
          <ConfirmButton action={setStatus.bind(null, s.id, "active")} className={btn.outline}>
            Przywróć jako aktywną
          </ConfirmButton>
        )}
        <ConfirmButton
          action={deleteSubscription.bind(null, s.id)}
          confirm={`Usunąć „${s.name}” na zawsze?`}
          className="py-3 text-sm font-semibold text-alarm underline underline-offset-4 sm:ml-auto"
        >
          Usuń
        </ConfirmButton>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-slate">{label}</dt>
      <dd className="tabular text-right font-semibold text-obsidian">{children}</dd>
    </div>
  );
}
