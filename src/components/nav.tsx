"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, LayoutGrid, ListChecks, Plus, Settings2 } from "lucide-react";

const items = [
  { href: "/", label: "Pulpit", icon: LayoutGrid },
  { href: "/subscriptions", label: "Subskrypcje", icon: ListChecks },
  { href: "/cards", label: "Karty", icon: CreditCard },
  { href: "/settings", label: "Więcej", icon: Settings2 },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-fog bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-8">
        <Link href="/" className="text-[26px] font-black tracking-[-0.06em] text-forest">
          subs<span className="text-lime [-webkit-text-stroke:1px_#163300]">.</span>
        </Link>
        <nav className="hidden items-center rounded-full bg-fog p-1 md:flex">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive(path, i.href) ? "bg-forest text-paper" : "text-forest hover:bg-mist"
              }`}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/subscriptions/new"
          className="hidden items-center gap-1.5 rounded-full bg-lime px-5 py-2.5 text-sm font-semibold text-forest transition hover:brightness-95 md:inline-flex"
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
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-forest" : "text-pebble"}`}
      >
        <span className={`flex h-8 w-14 items-center justify-center rounded-full transition ${active ? "bg-mist" : ""}`}>
          <Icon size={22} strokeWidth={active ? 2.5 : 2} />
        </span>
        {i.label}
      </Link>
    );
  };
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-fog bg-paper/95 backdrop-blur md:hidden">
      <div className="flex items-end px-2">
        {tab(a)}
        {tab(b)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/subscriptions/new"
            aria-label="Dodaj subskrypcję"
            className="-mt-5 mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-lime text-forest shadow-panel ring-4 ring-paper transition active:scale-95"
          >
            <Plus size={28} strokeWidth={2.75} />
          </Link>
        </div>
        {tab(c)}
        {tab(d)}
      </div>
    </nav>
  );
}
