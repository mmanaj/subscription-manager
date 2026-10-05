"use client";

import { useLayoutEffect, useState } from "react";
import { amountParts } from "@/lib/format";

const KEY = "subs:counted";

/**
 * Big figure that counts up from zero on the first dashboard view of a session. Later views (and
 * reduced-motion users) get the final number straight away — a counter every time gets old fast.
 */
export function CountUpMoney({ value, className = "", currency = "zł" }: { value: number; className?: string; currency?: string }) {
  const [shown, setShown] = useState(value);

  // Layout effect: decide before the first paint, so the final number never flashes before counting.
  useLayoutEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {}
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const start = performance.now();
    const duration = 900;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4); // strong ease-out: quick start, gentle landing
      setShown(value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
    });
    setShown(0);
    // Interrupted (navigation, re-render): land on the real number.
    return () => {
      cancelAnimationFrame(frame);
      setShown(value);
    };
  }, [value]);

  const { int, dec } = amountParts(shown);
  return (
    <span className={`display tabular whitespace-nowrap ${className}`} aria-label={`${value.toFixed(2)} ${currency}`}>
      {int}
      <span className="text-[0.45em] tracking-normal">
        ,{dec} {currency}
      </span>
    </span>
  );
}
