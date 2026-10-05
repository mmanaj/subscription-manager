import "server-only";

export type Rates = { rates: Record<string, number>; date: string | null; fallback: boolean };

// Rough fallback in case NBP is unreachable — better an approximate total than none.
const FALLBACK: Record<string, number> = { PLN: 1, EUR: 4.27, USD: 3.65, GBP: 4.9, CHF: 4.55 };

/** PLN per 1 unit of currency, from NBP table A (cached 12h). */
export async function getRates(): Promise<Rates> {
  try {
    const res = await fetch("https://api.nbp.pl/api/exchangerates/tables/A/?format=json", {
      next: { revalidate: 43200 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`NBP ${res.status}`);
    const [table] = (await res.json()) as { effectiveDate: string; rates: { code: string; mid: number }[] }[];
    const rates: Record<string, number> = { PLN: 1 };
    for (const r of table.rates) rates[r.code] = r.mid;
    return { rates, date: table.effectiveDate, fallback: false };
  } catch {
    return { rates: FALLBACK, date: null, fallback: true };
  }
}

export function toPLN(amount: number, currency: string, rates: Rates): number {
  return amount * (rates.rates[currency] ?? FALLBACK[currency] ?? 1);
}
