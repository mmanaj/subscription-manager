import Link from "next/link";
import { after } from "next/server";
import { backfillLogos } from "@/lib/logos";
import { ChevronDown } from "lucide-react";
import { ScopeBadge, ScopeTabs } from "@/components/scope";
import { Avatar, btn, Empty, Tag } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { ChipScroller } from "@/components/chip-scroller";
import { isScope, loadAll, NO_CATEGORY, sum, type EnrichedSub } from "@/lib/data";
import { isOtherCategory } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.subscriptions };
}

const filters = {
  active: (s: EnrichedSub) => s.live,
  inactive: (s: EnrichedSub) => !s.live,
  all: () => true,
} as const;

const SORT_KEYS = ["next", "cost", "name"];
type Cmp = (a: EnrichedSub, b: EnrichedSub) => number;
const sorts = (compare: (a: string, b: string) => number): Record<"next" | "cost" | "name", Cmp> => ({
  next: (a, b) => (a.next ?? "9999").localeCompare(b.next ?? "9999"),
  cost: (a, b) => b.monthlyPLN - a.monthlyPLN || b.chargePLN - a.chargePLN,
  name: (a, b) => compare(a.name, b.name),
});

export default async function SubscriptionsPage(props: PageProps<"/subscriptions">) {
  const sp = await props.searchParams;
  const show = (typeof sp.f === "string" && sp.f in filters ? sp.f : "active") as keyof typeof filters;
  const sort = (typeof sp.s === "string" && SORT_KEYS.includes(sp.s) ? sp.s : "next") as keyof ReturnType<typeof sorts>;
  const typ = isScope(sp.typ) ? sp.typ : undefined;
  const kat = typeof sp.kat === "string" && sp.kat ? sp.kat : undefined;
  const [{ subs, today }, { t, f }] = await Promise.all([loadAll(), getI18n()]);
  const { dateShort, money, relative } = f;
  after(() => backfillLogos());
  const catOf = (s: EnrichedSub) => s.category?.trim() || NO_CATEGORY;
  // Category chips count what the other filters leave, so the numbers match what a tap will show.
  const base = subs.filter((s) => filters[show](s) && (!typ || s.scope === typ));
  const catCounts = new Map<string, number>();
  for (const s of base) catCounts.set(catOf(s), (catCounts.get(catOf(s)) ?? 0) + 1);
  const cats = [...catCounts.keys()].sort((a, b) =>
    a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : isOtherCategory(a) ? 1 : isOtherCategory(b) ? -1 : f.compare(a, b),
  );
  if (kat && !catCounts.has(kat)) cats.push(kat);
  const list = base.filter((s) => !kat || catOf(s) === kat).sort(sorts(f.compare)[sort]);
  const qs = (patch: Record<string, string | undefined>) => {
    const cur = { f: show === "active" ? undefined : show, s: sort === "next" ? undefined : sort, typ, kat };
    const q = new URLSearchParams(Object.entries({ ...cur, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `?${q}`;
  };
  const monthly = sum(list.map((s) => s.monthlyPLN));

  const filtersChanged = show !== "active" || sort !== "next";
  const catLabel = (c: string) => (c === NO_CATEGORY ? t.noCategory : c);

  return (
    <div>
      <PageHeader title={t.nav.subscriptions} />

      <div className="flex flex-col gap-5">
        <ScopeTabs active={typ} href={(t) => qs({ typ: t, kat: undefined })} />

        {(cats.length > 1 || kat) && (
          <ChipScroller
            label={t.list.categories}
            className="-mx-4 -my-1 flex gap-2 overflow-x-auto px-4 py-1 text-sm [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <Link
              href={qs({ kat: undefined })}
              className={`shrink-0 rounded-full px-3 py-1 font-medium transition ${!kat ? "bg-ink text-paper" : "bg-paper text-ink-soft shadow-hairline hover:bg-surface-alt"}`}
            >
              {t.list.allCategories}
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
                {catLabel(c)}
                <span className="ml-1.5 tabular text-xs opacity-60">{catCounts.get(c) ?? 0}</span>
              </Link>
            ))}
          </ChipScroller>
        )}

        {/* Status + sort live behind one toggle: rarely changed, so they shouldn't cost a row each. */}
        <details className="group" open={filtersChanged || undefined}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 text-sm [&::-webkit-details-marker]:hidden">
            <span className="text-muted">
              {t.subscriptionsCount(list.length)}
              {show !== "inactive" && list.length > 0 && (
                <>
                  {" "}
                  · <span className="tabular font-medium text-ink">{money(monthly)}</span> {t.common.perMonth}
                </>
              )}
            </span>
            <span className="relative inline-flex h-8 items-center gap-1 rounded-full bg-paper px-3 font-medium text-ink shadow-hairline transition hover:bg-surface-alt">
              {filtersChanged && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-ink ring-2 ring-paper" />}
              {t.list.filtersButton}
              <ChevronDown size={16} className="transition-transform duration-200 group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-3 rounded-[var(--radius-field)] bg-canvas p-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="caption">{t.list.show}</span>
              <div className="flex flex-wrap gap-2">
              {Object.entries(t.list.filters).map(([key, label]) => (
                <Link
                  key={key}
                  href={qs({ f: key === "active" ? undefined : key })}
                  className={`rounded-full px-3 py-1 font-medium ${key === show ? "bg-ink text-paper" : "bg-paper text-ink shadow-hairline hover:bg-surface-alt"}`}
                >
                  {label}
                </Link>
              ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="caption">{t.list.sort}</span>
              <div className="flex flex-wrap gap-2">
              {Object.entries(t.list.sorts).map(([key, label]) => (
                <Link
                  key={key}
                  href={qs({ s: key === "next" ? undefined : key })}
                  className={`rounded-full px-3 py-1 font-medium ${key === sort ? "bg-ink text-paper" : "bg-paper text-ink shadow-hairline hover:bg-surface-alt"}`}
                >
                  {label}
                </Link>
              ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="mt-4" />
      {list.length === 0 ? (
        <Empty title={kat ? t.list.emptyInCategory(catLabel(kat)) : show === "active" ? t.list.emptyActive : t.list.emptyAll}>
          <Link href="/subscriptions/new" className={btn.primary}>
            {t.nav.addSubscription}
          </Link>
        </Empty>
      ) : (
        <>
          <ul className="divide-y divide-hairline border-y border-hairline">
            {list.map((s, i) => (
              <li key={s.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={`/subscriptions/${s.id}`}
                  className="-mx-3 flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-3 transition-colors hover:bg-surface-alt active:bg-canvas"
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
                      {s.trial && <Tag tone="solid">{t.status.trial}</Tag>}
                      {s.status === "paused" && <Tag>{t.status.paused}</Tag>}
                      {s.status === "cancelled" && <Tag tone="outline">{t.status.cancelled}</Tag>}
                      <span className="truncate">
                        {f.cycle(s.intervalUnit, s.intervalCount)}
                        {s.splitWith > 1 && ` · ÷${s.splitWith}`}
                        {s.card && ` · ${s.card.last4 ? `••${s.card.last4}` : s.card.name}`}
                      </span>
                    </span>
                    <span className="whitespace-nowrap text-right text-xs text-muted">
                      {s.next ? relative(s.next, today) : s.endDate ? t.list.until(dateShort(s.endDate)) : "—"}
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
