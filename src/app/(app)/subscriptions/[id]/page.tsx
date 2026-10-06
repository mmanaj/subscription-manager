import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, ExternalLink, Pencil } from "lucide-react";
import { cancelSubscription, deleteSubscription, setStatus } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PriceHistory } from "@/components/price-history";
import { PaidButton } from "@/components/paid-button";
import { LogoSheet } from "@/components/logo-sheet";
import { logoDomainFor } from "@/lib/logo-domains";
import { BigMoney, btn, Tag } from "@/components/ui";
import { chargesBetween, cycleLabel, monthlyFactor } from "@/lib/billing";
import { addDays, addMonths } from "@/lib/dates";
import { cardExpiry, loadOne, SCOPES, sum } from "@/lib/data";
import { dateLong, dateShort, money, relative } from "@/lib/format";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetail(props: PageProps<"/subscriptions/[id]">) {
  const id = Number((await props.params).id);
  const user = await requireUser();
  const { sub: s, today, rates } = await loadOne(user.id, id);
  if (!s) notFound();

  const upcoming = s.live ? chargesBetween(s, today, addMonths(today, 24)).slice(0, 6) : [];
  // Manual subscriptions also list the last couple of past charges, so they can be ticked off late.
  const recentPast = s.manual
    ? chargesBetween(s, s.manualSince && s.manualSince > addDays(today, -62) ? s.manualSince : addDays(today, -62), addDays(today, -1), true).slice(-2)
    : [];
  const schedule = [...recentPast, ...upcoming];
  const past = chargesBetween(s, "1970-01-01", addDays(today, -1), true);
  const paidSoFar = sum(past.map((d) => s.myAmountOn(d)));
  const cardExp = s.card ? cardExpiry(s.card) : null;
  const perYear = s.myAmount * monthlyFactor(s.intervalUnit, s.intervalCount) * 12;
  const foreign = s.currency !== "PLN";
  const cur = s.currency === "PLN" ? "zł" : s.currency;

  const status = s.trial ? (
    <Tag>okres próbny do {dateShort(s.trialEndDate!)}</Tag>
  ) : s.status === "paused" ? (
    <Tag tone="outline">wstrzymana</Tag>
  ) : s.status === "cancelled" ? (
    <Tag tone="outline">anulowana{s.endDate ? ` · dostęp do ${dateShort(s.endDate)}` : ""}</Tag>
  ) : s.live ? (
    <Tag tone="solid">aktywna</Tag>
  ) : (
    <Tag tone="outline">zakończona</Tag>
  );

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <Link href="/subscriptions" className="text-sm text-muted hover:text-ink">
        ← Subskrypcje
      </Link>

      <header className="rise flex flex-col gap-5">
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
            <h1 className="heading truncate text-2xl sm:text-3xl">{s.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {status}
              {s.scope !== "personal" && <Tag tone="outline">{SCOPES[s.scope].label.toLowerCase()}</Tag>}
              {s.category && <Tag tone="outline">{s.category}</Tag>}
              {s.notify && (
                <Tag tone="outline">
                  <Bell size={11} className="mr-1" /> przypomnienia
                </Tag>
              )}
            </div>
          </div>
        </div>
        <div>
          <BigMoney value={s.myAmount} currency={cur} className="text-5xl sm:text-6xl" />
          <p className="mt-1 text-muted">
            {cycleLabel(s.intervalUnit, s.intervalCount)}
            {s.splitWith > 1 && ` · Twoja część z ${money(s.amountNum, s.currency)} ÷ ${s.splitWith}`}
            {foreign && ` · ≈ ${money(s.chargePLN)}`}
          </p>
        </div>
        {s.next && (
          <div className="panel flex flex-col gap-1 p-4">
            <span className="caption">Następna płatność</span>
            <span className="text-xl font-semibold tracking-tight text-ink">{relative(s.next, today)}</span>
            <span className="text-muted">
              {dateLong(s.next)}
              {s.card && ` · ${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}`}
            </span>
            {cardExp && s.next > cardExp && (
              <span className="mt-1 text-sm text-ember">Karta wygasa przed tą płatnością — zaktualizuj ją w serwisie.</span>
            )}
            {s.manual && (
              <span className="mt-3">
                <PaidButton subId={s.id} date={s.next} paid={s.paidDates.has(s.next)} label />
              </span>
            )}
          </div>
        )}
      </header>

      <div className="rise grid items-start gap-12 md:grid-cols-2 md:gap-16" style={{ "--i": 2 } as React.CSSProperties}>
        <dl className="divide-y divide-hairline border-y border-hairline">
          {s.startDate && <Row label="Od">{dateLong(s.startDate)}</Row>}
          <Row label="Do">{s.endDate ? dateLong(s.endDate) : "bezterminowo"}</Row>
          {s.trialEndDate && <Row label="Okres próbny do">{dateLong(s.trialEndDate)}</Row>}
          <Row label="Cykl">{cycleLabel(s.intervalUnit, s.intervalCount)}</Row>
          <Row label="Płatność">
            {s.card ? `${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}` : "—"}
            {s.manual && <span className="text-muted"> · ręcznie</span>}
          </Row>
          <Row label="Rocznie">{money(perYear, s.currency)}</Row>
          <Row label="Średnio / mies.">{money(perYear / 12, s.currency)}</Row>
          <Row label="Zapłacono dotąd">
            {money(paidSoFar, s.currency)} <span className="text-muted">({past.length}×)</span>
          </Row>
          {foreign && <Row label="Kurs NBP">{rates.rates[s.currency]?.toFixed(4) ?? "—"} zł</Row>}
        </dl>

        <div className="flex flex-col gap-6">
          {schedule.length > 0 && (
            <div>
              <h2 className="heading mb-2 text-lg">{s.manual ? "Płatności" : "Kolejne płatności"}</h2>
              <ul className="flex flex-col divide-y divide-hairline">
                {schedule.map((d) => {
                  const paid = s.manual && s.paidDates.has(d);
                  const overdue = s.manual && !paid && d < today && (!s.manualSince || d >= s.manualSince);
                  return (
                    <li key={d} className="flex items-center justify-between gap-3 py-2.5">
                      <span className={d < today && !overdue ? "text-muted" : "text-ink"}>
                        {dateLong(d)}
                        {overdue && <span className="ml-2 text-xs text-ember">po terminie</span>}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className={`tabular ${paid ? "text-muted line-through decoration-hairline" : "text-ink-soft"}`}>
                          {money(s.myAmountOn(d), s.currency)}
                          {foreign && <span className="text-muted"> · {money(s.plnOn(d))}</span>}
                        </span>
                        {s.manual && <PaidButton subId={s.id} date={d} paid={paid} />}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {s.notes && (
            <div>
              <h2 className="heading mb-2 text-lg">Notatki</h2>
              <p className="whitespace-pre-wrap text-ink-soft">{s.notes}</p>
            </div>
          )}
          {s.url && (
            <a href={s.url} target="_blank" rel="noreferrer" className={`${btn.outline} self-start`}>
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
          <Pencil size={16} /> Edytuj
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
            <ConfirmButton action={setStatus.bind(null, s.id, "paused")} className={btn.secondary}>
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
          className={`${btn.danger} sm:ml-auto`}
        >
          Usuń
        </ConfirmButton>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="tabular text-right font-medium text-ink">{children}</dd>
    </div>
  );
}
