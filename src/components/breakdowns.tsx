import Link from "next/link";
import type { Card, SubscriptionScope } from "@/db/schema";
import type { EnrichedSub } from "@/lib/data";
import { money } from "@/lib/format";
import { plural } from "@/lib/billing";
import { CardThumb } from "./card-visual";
import { ScopeIcon } from "./scope";
import { Avatar } from "./ui";

type Slice<K> = { key: K; label: string; value: number; subs: EnrichedSub[] };

const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);
const pln = (v: number) => money(v, "PLN");

/* ── Czyje: part-to-whole of 2–3 parts → one segmented bar + legend ───────────────────────── */

// Fixed per type (not by rank), so a filter never repaints them. Achromatic steps, labels carry identity.
const SCOPE_TONE: Record<SubscriptionScope, string> = { personal: "#0a0a0a", business: "#737373", shared: "#b5b5b5" };

export function ScopeSplit({ data, total }: { data: Slice<SubscriptionScope>[]; total: number }) {
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={data.map((d) => `${d.label} ${pct(d.value, total)}%`).join(", ")}>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="grow-x h-full first:rounded-l-full last:rounded-r-full"
            title={`${d.label}: ${pln(d.value)} / mies.`}
            style={{ flexGrow: d.value, flexBasis: 0, minWidth: 6, background: SCOPE_TONE[d.key], "--i": i } as React.CSSProperties}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {data.map((d) => (
          <li key={d.key}>
            <Link href={`/?typ=${d.key}`} className="press -mx-2 flex items-center gap-3 rounded-[var(--radius-field)] px-2 py-1.5 hover:bg-surface-alt">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-paper" style={{ background: SCOPE_TONE[d.key] }}>
                <ScopeIcon scope={d.key} size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-ink">{d.label}</span>
                <span className="block text-xs text-muted">
                  {d.subs.length} {plural(d.subs.length, ["subskrypcja", "subskrypcje", "subskrypcji"])}
                </span>
              </span>
              <span className="text-right">
                <span className="tabular block font-medium text-ink">{pln(d.value)}</span>
                <span className="tabular block text-xs text-muted">{pct(d.value, total)}%</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Na co idzie: ranking of many → rows with the services inside each category ───────────── */

export function CategoryRanking({ data, total, href }: { data: Slice<string>[]; total: number; href: (c: string) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ol className="flex flex-col">
      {data.map((d, i) => (
        <li key={d.key}>
          <Link href={href(d.key)} className="press -mx-2 block rounded-[var(--radius-field)] px-2 py-2.5 hover:bg-surface-alt">
            <div className="flex items-center gap-3">
              <span className="tabular w-4 shrink-0 text-xs text-muted">{i + 1}</span>
              <span className="flex w-[52px] shrink-0 -space-x-2">
                {d.subs.slice(0, 3).map((s) => (
                  <span key={s.id} className="rounded-full ring-2 ring-paper">
                    <Avatar name={s.name} color={s.color} logo={s.logo} size={24} />
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{d.label}</span>
                <span className="block truncate text-xs text-muted">
                  {d.subs.length > 3 ? `${d.subs.slice(0, 2).map((s) => s.name).join(", ")} i ${d.subs.length - 2} więcej` : d.subs.map((s) => s.name).join(", ")}
                </span>
              </span>
              <span className="text-right">
                <span className="tabular block font-medium text-ink">{pln(d.value)}</span>
                <span className="tabular block text-xs text-muted">{pct(d.value, total)}%</span>
              </span>
            </div>
            <div className="ml-7 mt-2 h-1 overflow-hidden rounded-full bg-canvas">
              <div
                className="grow-x h-full rounded-full bg-ink"
                style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, "--i": i } as React.CSSProperties}
              />
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* ── Z jakiej karty: few, physical things → tiles with the card itself ─────────────────────── */

export function CardTiles({ data, total }: { data: Slice<Card | null>[]; total: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {data.map((d) => {
        const c = d.key;
        const inner = (
          <>
            {c ? (
              <CardThumb color={c.color} brand={c.brand} width={64} />
            ) : (
              <span className="block h-[40px] w-[64px] rounded-[5px] border border-dashed border-muted/60" aria-hidden />
            )}
            <span className="mt-3 block truncate text-sm text-ink">
              {d.label}
              {c?.last4 && <span className="text-muted"> ••{c.last4}</span>}
            </span>
            <span className="tabular mt-0.5 block text-lg font-semibold tracking-tight text-ink">{pln(d.value)}</span>
            <span className="mt-2 flex items-center gap-2">
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                <span className="grow-x block h-full rounded-full bg-ink" style={{ width: `${pct(d.value, total)}%` }} />
              </span>
              <span className="tabular text-xs text-muted">{pct(d.value, total)}%</span>
            </span>
          </>
        );
        return (
          <li key={c?.id ?? "none"}>
            {c ? (
              <Link href="/cards" className="press panel flex h-full flex-col p-3.5 hover:bg-canvas">
                {inner}
              </Link>
            ) : (
              <div className="panel flex h-full flex-col p-3.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

