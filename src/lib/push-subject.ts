// Values pasted into Vercel often carry stray spaces/newlines or quotes — normalise them.
export const cleanEnv = (v: string | undefined) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

/**
 * Apple's push service rejects the JWT (403 BadJwtToken) unless `sub` is a clean mailto:/https: URL.
 * Accept what people actually paste: bare emails, doubled "mailto:mailto:", spaces.
 */
export function normalizeSubject(raw: string | undefined): string {
  const v = cleanEnv(raw).replace(/\s+/g, "");
  if (/^https:\/\//i.test(v)) return v;
  const email = v.replace(/^(mailto:)+/i, "");
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? `mailto:${email}` : "mailto:owner@example.com";
}

