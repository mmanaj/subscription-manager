import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { logos, subscriptions } from "@/db/schema";
import { logoDomainFor } from "./logo-domains";

const MAX_BYTES = 256 * 1024;
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

export type FetchedLogo = { data: Buffer; contentType: string; fullBleed: boolean };

/** Identify the image by its bytes — never trust the server's content-type. */
function sniff(buf: Buffer): { type: string; width?: number } | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { type: "image/png", width: buf.readUInt32BE(16) };
  if (buf[0] === 0xff && buf[1] === 0xd8) return { type: "image/jpeg" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { type: "image/webp" };
  if (buf.toString("ascii", 0, 3) === "GIF") return { type: "image/gif" };
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return { type: "image/x-icon", width: buf[6] || 256 };
  const head = buf.toString("utf8", 0, Math.min(buf.length, 1024)).toLowerCase();
  if (head.includes("<svg")) return { type: "image/svg+xml" };
  return null;
}

async function get(url: string, timeoutMs = 4000): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,image/*;q=0.9,*/*;q=0.8" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

async function tryImage(url: string, fullBleed: boolean, minWidth = 48): Promise<FetchedLogo | null> {
  const res = await get(url);
  if (!res) return null;
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) return null;
  const data = Buffer.from(await res.arrayBuffer());
  if (data.length > MAX_BYTES) return null;
  const kind = sniff(data);
  if (!kind) return null;
  if (kind.width !== undefined && kind.width < minWidth) return null;
  return { data, contentType: kind.type, fullBleed: fullBleed && kind.type !== "image/svg+xml" };
}

/** Icon <link>s from the homepage, best first: apple-touch-icon, then large/SVG icons. */
async function iconLinks(domain: string): Promise<{ href: string; fullBleed: boolean }[]> {
  const res = await get(`https://${domain}/`);
  if (!res || !(res.headers.get("content-type") ?? "").includes("html")) return [];
  const html = (await res.text()).slice(0, 300_000);
  const base = res.url || `https://${domain}/`;
  const out: { href: string; fullBleed: boolean; score: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (n: string) => tag.match(new RegExp(`${n}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    const rel = attr("rel")?.toLowerCase() ?? "";
    const href = attr("href");
    if (!href || !rel.includes("icon")) continue;
    let abs: string;
    try {
      abs = new URL(href, base).toString();
    } catch {
      continue;
    }
    const size = Math.max(0, ...(attr("sizes") ?? "").split(/\s+/).map((s) => Number(s.split("x")[0]) || 0));
    if (rel.includes("apple-touch-icon")) out.push({ href: abs, fullBleed: true, score: 1000 + size });
    else if (abs.endsWith(".svg") || (attr("type") ?? "").includes("svg")) out.push({ href: abs, fullBleed: false, score: 500 });
    else if (size >= 64) out.push({ href: abs, fullBleed: false, score: size });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Finds a logo for a domain, trying the site itself first and public icon services after. */
export async function fetchLogo(domain: string): Promise<FetchedLogo | null> {
  for (const link of (await iconLinks(domain)).slice(0, 4)) {
    const logo = await tryImage(link.href, link.fullBleed);
    if (logo) return logo;
  }
  return (
    (await tryImage(`https://${domain}/apple-touch-icon.png`, true)) ??
    (await tryImage(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`, false, 64)) ??
    (await tryImage(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`, false, 32))
  );
}

export async function storeLogo(subId: number, logo: FetchedLogo | null, opts: { custom?: boolean; domain?: string | null } = {}) {
  if (logo) {
    const row = { data: logo.data.toString("base64"), contentType: logo.contentType, fullBleed: logo.fullBleed, updatedAt: new Date() };
    await db.insert(logos).values({ subscriptionId: subId, ...row }).onConflictDoUpdate({ target: logos.subscriptionId, set: row });
  } else {
    await db.delete(logos).where(eq(logos.subscriptionId, subId));
  }
  await db
    .update(subscriptions)
    .set({
      logoVersion: logo ? sql`coalesce(${subscriptions.logoVersion}, 0) + 1` : null,
      logoCheckedAt: new Date(),
      logoCustom: !!opts.custom,
      ...(opts.domain !== undefined ? { logoDomain: opts.domain } : {}),
    })
    .where(eq(subscriptions.id, subId));
}

/** Automatic lookup; leaves custom uploads alone. Returns whether a logo was found. */
export async function refreshLogo(subId: number): Promise<boolean> {
  const [s] = await db.select().from(subscriptions).where(eq(subscriptions.id, subId));
  if (!s || s.logoCustom) return false;
  const domain = logoDomainFor(s);
  const logo = domain ? await fetchLogo(domain) : null;
  await storeLogo(subId, logo);
  return !!logo;
}


/** Looks up logos for subscriptions never checked yet (e.g. added before logos existed). */
export async function backfillLogos(limit = 4) {
  const pending = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(sql`${subscriptions.logoCheckedAt} is null and not ${subscriptions.logoCustom}`)
    .limit(limit);
  for (const { id } of pending) await refreshLogo(id).catch(() => undefined);
}
