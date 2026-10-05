import Link from "next/link";
import { Briefcase, User, Users } from "lucide-react";
import type { SubscriptionScope } from "@/db/schema";

const ICON = { personal: User, shared: Users, business: Briefcase } as const;
const LABEL = { personal: "Prywatne", shared: "Wspólne", business: "Firmowe" } as const;

/** Small corner badge on a logo: shared = navy people, business = black briefcase, personal = none. */
export function ScopeBadge({ scope, size = 18 }: { scope: SubscriptionScope; size?: number }) {
  if (scope === "personal") return null;
  const Icon = ICON[scope];
  return (
    <span
      title={scope === "shared" ? "Wspólna" : "Firmowa"}
      className={`absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full ring-2 ring-paper ${
        scope === "shared" ? "bg-signal text-paper" : "bg-obsidian text-lime"
      }`}
      style={{ width: size, height: size }}
    >
      <Icon size={size * 0.6} strokeWidth={2.5} />
    </span>
  );
}

/** Full-width type switcher with icons; one look on the dashboard and the list. */
export function ScopeTabs({
  active,
  href,
  available,
}: {
  active: SubscriptionScope | undefined;
  href: (scope: SubscriptionScope | undefined) => string;
  /** Hide types you don't use */
  available?: Set<SubscriptionScope>;
}) {
  const scopes = (["personal", "shared", "business"] as const).filter((s) => !available || available.has(s));
  const items: { key: SubscriptionScope | undefined; label: string }[] = [
    { key: undefined, label: "Wszystkie" },
    ...scopes.map((s) => ({ key: s, label: LABEL[s] })),
  ];
  return (
    <nav aria-label="Typ" className="grid rounded-full bg-fog p-1" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((i) => {
        const on = i.key === active;
        const Icon = i.key ? ICON[i.key] : null;
        return (
          <Link
            key={i.label}
            href={href(i.key)}
            aria-current={on ? "page" : undefined}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full px-1 py-2 text-[13px] font-semibold transition sm:text-sm ${
              on ? "bg-forest text-paper" : "text-charcoal hover:text-forest"
            }`}
          >
            {/* Icons only where there's room; narrow phones get clean full words instead of truncated ones. */}
            {Icon && <Icon size={15} strokeWidth={2.25} className={`hidden shrink-0 min-[420px]:block ${on ? "text-lime" : ""}`} />}
            <span className="truncate">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
