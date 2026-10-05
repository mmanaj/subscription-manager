"use client";

import { useEffect, useRef } from "react";

/** Horizontal chip row that keeps the active chip (aria-current) in view after navigation. */
export function ChipScroller({ children, className, label }: { children: React.ReactNode; className?: string; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    const active = el?.querySelector<HTMLElement>("[aria-current]");
    if (!el || !active) return;
    el.scrollLeft = active.offsetLeft - el.clientWidth / 2 + active.offsetWidth / 2;
  });
  return (
    <nav ref={ref} aria-label={label} className={className}>
      {children}
    </nav>
  );
}
