"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { amountParts } from "@/lib/format";

const KEY = "subs:counted";

/**
 * Big figure that counts up from zero on the first dashboard view of a session, and glides to the
 * new value when it changes (e.g. switching Prywatne / Wspólne / Firmowe). Reduced motion: no tween.
 */
export function CountUpMoney({ value, className = "", currency = "zł" }: { value: number; className?: string; currency?: string }) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  // Layout effect: decide before paint, so a stale number never flashes.
  useLayoutEffect(() => {
    let first = false;
    try {
      first = sessionStorage.getItem(KEY) !== "1";
    } catch {}
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = first ? 0 : current.current;
    if (reduce || from === value) {
      current.current = value;
      setShown(value);
      return;
    }

    const start = performance.now();
    const duration = first ? 900 : 450;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      // Ease-in-out (cubic): slow start, fast middle, gentle landing.
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const v = from + (value - from) * eased;
      current.current = v;
      setShown(v);
      if (t < 1) frame = requestAnimationFrame(tick);
      else
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
    });
    setShown(from);
    // Interrupted (navigation, re-render): land on the real number.
    return () => {
      cancelAnimationFrame(frame);
      current.current = value;
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
