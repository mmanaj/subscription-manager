import { swatch } from "@/lib/colors";

type CardLike = { name: string; brand: string | null; last4: string | null; expMonth: number | null; expYear: number | null; color: string };

export function CardVisual({ card, children }: { card: CardLike; children?: React.ReactNode }) {
  const s = swatch(card.color);
  return (
    <div className="relative flex aspect-[1.586] w-full max-w-sm flex-col justify-between overflow-hidden rounded-large p-5" style={{ background: s.bg, color: s.fg }}>
      <div className="flex items-start justify-between gap-2">
        <span className="truncate text-base font-medium tracking-tight">{card.name || "Nowa karta"}</span>
        <span className="text-sm font-medium opacity-80">{card.brand}</span>
      </div>
      {children}
      <div className="flex items-end justify-between">
        <span className="tabular text-xl font-medium tracking-wider">•••• {card.last4 || "····"}</span>
        <span className="tabular text-sm font-medium opacity-80">
          {card.expMonth && card.expYear ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : ""}
        </span>
      </div>
    </div>
  );
}
