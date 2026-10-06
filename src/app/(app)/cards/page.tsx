import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { CardThumb } from "@/components/card-visual";
import { ScopeBadge } from "@/components/scope";
import { Avatar, btn, Empty, Tag } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { cardExpiry, loadAll, sum, type EnrichedSub } from "@/lib/data";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.cards.title };
}

export default async function CardsPage() {
  const [{ cards, subs, today }, i18n] = await Promise.all([loadAll(), getI18n()]);
  const { t, f } = i18n;
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
        title={t.cards.title}
        action={
          <Link href="/cards/new" className={btn.primary}>
            {t.common.add}
          </Link>
        }
      />

      {cards.length === 0 ? (
        <Empty title={t.cards.empty}>
          <Link href="/cards/new" className={btn.primary}>
            {t.cards.addCardOrAccount}
          </Link>
        </Empty>
      ) : (
        <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-x-16">
          {sorted.map((c, i) => {
            const on = live.filter((s) => s.cardId === c.id).sort((a, b) => (a.next ?? "9").localeCompare(b.next ?? "9"));
            const exp = cardExpiry(c);
            const expired = !!exp && exp < today;
            const beforeNext = !!exp && !expired && on.some((s) => s.next && s.next > exp);
            const expiry = c.expMonth && c.expYear ? `${String(c.expMonth).padStart(2, "0")}/${String(c.expYear).slice(-2)}` : null;
            return (
              <section key={c.id} className="rise" style={{ "--i": i } as React.CSSProperties}>
                <header className="flex items-center gap-3 pb-3">
                  <CardThumb kind={c.kind} color={c.color} brand={c.brand} width={56} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-medium text-ink">{c.name}</h2>
                      {expired ? <Tag tone="danger">{t.cards.expired}</Tag> : beforeNext ? <Tag tone="danger">{t.cards.expiring}</Tag> : null}
                    </div>
                    <p className="truncate text-sm text-muted">
                      {[[c.kind === "account" ? t.cards.bankAccount : c.brand === "Inne" ? t.cards.brandOther : c.brand, c.last4 && `••${c.last4}`].filter(Boolean).join(" "), expiry].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <Link
                    href={`/cards/${c.id}/edit`}
                    aria-label={t.cards.editAria(c.name)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
                  >
                    <Pencil size={16} />
                  </Link>
                </header>

                {on.length ? <SubList subs={on} today={today} i18n={i18n} /> : (
                  <p className="border-t border-hairline py-4 text-sm text-muted">{t.cards.nothingHere}</p>
                )}

                <footer className="flex items-center justify-between border-t border-hairline py-3 text-sm">
                  <span className="text-muted">
                    {t.subscriptionsCount(on.length)}
                  </span>
                  <span>
                    <span className="tabular font-medium text-ink">{f.money(sum(on.map((s) => s.monthlyPLN)))}</span>
                    <span className="text-muted"> {t.common.perMonth}</span>
                  </span>
                </footer>
              </section>
            );
          })}

          {unassigned.length > 0 && (
            <section className="rise" style={{ "--i": sorted.length } as React.CSSProperties}>
              <header className="pb-3">
                <h2 className="font-medium text-ink">{t.cards.unassignedTitle}</h2>
                <p className="text-sm text-muted">{t.cards.unassignedHint}</p>
              </header>
              <SubList subs={unassigned} today={today} i18n={i18n} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SubList({ subs, today, i18n: { f } }: { subs: EnrichedSub[]; today: string; i18n: I18n }) {
  return (
    <ul className="divide-y divide-hairline border-t border-hairline">
      {subs.map((s) => (
        <li key={s.id}>
          <Link href={`/subscriptions/${s.id}`} className="-mx-3 flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-2.5 transition-colors hover:bg-surface-alt">
            <span className="relative shrink-0">
              <Avatar name={s.name} color={s.color} logo={s.logo} size={32} />
              <ScopeBadge scope={s.scope} size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{s.name}</span>
              <span className="block truncate text-xs text-muted">{s.next ? f.relative(s.next, today) : "—"}</span>
            </span>
            <span className="tabular shrink-0 text-ink">{f.money(s.myAmount, s.currency)}</span>
            <ChevronRight size={16} className="shrink-0 text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
