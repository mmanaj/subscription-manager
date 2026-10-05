import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cards, subscriptions, type Card, type Subscription } from "@/db/schema";
import { chargesBetween, cycleLabel, inTrial, isLive, monthlyFactor, nextCharge } from "./billing";
import { addDays, addMonths, endOfMonth, startOfMonth, today as todayFn, type ISODate } from "./dates";
import { getRates, toPLN, type Rates } from "./fx";
import { dateShort, money } from "./format";

export type EnrichedSub = Subscription & {
  card: Card | null;
  amountNum: number;
  /** My share (amount / splitWith), original currency */
  myAmount: number;
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

function enrich(s: Subscription, cardList: Card[], rates: Rates, today: ISODate): EnrichedSub {
  const amountNum = Number(s.amount);
  const myAmount = amountNum / Math.max(1, s.splitWith);
  const chargePLN = toPLN(myAmount, s.currency, rates);
  const live = isLive(s, today);
  return {
    ...s,
    card: cardList.find((c) => c.id === s.cardId) ?? null,
    amountNum,
    myAmount,
    chargePLN,
    monthlyPLN: live ? chargePLN * monthlyFactor(s.intervalUnit, s.intervalCount) : 0,
    next: live ? nextCharge(s, today) : null,
    live,
    trial: inTrial(s, today),
  };
}

export async function loadAll() {
  const today = todayFn();
  const [subs, cardList, rates] = await Promise.all([
    db.select().from(subscriptions).orderBy(asc(subscriptions.name)),
    listCards(),
    getRates(),
  ]);
  return { today, rates, cards: cardList, subs: subs.map((s) => enrich(s, cardList, rates, today)) };
}

export async function loadOne(id: number) {
  const { today, rates, cards: cardList, subs } = await loadAll();
  return { today, rates, cards: cardList, sub: subs.find((s) => s.id === id) ?? null };
}

export type Payment = { sub: EnrichedSub; date: ISODate; pln: number };

export function paymentsBetween(subs: EnrichedSub[], from: ISODate, to: ISODate): Payment[] {
  return subs
    .flatMap((sub) => chargesBetween(sub, from, to, sub.status === "cancelled" && !!sub.endDate).map((date) => ({ sub, date, pln: sub.chargePLN })))
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

export type Alert = { kind: "trial" | "card" | "ending" | "fx"; title: string; detail: string; href?: string };

export function dashboardStats(data: Awaited<ReturnType<typeof loadAll>>) {
  const { subs, today, cards: cardList, rates } = data;
  const live = subs.filter((s) => s.live);
  const monthly = sum(live.map((s) => s.monthlyPLN));

  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const thisMonth = paymentsBetween(subs, monthStart, monthEnd);
  const thisMonthTotal = sum(thisMonth.map((p) => p.pln));
  const thisMonthPaid = sum(thisMonth.filter((p) => p.date < today).map((p) => p.pln));

  const next30 = paymentsBetween(subs, today, addDays(today, 30));
  const next12m = sum(paymentsBetween(subs, today, addDays(addMonths(today, 12), -1)).map((p) => p.pln));

  const group = (key: (s: EnrichedSub) => string) => {
    const m = new Map<string, number>();
    for (const s of live) m.set(key(s), (m.get(key(s)) ?? 0) + s.monthlyPLN);
    return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const byCategory = group((s) => s.category?.trim() || "Bez kategorii");
  const byCard = group((s) => (s.card ? s.card.name + (s.card.last4 ? ` ••${s.card.last4}` : "") : "Bez karty"));

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
    byCategory,
    byCard,
    alerts,
    liveCount: live.length,
    trialCount: live.filter((s) => s.trial).length,
  };
}
