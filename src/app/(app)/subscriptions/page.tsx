import Link from "next/link";
import { Avatar, btn, Empty, PageHeader, Segments, Tag } from "@/components/ui";
import { loadAll, sum, type EnrichedSub } from "@/lib/data";
import { cycleLabel } from "@/lib/billing";
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

export default async function SubscriptionsPage(props: PageProps<"/subscriptions">) {
  const sp = await props.searchParams;
  const f = (typeof sp.f === "string" && sp.f in filters ? sp.f : "active") as keyof typeof filters;
  const sort = (typeof sp.s === "string" && sp.s in sorts ? sp.s : "next") as keyof typeof sorts;
  const { subs, today } = await loadAll();
  const list = subs.filter(filters[f].fn).sort(sorts[sort].fn);
  const monthly = sum(list.map((s) => s.monthlyPLN));

  return (
    <div>
      <PageHeader title="Subskrypcje" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segments
          active={f}
          items={Object.entries(filters).map(([key, v]) => ({ key, label: v.label, href: `?f=${key}&s=${sort}` }))}
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-pebble">Sortuj:</span>
          {Object.entries(sorts).map(([key, v]) => (
            <Link
              key={key}
              href={`?f=${f}&s=${key}`}
              className={`rounded-full px-3 py-1 font-semibold ${key === sort ? "bg-forest text-paper" : "text-forest hover:bg-mist"}`}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <Empty title={f === "active" ? "Brak aktywnych subskrypcji." : "Nic tu nie ma."}>
          <Link href="/subscriptions/new" className={btn.primary}>
            Dodaj subskrypcję
          </Link>
        </Empty>
      ) : (
        <>
          <ul className="grid gap-2 md:grid-cols-2">
            {list.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/subscriptions/${s.id}`}
                  className="flex items-center gap-3 rounded-card bg-paper p-3 shadow-hairline transition hover:bg-fog/50 active:bg-fog"
                >
                  <Avatar name={s.name} color={s.color} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-obsidian">{s.name}</span>
                      {s.trial && <Tag>próbny</Tag>}
                      {s.status === "paused" && <Tag tone="fog">wstrzymana</Tag>}
                      {s.status === "cancelled" && <Tag tone="fog">anulowana</Tag>}
                      {s.splitWith > 1 && <Tag tone="fog">÷{s.splitWith}</Tag>}
                    </div>
                    <div className="truncate text-sm text-slate">
                      {cycleLabel(s.intervalUnit, s.intervalCount)}
                      {s.card && ` · ${s.card.name}${s.card.last4 ? ` ••${s.card.last4}` : ""}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="tabular font-semibold text-obsidian">{money(s.myAmount, s.currency)}</div>
                    <div className="text-xs text-pebble">
                      {s.next
                        ? `${dateShort(s.next)} · ${relative(s.next, today)}`
                        : s.endDate
                          ? `do ${dateShort(s.endDate)}`
                          : "—"}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {f !== "inactive" && (
            <p className="mt-6 text-right text-sm text-slate">
              Razem średnio <span className="tabular font-semibold text-obsidian">{money(monthly)}</span> / mies.
            </p>
          )}
        </>
      )}
    </div>
  );
}
