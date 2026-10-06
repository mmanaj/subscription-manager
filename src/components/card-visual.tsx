import { Landmark } from "lucide-react";
import { swatch } from "@/lib/colors";

/** Monochrome network marks — recognisable shapes, no brand colours (the UI is achromatic). */
function NetworkMark({ brand, light, height }: { brand: string | null; light: boolean; height: number }) {
  const fg = light ? "#0a0a0a" : "#ffffff";
  switch (brand) {
    case "Mastercard":
      return (
        <svg viewBox="0 0 24 15" style={{ height, width: (height * 24) / 15 }} aria-label="Mastercard">
          <circle cx="8.5" cy="7.5" r="6.5" fill={fg} fillOpacity="0.9" />
          <circle cx="15.5" cy="7.5" r="6.5" fill={fg} fillOpacity="0.5" />
        </svg>
      );
    case "Visa":
      return (
        <span className="font-bold italic leading-none tracking-tight" style={{ color: fg, fontSize: "1em" }} aria-label="Visa">
          VISA
        </span>
      );
    case "Amex":
      return (
        <span
          className="rounded-[2px] px-[0.3em] py-[0.1em] font-bold leading-none tracking-tight"
          style={{ color: light ? "#ffffff" : "#0a0a0a", background: fg, fontSize: "0.7em" }}
          aria-label="American Express"
        >
          AMEX
        </span>
      );
    case "PayPal":
      return (
        <span className="font-bold italic leading-none" style={{ color: fg, fontSize: "0.8em" }} aria-label="PayPal">
          PayPal
        </span>
      );
    case "BLIK":
      return (
        <span className="font-bold leading-none" style={{ color: fg, fontSize: "0.8em" }} aria-label="BLIK">
          blik
        </span>
      );
    default:
      return null;
  }
}

/**
 * Small payment-card thumbnail: card proportions, EMV chip, network mark, last 4 digits.
 * `width` drives everything, so it works as a 56px list icon or a ~200px preview.
 */
export function CardThumb({
  kind = "card",
  color,
  brand,
  last4,
  width = 56,
}: {
  kind?: "card" | "account";
  color: string | null;
  brand: string | null;
  last4?: string | null;
  width?: number;
}) {
  const s = swatch(color);
  const light = s.fg !== "#ffffff";
  if (kind === "account") {
    // A bank account isn't a card: same footprint, bank glyph instead of chip and network.
    return (
      <span
        aria-hidden
        className="relative inline-flex shrink-0 flex-col items-center justify-center gap-[6%]"
        style={{
          width,
          height: width / 1.586,
          background: s.bg,
          color: s.fg,
          borderRadius: Math.max(4, width * 0.08),
          boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
          fontSize: width * 0.11,
        }}
      >
        <Landmark size={width * 0.3} strokeWidth={1.75} />
        {last4 && width >= 96 && <span className="tabular leading-none tracking-wider opacity-90">•• {last4}</span>}
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="relative inline-flex shrink-0 flex-col justify-between overflow-hidden"
      style={{
        width,
        height: width / 1.586,
        background: s.bg,
        color: s.fg,
        borderRadius: Math.max(4, width * 0.08),
        padding: width * 0.09,
        fontSize: width * 0.13,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)",
      }}
    >
      {/* EMV chip */}
      <span
        className="block"
        style={{
          width: width * 0.17,
          height: width * 0.13,
          borderRadius: width * 0.025,
          background: light ? "rgba(10,10,10,0.18)" : "rgba(255,255,255,0.35)",
        }}
      />
      <span className="flex items-end justify-between gap-1">
        {last4 && width >= 96 ? (
          <span className="tabular leading-none tracking-wider opacity-90" style={{ fontSize: "0.85em" }}>
            •• {last4}
          </span>
        ) : (
          <span />
        )}
        <span className="flex items-end">
          <NetworkMark brand={brand} light={light} height={width * 0.19} />
        </span>
      </span>
    </span>
  );
}
