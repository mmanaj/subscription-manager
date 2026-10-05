import type { ISODate } from "./dates";

export type PriceEvent = { effectiveDate: ISODate; oldAmount: number; newAmount: number };

/**
 * Price in force on a given day. Before the first change it's that change's old price; after the
 * last one it's the newest price. With no history it's simply the current amount.
 */
export function amountOn(current: number, events: PriceEvent[], date: ISODate): number {
  if (!events.length) return current;
  const sorted = [...events].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  let price = sorted[0].oldAmount;
  for (const e of sorted) {
    if (e.effectiveDate > date) break;
    price = e.newAmount;
  }
  return price;
}

/** The latest price (after all known changes, including scheduled ones). */
export function latestAmount(current: number, events: PriceEvent[]): number {
  if (!events.length) return current;
  return [...events].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)).at(-1)!.newAmount;
}

export function pctChange(from: number, to: number): number {
  return from ? ((to - from) / from) * 100 : 0;
}
