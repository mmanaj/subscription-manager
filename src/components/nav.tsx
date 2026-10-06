"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ListChecks, Plus, Settings2, Wallet } from "lucide-react";

const items = [
  { href: "/", label: "Pulpit", icon: LayoutGrid },
  { href: "/subscriptions", label: "Subskrypcje", icon: ListChecks },
  { href: "/cards", label: "Płatności", icon: Wallet },
  { href: "/settings", label: "Więcej", icon: Settings2 },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-surface-alt/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:px-8">
        <Link href="/" className="text-xl font-medium tracking-[-0.05em] text-ink">
          subs<span className="text-muted">.</span>
        </Link>
        <nav className="hidden items-center rounded-full bg-hairline/60 p-1 md:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive(path, i.href) ? "bg-paper text-ink shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/subscriptions/new"
          className="hidden h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-sm font-medium text-paper transition hover:bg-ink-soft md:inline-flex"
        >
          <Plus size={18} strokeWidth={2.5} /> Dodaj
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const path = usePathname();
  const [a, b, c, d] = items;
  const tab = (i: (typeof items)[number]) => {
    const active = isActive(path, i.href);
    const Icon = i.icon;
    return (
      <Link
        key={i.href}
        href={i.href}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-ink" : "text-muted"}`}
      >
        <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-hairline/70" : ""}`}>
          <Icon size={20} strokeWidth={active ? 2 : 1.75} />
        </span>
        {i.label}
      </Link>
    );
  };
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface-alt/90 backdrop-blur md:hidden">
      <div className="flex items-end px-2">
        {tab(a)}
        {tab(b)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/subscriptions/new"
            aria-label="Dodaj subskrypcję"
            className="-mt-5 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-panel ring-4 ring-surface-alt transition active:scale-95"
          >
            <Plus size={24} strokeWidth={2} />
          </Link>
        </div>
        {tab(c)}
        {tab(d)}
      </div>
    </nav>
  );
}
