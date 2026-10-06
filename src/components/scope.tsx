import Link from "next/link";
import { Briefcase, User, Users } from "lucide-react";
import type { SubscriptionScope } from "@/db/schema";
import { getI18n } from "@/lib/i18n/server";

const ICON = { personal: User, shared: Users, business: Briefcase } as const;

export function ScopeIcon({ scope, size = 16 }: { scope: SubscriptionScope; size?: number }) {
  const Icon = ICON[scope];
  return <Icon size={size} strokeWidth={2} />;
}

/** Small corner badge on a logo: shared = navy people, business = black briefcase, personal = none. */
export async function ScopeBadge({ scope, size = 18 }: { scope: SubscriptionScope; size?: number }) {
  if (scope === "personal") return null;
  const { t } = await getI18n();
  const Icon = ICON[scope];
  return (
    <span
      title={t.scope[scope].one}
      className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-paper ${
        scope === "shared" ? "bg-paper text-ink shadow-hairline" : "bg-ink text-paper"
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.6} strokeWidth={2.5} />
    </span>
  );
}

/** Full-width type switcher with icons; one look on the dashboard and the list. */
export async function ScopeTabs({
  active,
  href,
  available,
}: {
  active: SubscriptionScope | undefined;
  href: (scope: SubscriptionScope | undefined) => string;
  /** Hide types you don't use */
  available?: Set<SubscriptionScope>;
}) {
  const { t } = await getI18n();
  const scopes = (["personal", "shared", "business"] as const).filter((s) => !available || available.has(s));
  const items: { key: SubscriptionScope | undefined; label: string }[] = [
    { key: undefined, label: t.scope.all },
    ...scopes.map((s) => ({ key: s, label: t.scope[s].many })),
  ];
  return (
    <nav aria-label={t.scope.navLabel} className="grid w-full rounded-full bg-hairline/60 p-1 sm:max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => {
        const on = i.key === active;
        const Icon = i.key ? ICON[i.key] : null;
        return (
          <Link
            key={i.label}
            href={href(i.key)}
            aria-current={on ? "page" : undefined}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full px-1 py-1.5 text-[13px] font-medium transition sm:text-sm ${
              on ? "bg-paper text-ink shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            {/* Icons only where there's room; narrow phones get clean full words instead of truncated ones. */}
            {Icon && <Icon size={15} strokeWidth={1.75} className="hidden shrink-0 min-[420px]:block" />}
            <span className="truncate">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
