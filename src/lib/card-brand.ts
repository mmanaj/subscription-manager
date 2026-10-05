// Card network is encoded in the leading digits (IIN/BIN), so it can only be detected from a full
// number — never from the last 4. Used client-side only; the full number is never sent anywhere.
export const BRANDS = ["Visa", "Mastercard", "Amex", "PayPal", "Inne"] as const;

export function detectBrand(digits: string): (typeof BRANDS)[number] | null {
  if (/^4/.test(digits)) return "Visa";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^5[1-5]/.test(digits)) return "Mastercard";
  const p4 = Number(digits.slice(0, 4));
  if (digits.length >= 4 && p4 >= 2221 && p4 <= 2720) return "Mastercard";
  return null;
}

/** "1228", "12/28", "12 / 2028" → { month: 12, year: 2028 } */
export function parseExpiry(raw: string): { month: number; year: number } | null {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 4 && d.length !== 6) return null;
  const month = Number(d.slice(0, 2));
  const year = d.length === 4 ? 2000 + Number(d.slice(2)) : Number(d.slice(2));
  if (month < 1 || month > 12) return null;
  return { month, year };
}

/** Formats while typing: "122" → "12/2", "1228" → "12/28". */
export function formatExpiryInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}
