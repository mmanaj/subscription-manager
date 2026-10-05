import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, logos, priceChanges, subscriptions, type Card, type SubscriptionScope, type Subscription } from "@/db/schema";
import { chargesBetween, cycleLabel, inTrial, isLive, monthlyFactor, nextCharge } from "./billing";
import { addDays, addMonths, endOfMonth, startOfMonth, today as todayFn, type ISODate } from "./dates";
import { getRates, toPLN, type Rates } from "./fx";
import { dateShort, money } from "./format";
import { amountOn, type PriceEvent } from "./price";

export type Logo = { src: string; fullBleed: boolean };

export type EnrichedSub = Subscription & {
  card: Card | null;
  logo: Logo | null;
  /** Full price in force today, original currency */
  amountNum: number;
  /** My share of today's price (amount / splitWith), original currency */
  myAmount: number;
  /** Price history, oldest first */
  priceEvents: (PriceEvent & { id: number })[];
  /** My share on a given day, original currency */
  myAmountOn: (date: ISODate) => number;
  /** My share on a given day, PLN */
  plnOn: (date: ISODate) => number;
  /** My share converted to PLN, per charge */
  chargePLN: number;
  /** Average monthly cost in PLN (my share); 0 when not live */
  monthlyPLN: number;
  next: ISODate | null;
  live: boolean;
  trial: boolean;
};

export async function listCards(): Promise<Card[]> {
  return db.select().from(cards).orderBy(asc(cards.name));
}

export async function getCard(id: number): Promise<Card | null> {
  const [c] = await db.select().from(cards).where(eq(cards.id, id));
  return c ?? null;
}

export async function getRawSubscription(id: number): Promise<Subscription | null> {
  const [s] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  return s ?? null;
}

function enrich(
  s: Subscription,
  cardList: Card[],
  rates: Rates,
  today: ISODate,
  priceEvents: (PriceEvent & { id: number })[],
  fullBleed: boolean | undefined,
): EnrichedSub {
  const split = Math.max(1, s.splitWith);
  const myAmountOn = (d: ISODate) => amountOn(Number(s.amount), priceEvents, d) / split;
  const plnOn = (d: ISODate) => toPLN(myAmountOn(d), s.currency, rates);
  const amountNum = amountOn(Number(s.amount), priceEvents, today);
  const myAmount = amountNum / split;
  const chargePLN = toPLN(myAmount, s.currency, rates);
  const live = isLive(s, today);
  return {
    ...s,
    card: cardList.find((c) => c.id === s.cardId) ?? null,
    logo: s.logoVersion && fullBleed !== undefined ? { src: `/api/logo/${s.id}?v=${s.logoVersion}`, fullBleed } : null,
    amountNum,
    myAmount,
    priceEvents,
    myAmountOn,
    plnOn,
    chargePLN,
    monthlyPLN: live ? chargePLN * monthlyFactor(s.intervalUnit, s.intervalCount) : 0,
    next: live ? nextCharge(s, today) : null,
    live,
    trial: inTrial(s, today),
  };
}

export async function loadAll() {
  const today = todayFn();
  const [subs, cardList, rates, changes, logoMeta] = await Promise.all([
    db.select().from(subscriptions).orderBy(asc(subscriptions.name)),
    listCards(),
    getRates(),
    db.select().from(priceChanges).orderBy(asc(priceChanges.effectiveDate), asc(priceChanges.id)),
    db.select({ id: logos.subscriptionId, fullBleed: logos.fullBleed }).from(logos),
  ]);
  const bleed = new Map(logoMeta.map((l) => [l.id, l.fullBleed]));
  const eventsFor = (id: number) =>
    changes
      .filter((c) => c.subscriptionId === id)
      .map((c) => ({ id: c.id, effectiveDate: c.effectiveDate, oldAmount: Number(c.oldAmount), newAmount: Number(c.newAmount) }));
  return { today, rates, cards: cardList, subs: subs.map((s) => enrich(s, cardList, rates, today, eventsFor(s.id), bleed.get(s.id))) };
}

export async function loadOne(id: number) {
  const { today, rates, cards: cardList, subs } = await loadAll();
  return { today, rates, cards: cardList, sub: subs.find((s) => s.id === id) ?? null };
}

/** amount = my share in the subscription's currency, pln = same in PLN — both at that day's price */
export type Payment = { sub: EnrichedSub; date: ISODate; amount: number; pln: number };

export function paymentsBetween(subs: EnrichedSub[], from: ISODate, to: ISODate): Payment[] {
  return subs
    .flatMap((sub) => chargesBetween(sub, from, to, sub.status === "cancelled" && !!sub.endDate).map((date) => ({ sub, date, amount: sub.myAmountOn(date), pln: sub.plnOn(date) })))
    .sort((a, b) => a.date.localeCompare(b.date) || b.pln - a.pln);
}

export function sum(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0);
}

/** Card expiry as the last day of its expiry month. */
export function cardExpiry(c: Card): ISODate | null {
  if (!c.expMonth || !c.expYear) return null;
  return endOfMonth(`${c.expYear}-${String(c.expMonth).padStart(2, "0")}-01`);
}

/** Plain, serialisable payment for the client-side calendar. */
export type CalendarPayment = {
  date: ISODate;
  id: number;
  name: string;
  color: string;
  logo: Logo | null;
  amount: number;
  currency: string;
  pln: number;
};

