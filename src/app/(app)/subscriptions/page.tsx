import Link from "next/link";
import { after } from "next/server";
import { backfillLogos } from "@/lib/logos";
import { ChevronDown } from "lucide-react";
import { ScopeBadge, ScopeTabs } from "@/components/scope";
import { Avatar, btn, Empty, PageHeader, Tag } from "@/components/ui";
import { ChipScroller } from "@/components/chip-scroller";
import { isScope, loadAll, sum, type EnrichedSub } from "@/lib/data";
import { cycleLabel, plural } from "@/lib/billing";
import { dateShort, money, relative } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subskrypcje" };

const filters = {
  active: { label: "Aktywne", fn: (s: EnrichedSub) => s.live },
  inactive: { label: "Nieaktywne", fn: (s: EnrichedSub) => !s.live },
  all: { label: "Wszystkie", fn: () => true },
} as const;

const sorts = {
  next: { label: "Najbliższe", fn: (a: EnrichedSub, b: EnrichedSub) => (a.next ?? "9999").localeCompare(b.next ?? "9999") },
  cost: { label: "Najdroższe", fn: (a: EnrichedSub, b: EnrichedSub) => b.monthlyPLN - a.monthlyPLN || b.chargePLN - a.chargePLN },
  name: { label: "A–Z", fn: (a: EnrichedSub, b: EnrichedSub) => a.name.localeCompare(b.name, "pl") },
} as const;

const NO_CATEGORY = "Bez kategorii";

export default async function SubscriptionsPage(props: PageProps<"/subscriptions">) {
  const sp = await props.searchParams;
  const f = (typeof sp.f === "string" && sp.f in filters ? sp.f : "active") as keyof typeof filters;
  const sort = (typeof sp.s === "string" && sp.s in sorts ? sp.s : "next") as keyof typeof sorts;
  const typ = isScope(sp.typ) ? sp.typ : undefined;
  const kat = typeof sp.kat === "string" && sp.kat ? sp.kat : undefined;
  const { subs, today } = await loadAll();
  after(() => backfillLogos());
  const catOf = (s: EnrichedSub) => s.category?.trim() || NO_CATEGORY;
  // Category chips count what the other filters leave, so the numbers match what a tap will show.
  const base = subs.filter((s) => filters[f].fn(s) && (!typ || s.scope === typ));
  const catCounts = new Map<string, number>();
  for (const s of base) catCounts.set(catOf(s), (catCounts.get(catOf(s)) ?? 0) + 1);
  const cats = [...catCounts.keys()].sort((a, b) =>
    a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a === "Inne" ? 1 : b === "Inne" ? -1 : a.localeCompare(b, "pl"),
  );
  if (kat && !catCounts.has(kat)) cats.push(kat);
  const list = base.filter((s) => !kat || catOf(s) === kat).sort(sorts[sort].fn);
  const qs = (patch: Record<string, string | undefined>) => {
    const cur = { f: f === "active" ? undefined : f, s: sort === "next" ? undefined : sort, typ, kat };
    const q = new URLSearchParams(Object.entries({ ...cur, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `?${q}`;
  };
  const monthly = sum(list.map((s) => s.monthlyPLN));

  const filtersChanged = f !== "active" || sort !== "next";

  return (
    <div>
      <PageHeader title="Subskrypcje" />

      <div className="flex flex-col gap-3">
        <ScopeTabs active={typ} href={(t) => qs({ typ: t, kat: undefined })} />

        {(cats.length > 1 || kat) && (
          <ChipScroller
            label="Kategorie"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <Link
              href={qs({ kat: undefined })}
              className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${!kat ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-hairline hover:bg-surface-alt"}`}
            >
              Wszystkie kategorie
            </Link>
            {cats.map((c) => (
              <Link
                key={c}
                aria-current={c === kat ? "page" : undefined}
                href={qs({ kat: c === kat ? undefined : c })}
                className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${
                  c === kat ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-hairline hover:bg-surface-alt"
                }`}
              >
                {c}
                <span className="ml-1.5 tabular text-xs opacity-60">{catCounts.get(c) ?? 0}</span>
              </Link>
            ))}
          </ChipScroller>
        )}

        {/* Status + sort live behind one toggle: rarely changed, so they shouldn't cost a row each. */}
        <details className="group" open={filtersChanged || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm [&::-webkit-details-marker]:hidden">
            <span className="text-muted">
              {list.length} {plural(list.length, ["subskrypcja", "subskrypcje", "subskrypcji"])}
              {f !== "inactive" && list.length > 0 && (
                <>
                  {" "}
                  · <span className="tabular font-medium text-ink">{money(monthly)}</span>/mies.
                </>
              )}
            </span>
            <span className="relative inline-flex h-8 items-center gap-1 rounded-full bg-paper px-3 font-medium text-ink shadow-hairline transition hover:bg-surface-alt">
              {filtersChanged && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ink ring-2 ring-paper" />}
              Filtry
              <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="card mt-2 flex flex-col gap-3 p-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="caption">Pokaż</span>
              <div className="flex flex-wrap gap-2">
              {Object.entries(filters).map(([key, v]) => (
                <Link
                  key={key}
                  href={qs({ f: key === "active" ? undefined : key })}
                  className={`rounded-full px-3 py-1 font-medium ${key === f ? "bg-ink text-paper" : "bg-canvas text-ink hover:bg-hairline"}`}
                >
                  {v.label}
                </Link>
              ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="caption">Sortuj</span>
              <div className="flex flex-wrap gap-2">
              {Object.entries(sorts).map(([key, v]) => (
                <Link
                  key={key}
                  href={qs({ s: key === "next" ? undefined : key })}
                  className={`rounded-full px-3 py-1 font-medium ${key === sort ? "bg-ink text-paper" : "bg-canvas text-ink hover:bg-hairline"}`}
                >
                  {v.label}
                </Link>
              ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="mt-4" />
      {list.length === 0 ? (
        <Empty title={kat ? `Nic w kategorii „${kat}”.` : f === "active" ? "Brak aktywnych subskrypcji." : "Nic tu nie ma."}>
          <Link href="/subscriptions/new" className={btn.primary}>
            Dodaj subskrypcję
          </Link>
        </Empty>
      ) : (
        <>
          <ul className="card divide-y divide-hairline overflow-hidden">
            {list.map((s, i) => (
              <li key={s.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/subscriptions/${s.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-alt active:bg-canvas"
                >
                  <span className="relative shrink-0">
                    <Avatar name={s.name} color={s.color} logo={s.logo} />
                    <ScopeBadge scope={s.scope} />
                  </span>
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
                    <span className="truncate font-medium text-ink">{s.name}</span>
                    <span className="tabular whitespace-nowrap text-right font-medium text-ink">
                      {money(s.myAmount, s.currency)}
                    </span>
                    <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                      {s.trial && <Tag tone="solid">próbny</Tag>}
                      {s.status === "paused" && <Tag>wstrzymana</Tag>}
                      {s.status === "cancelled" && <Tag tone="outline">anulowana</Tag>}
                      <span className="truncate">
                        {cycleLabel(s.intervalUnit, s.intervalCount)}
                        {s.splitWith > 1 && ` · ÷${s.splitWith}`}
                        {s.card && ` · ${s.card.last4 ? `••${s.card.last4}` : s.card.name}`}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-right text-xs text-muted">
                      {s.next ? relative(s.next, today) : s.endDate ? `do ${dateShort(s.endDate)}` : "—"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
