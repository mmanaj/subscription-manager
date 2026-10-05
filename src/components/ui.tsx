import Link from "next/link";
import { swatch } from "@/lib/colors";
import { amountParts } from "@/lib/format";

export const btn = {
  primary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-paper transition hover:bg-ink-soft disabled:opacity-50",
  secondary:
    "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-canvas px-5 text-sm font-medium text-ink transition hover:bg-hairline disabled:opacity-50",
  outline:
    "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-hairline bg-paper px-5 text-sm font-medium text-ink transition hover:bg-canvas disabled:opacity-50",
  link: "inline-flex items-center gap-1 text-sm font-medium text-ink underline underline-offset-4 decoration-hairline hover:decoration-ink",
  danger:
    "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium text-ember transition hover:bg-ember/10",
};

export function Avatar({
  name,
  color,
  size = 44,
  logo,
}: {
  name: string;
  color: string | null;
  size?: number;
  logo?: { src: string; fullBleed: boolean } | null;
}) {
  const s = swatch(color);
  if (logo) {
    return (
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper shadow-hairline"
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny auth-protected icon, no optimisation needed */}
        <img
          src={logo.src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className={logo.fullBleed ? "h-full w-full object-cover" : "h-full w-full object-contain p-[18%]"}
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium"
      style={{
        width: size,
        height: size,
        background: s.bg,
        color: s.fg,
        fontSize: size * 0.4,
        letterSpacing: "-0.02em",
        boxShadow: s.ring ? "inset 0 0 0 1px #e5e5e5" : undefined,
      }}
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}

/** Big Wise-style figure: heavy integer part, lighter decimals + currency. */
export function BigMoney({ value, className = "", currency = "zł" }: { value: number; className?: string; currency?: string }) {
  const { int, dec } = amountParts(value);
  return (
    <span className={`display tabular whitespace-nowrap ${className}`}>
      {int}
      <span className="text-[0.45em] tracking-normal">
        ,{dec} {currency}
      </span>
    </span>
  );
}

export function Tag({ children, tone = "soft" }: { children: React.ReactNode; tone?: "soft" | "solid" | "outline" | "danger" }) {
  const tones = {
    soft: "bg-canvas text-ink-soft",
    solid: "bg-ink-soft text-paper",
    outline: "text-ink shadow-hairline",
    danger: "text-ember shadow-[0_0_0_1px_rgba(231,0,11,0.3)]",
  };
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="heading text-lg">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, back, action }: { title: React.ReactNode; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-2 sm:mb-10">
      {back && (
        <Link href={back} className="text-sm text-muted hover:text-ink">
          ← Wróć
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
        {action}
      </div>
    </header>
  );
}

/** shadcn-style tabs: muted track, active tab lifted onto a white chip. */
export function Segments({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="inline-flex rounded-full bg-hairline/60 p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            i.key === active ? "bg-paper text-ink shadow-card" : "text-muted hover:text-ink"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-large border border-dashed border-hairline px-6 py-10 text-center">
      <p className="heading text-lg">{title}</p>
      {children && <div className="mt-4 flex flex-col items-center gap-3 text-muted">{children}</div>}
    </div>
  );
}
