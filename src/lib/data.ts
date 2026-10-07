import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, logos, payments, priceChanges, subscriptions, type Card, type SubscriptionScope, type Subscription } from "@/db/schema";
import { chargesBetween, inTrial, isLive, monthlyFactor, nextCharge } from "./billing";
import { addDays, addMonths, endOfMonth, startOfMonth, today as todayFn, type ISODate } from "./dates";
import { getRates, toPLN, type Rates } from "./fx";
import type { I18n } from "./i18n";
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
  /** Charge dates ticked off as paid → the day they were ticked off */
  paidDates: Map<ISODate, ISODate>;
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
  paidDates: Map<ISODate, ISODate>,
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
    paidDates,
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
  const [subs, cardList, rates, changes, logoMeta, paid] = await Promise.all([
    db.select().from(subscriptions).orderBy(asc(subscriptions.name)),
    listCards(),
    getRates(),
    db.select().from(priceChanges).orderBy(asc(priceChanges.effectiveDate), asc(priceChanges.id)),
    db.select({ id: logos.subscriptionId, fullBleed: logos.fullBleed }).from(logos),
    db.select({ subId: payments.subscriptionId, date: payments.chargeDate, paidAt: payments.paidAt }).from(payments),
  ]);
  const tz = process.env.APP_TZ || "Europe/Warsaw";
  const dayOf = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(at);
  const paidFor = (id: number) => new Map(paid.filter((p) => p.subId === id).map((p) => [p.date, dayOf(p.paidAt)] as const));
  const bleed = new Map(logoMeta.map((l) => [l.id, l.fullBleed]));
  const eventsFor = (id: number) =>
    changes
      .filter((c) => c.subscriptionId === id)
      .map((c) => ({ id: c.id, effectiveDate: c.effectiveDate, oldAmount: Number(c.oldAmount), newAmount: Number(c.newAmount) }));
  return { today, rates, cards: cardList, subs: subs.map((s) => enrich(s, cardList, rates, today, eventsFor(s.id), bleed.get(s.id), paidFor(s.id))) };
}

export async function loadOne(id: number) {
  const { today, rates, cards: cardList, subs } = await loadAll();
  return { today, rates, cards: cardList, sub: subs.find((s) => s.id === id) ?? null };
}

/** amount = my share in the subscription's currency, pln = same in PLN — both at that day's price */
/**
 * amount = my share in the subscription's currency, pln = same in PLN — both at that day's price.
 * due: the scheduled charge date. date: when it happens — the day it was ticked off if paid early.
 * paid: ticked off by hand, or (automatic charges) once their day has passed.
 * paidOn: the day it was ticked off, when it was.
 */
export type Payment = {
  sub: EnrichedSub;
  due: ISODate;
  date: ISODate;
  amount: number;
  pln: number;
  paid: boolean;
  paidOn: ISODate | null;
  overdue: boolean;
};

export function isPaid(sub: EnrichedSub, date: ISODate, today: ISODate) {
  return sub.paidDates.has(date) || (!sub.manual && date < today);
}

/** Whether a charge can be ticked off by hand: any manual one, or an automatic one not yet due. */
export function canMarkPaid(sub: EnrichedSub, due: ISODate, today: ISODate) {
  return sub.manual || due >= today || sub.paidDates.has(due);
}

