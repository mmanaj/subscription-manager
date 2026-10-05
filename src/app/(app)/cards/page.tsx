import Link from "next/link";
import { CardVisual } from "@/components/card-visual";
import { btn, Empty, PageHeader, Tag } from "@/components/ui";
import { cardExpiry, loadAll, sum } from "@/lib/data";
import { money } from "@/lib/format";
import { plural } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karty" };

export default async function CardsPage() {
  const { cards, subs, today } = await loadAll();
  return (
    <div>
      <PageHeader
        title="Karty"
        action={
          <Link href="/cards/new" className={`${btn.outline} py-2`}>
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
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => {
            const on = subs.filter((s) => s.cardId === c.id && s.live);
            const exp = cardExpiry(c);
            const expired = exp && exp < today;
            const soon = exp && !expired && on.some((s) => s.next && s.next > exp);
            return (
              <li key={c.id} className="rise flex flex-col gap-3" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/cards/${c.id}/edit`} className="transition active:scale-[0.98]">
                  <CardVisual card={c} />
                </Link>
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-sm text-slate">
                    {on.length} {plural(on.length, ["subskrypcja", "subskrypcje", "subskrypcji"])} ·{" "}
                    <span className="tabular font-semibold text-obsidian">{money(sum(on.map((s) => s.monthlyPLN)))}</span>/mies.
                  </span>
                  {expired ? <Tag tone="alarm">wygasła</Tag> : soon ? <Tag tone="alarm">wygasa</Tag> : null}
                </div>
                {on.length > 0 && <p className="px-1 text-sm text-pebble">{on.map((s) => s.name).join(", ")}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