export type Alert = { kind: "trial" | "card" | "ending" | "fx" | "price"; title: string; detail: string; href?: string };

export const SCOPES: Record<SubscriptionScope, { label: string; plural: string }> = {
  personal: { label: "Prywatna", plural: "Prywatne" },
  shared: { label: "Wspólna", plural: "Wspólne" },
  business: { label: "Firmowa", plural: "Firmowe" },
};

export function isScope(v: unknown): v is SubscriptionScope {
  return typeof v === "string" && v in SCOPES;
}

export function dashboardStats(data: Awaited<ReturnType<typeof loadAll>>, scope?: SubscriptionScope) {
  const { today, rates } = data;
  const subs = scope ? data.subs.filter((s) => s.scope === scope) : data.subs;
  const cardList = scope ? data.cards.filter((c) => subs.some((s) => s.cardId === c.id)) : data.cards;
  const live = subs.filter((s) => s.live);
  const monthly = sum(live.map((s) => s.monthlyPLN));

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const thisMonth = paymentsBetween(subs, monthStart, monthEnd);
  const thisMonthTotal = sum(thisMonth.map((p) => p.pln));
  const thisMonthPaid = sum(thisMonth.filter((p) => p.date < today).map((p) => p.pln));

  const next30 = paymentsBetween(subs, today, addDays(today, 30));
  const calendar: CalendarPayment[] = paymentsBetween(subs, monthStart, endOfMonth(addMonths(today, 5))).map((p) => ({
    date: p.date,
    id: p.sub.id,
    name: p.sub.name,
    color: p.sub.color,
    logo: p.sub.logo,
    amount: p.amount,
    currency: p.sub.currency,
    pln: p.pln,
  }));
  const next12m = sum(paymentsBetween(subs, today, addDays(addMonths(today, 12), -1)).map((p) => p.pln));

  /** Monthly total per key, biggest first, keeping the subscriptions behind each slice. */
  const group = <K>(key: (s: EnrichedSub) => K, label: (k: K) => string) => {
    const m = new Map<K, EnrichedSub[]>();
    for (const s of live) m.set(key(s), [...(m.get(key(s)) ?? []), s]);
    return [...m.entries()]
      .map(([k, items]) => ({ key: k, label: label(k), value: sum(items.map((s) => s.monthlyPLN)), subs: items }))
      .sort((a, b) => b.value - a.value);
  };
  const byCategory = group(
    (s) => s.category?.trim() || "Bez kategorii",
    (k) => k,
  );
  const byCard = group(
    (s) => s.card,
    (c) => (c ? c.name : "Bez karty"),
  );
  const byScope = group(
    (s) => s.scope,
    (k) => SCOPES[k].plural,
  );

  const alerts: Alert[] = [];
  for (const s of live) {
    if (s.trial && s.trialEndDate && s.trialEndDate <= addDays(today, 7)) {
      alerts.push({
        kind: "trial",
        title: `Koniec okresu próbnego: ${s.name}`,
        detail: `${dateShort(s.trialEndDate)} — potem ${money(s.myAmount, s.currency)} ${cycleLabel(s.intervalUnit, s.intervalCount)}`,
        href: `/subscriptions/${s.id}`,
      });
    }
    for (const e of s.priceEvents) {
      if (e.effectiveDate >= today && e.effectiveDate <= addDays(today, 30)) {
        const split = Math.max(1, s.splitWith);
        alerts.push({
          kind: "price",
          title: `${e.newAmount > e.oldAmount ? "Podwyżka" : "Zmiana ceny"}: ${s.name}`,
          detail: `Od ${dateShort(e.effectiveDate)}: ${money(e.oldAmount / split, s.currency)} → ${money(e.newAmount / split, s.currency)}`,
          href: `/subscriptions/${s.id}`,
        });
      }
    }
    if (s.endDate && s.endDate <= addDays(today, 30)) {
      alerts.push({ kind: "ending", title: `Kończy się: ${s.name}`, detail: `Koniec: ${dateShort(s.endDate)}`, href: `/subscriptions/${s.id}` });
    }
  }
  for (const c of cardList) {
    const exp = cardExpiry(c);
    if (!exp) continue;
    const affected = live.filter((s) => s.cardId === c.id && s.next && s.next > exp);
    if (exp <= addDays(today, 45) || affected.length) {
      alerts.push({
        kind: "card",
        title: `${exp < today ? "Karta wygasła" : "Karta wygasa"}: ${c.name}${c.last4 ? ` ••${c.last4}` : ""}`,
        detail: affected.length
          ? `Do aktualizacji w: ${affected.map((s) => s.name).join(", ")}`
          : `Ważna do ${String(c.expMonth).padStart(2, "0")}/${c.expYear}`,
        href: `/cards/${c.id}/edit`,
      });
    }
  }
  if (rates.fallback && live.some((s) => s.currency !== "PLN")) {
    alerts.push({ kind: "fx", title: "Kursy walut przybliżone", detail: "Nie udało się pobrać tabeli NBP." });
  }

  return {
    monthly,
    yearly: monthly * 12,
    next12m,
    thisMonthTotal,
    thisMonthPaid,
    thisMonthLeft: thisMonthTotal - thisMonthPaid,
    next30,
    calendar,
    byCategory,
    byCard,
    byScope,
    alerts,
    liveCount: live.length,
    trialCount: live.filter((s) => s.trial).length,
  };
}