export function paymentsBetween(subs: EnrichedSub[], from: ISODate, to: ISODate, today: ISODate = todayFn()): Payment[] {
  return subs
    .flatMap((sub) =>
      chargesBetween(sub, from, to, sub.status === "cancelled" && !!sub.endDate).map((date) => {
        const paid = isPaid(sub, date, today);
        const paidOn = sub.paidDates.get(date) ?? null;
        const overdue = sub.manual && !paid && date < today && (!sub.manualSince || date >= sub.manualSince);
        const when = paidOn && paidOn < date ? paidOn : date;
        return { sub, due: date, date: when, amount: sub.myAmountOn(date), pln: sub.plnOn(date), paid, paidOn, overdue };
      }),
    )
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

export type Alert = {
  kind: "trial" | "card" | "ending" | "fx" | "price" | "unpaid";
  title: string;
  detail: string;
  href?: string;
  /** For "unpaid": lets the alert offer a mark-as-paid button */
  pay?: { subId: number; date: ISODate };
};

export const SCOPES: readonly SubscriptionScope[] = ["personal", "shared", "business"];

export function isScope(v: unknown): v is SubscriptionScope {
  return typeof v === "string" && (SCOPES as readonly string[]).includes(v);
}

/** Category key for subscriptions without one (kept out of the way of real names). */
export const NO_CATEGORY = "-";

export function dashboardStats(data: Awaited<ReturnType<typeof loadAll>>, scope: SubscriptionScope | undefined, { t, f }: I18n) {
  const { today, rates } = data;
  const { money, dateShort } = f;
  const subs = scope ? data.subs.filter((s) => s.scope === scope) : data.subs;
  const cardList = scope ? data.cards.filter((c) => subs.some((s) => s.cardId === c.id)) : data.cards;
  const live = subs.filter((s) => s.live);
  const monthly = sum(live.map((s) => s.monthlyPLN));

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const thisMonth = paymentsBetween(subs, monthStart, monthEnd);
  const thisMonthTotal = sum(thisMonth.map((p) => p.pln));
  const thisMonthPaid = sum(thisMonth.filter((p) => p.paid).map((p) => p.pln));
  // Manual charges past due and not ticked off (last month only — older ones predate tracking).
  const overdue = paymentsBetween(subs, addDays(today, -31), addDays(today, -1), today).filter((p) => p.overdue);

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
  const next12m = sum(paymentsBetween(subs, today, addDays(addMonths(today, 12), -1)).filter((p) => !p.paidOn).map((p) => p.pln));

  /** Monthly total per key, biggest first, keeping the subscriptions behind each slice. */
  const group = <K>(key: (s: EnrichedSub) => K, label: (k: K) => string) => {
    const m = new Map<K, EnrichedSub[]>();
    for (const s of live) m.set(key(s), [...(m.get(key(s)) ?? []), s]);
    return [...m.entries()]
      .map(([k, items]) => ({ key: k, label: label(k), value: sum(items.map((s) => s.monthlyPLN)), subs: items }))
      .sort((a, b) => b.value - a.value);
  };
  const byCategory = group(
    (s) => s.category?.trim() || NO_CATEGORY,
    (k) => (k === NO_CATEGORY ? t.noCategory : k),
  );
  const byCard = group(
    (s) => s.card,
    (c) => (c ? c.name : t.unassigned),
  );
  const byScope = group(
    (s) => s.scope,
    (k) => t.scope[k].many,
  );

  const alerts: Alert[] = overdue.map((p) => ({
    kind: "unpaid",
    title: t.alerts.unpaid(p.sub.name),
    detail: t.alerts.unpaidDetail(money(p.amount, p.sub.currency), dateShort(p.date)),
    href: `/subscriptions/${p.sub.id}`,
    pay: { subId: p.sub.id, date: p.due },
  }));
  for (const s of live) {
    if (s.trial && s.trialEndDate && s.trialEndDate <= addDays(today, 7)) {
      alerts.push({
        kind: "trial",
        title: t.alerts.trial(s.name),
        detail: t.alerts.trialDetail(dateShort(s.trialEndDate), money(s.myAmount, s.currency), f.cycle(s.intervalUnit, s.intervalCount)),
        href: `/subscriptions/${s.id}`,
      });
    }
    for (const e of s.priceEvents) {
      if (e.effectiveDate >= today && e.effectiveDate <= addDays(today, 30)) {
        const split = Math.max(1, s.splitWith);
        alerts.push({
          kind: "price",
          title: (e.newAmount > e.oldAmount ? t.alerts.priceUp : t.alerts.priceChange)(s.name),
          detail: t.alerts.priceDetail(dateShort(e.effectiveDate), money(e.oldAmount / split, s.currency), money(e.newAmount / split, s.currency)),
          href: `/subscriptions/${s.id}`,
        });
      }
    }
    if (s.endDate && s.endDate <= addDays(today, 30)) {
      alerts.push({ kind: "ending", title: t.alerts.ending(s.name), detail: t.alerts.endingDetail(dateShort(s.endDate)), href: `/subscriptions/${s.id}` });
    }
  }
  for (const c of cardList) {
    const exp = cardExpiry(c);
    if (!exp) continue;
    const affected = live.filter((s) => s.cardId === c.id && s.next && s.next > exp);
    if (exp <= addDays(today, 45) || affected.length) {
      alerts.push({
        kind: "card",
        title: (exp < today ? t.alerts.cardExpired : t.alerts.cardExpiring)(`${c.name}${c.last4 ? ` ••${c.last4}` : ""}`),
        detail: affected.length
          ? t.alerts.cardUpdateIn(affected.map((s) => s.name).join(", "))
          : t.alerts.cardValidUntil(`${String(c.expMonth).padStart(2, "0")}/${c.expYear}`),
        href: `/cards/${c.id}/edit`,
      });
    }
  }
  if (rates.fallback && live.some((s) => s.currency !== "PLN")) {
    alerts.push({ kind: "fx", title: t.alerts.fx, detail: t.alerts.fxDetail });
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
