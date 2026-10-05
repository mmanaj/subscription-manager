import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { CardThumb } from "@/components/card-visual";
import { ScopeBadge } from "@/components/scope";
import { Avatar, btn, Empty, PageHeader, Tag } from "@/components/ui";
import { plural } from "@/lib/billing";
import { cardExpiry, loadAll, sum, type EnrichedSub } from "@/lib/data";
import { money, relative } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karty" };

export default async function CardsPage() {
  const { cards, subs, today } = await loadAll();
  const live = subs.filter((s) => s.live);
  const unassigned = live.filter((s) => !s.cardId);
  // Busiest card first: that's the one you'd look for.
  const sorted = [...cards].sort(
    (a, b) =>
      sum(live.filter((s) => s.cardId === b.id).map((s) => s.monthlyPLN)) -
      sum(live.filter((s) => s.cardId === a.id).map((s) => s.monthlyPLN)),
  );

  return (
    <div>
      <PageHeader
        title="Karty"
        action={
          <Link href="/cards/new" className={btn.primary}>
            Dodaj kartę
          </Link>
        }
      />

      {cards.length === 0 ? (
        <Empty title="Brak kart. Dodaj, żeby wiedzieć co z czego schodzi.">
          <Link href="/cards/new" className={btn.primary}>
            Dodaj kartę
          </Link>
        </Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {sorted.map((c, i) => {
            const on = live.filter((s) => s.cardId === c.id).sort((a, b) => (a.next ?? "9").localeCompare(b.next ?? "9"));
            const exp = cardExpiry(c);
            const expired = !!exp && exp < today;
            const beforeNext = !!exp && !expired && on.some((s) => s.next && s.next > exp);
            const expiry = c.expMonth && c.expYear ? `${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}` : null;
            return (
              <section key={c.id} className="rise card overflow-hidden" style={{ "--i": i } as React.CSSProperties}>
                <header className="flex items-center gap-3 p-4 sm:p-5">
                  <CardThumb color={c.color} brand={c.brand} width={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-medium text-ink">{c.name}</h2>
                      {expired ? <Tag tone="danger">wygasła</Tag> : beforeNext ? <Tag tone="danger">wygasa</Tag> : null}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {[[c.brand, c.last4 && `••${c.last4}`].filter(Boolean).join(" "), expiry].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Link
                    href={`/cards/${c.id}/edit`}
                    aria-label={`Edytuj kartę ${c.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Pencil size={16} />
                  </Link>
                </header>

                {on.length ? <SubList subs={on} today={today} /> : (
                  <p className="border-t border-hairline px-5 py-4 text-sm text-muted">Nic nie schodzi z tej karty.</p>
                )}

                <footer className="flex items-center justify-between border-t border-hairline bg-surface-alt px-5 py-3 text-sm">
                  <span className="text-muted">
                    {on.length} {plural(on.length, ["subskrypcja", "subskrypcje", "subskrypcji"])}
                  </span>
                  <span>
                    <span className="tabular font-medium text-ink">{money(sum(on.map((s) => s.monthlyPLN)))}</span>
                    <span className="text-muted"> / mies.</span>
                  </span>
                </footer>
              </section>
            );
          })}

          {unassigned.length > 0 && (
            <section className="rise card overflow-hidden" style={{ "--i": sorted.length } as React.CSSProperties}>
              <header className="p-4 sm:p-5">
                <h2 className="font-medium text-ink">Bez karty</h2>
                <p className="text-sm text-muted">Przypisz kartę, żeby wiedzieć, co z czego schodzi.</p>
              </header>
              <SubList subs={unassigned} today={today} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SubList({ subs, today }: { subs: EnrichedSub[]; today: string }) {
  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {subs.map((s) => (
        <li key={s.id}>
          <Link href={`/subscriptions/${s.id}`} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-alt sm:px-5">
            <span className="relative shrink-0">
              <Avatar name={s.name} color={s.color} logo={s.logo} size={32} />
              <ScopeBadge scope={s.scope} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{s.name}</span>
              <span className="block truncate text-xs text-muted">{s.next ? relative(s.next, today) : "—"}</span>
            </span>
            <span className="tabular shrink-0 text-ink">{money(s.myAmount, s.currency)}</span>
            <ChevronRight size={16} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
