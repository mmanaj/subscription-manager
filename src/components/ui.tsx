import Link from "next/link";
import { swatch } from "@/lib/colors";
import { amountParts } from "@/lib/format";

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-lime px-6 py-3 font-semibold text-forest transition active:scale-[0.97] hover:brightness-95 disabled:opacity-50",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-forest bg-paper px-6 py-3 font-semibold text-forest transition active:scale-[0.97] hover:bg-mist disabled:opacity-50",
  link: "inline-flex items-center gap-1 font-semibold text-forest underline underline-offset-4 decoration-2 hover:decoration-lime",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-full border border-alarm px-6 py-3 font-semibold text-alarm transition active:scale-[0.97] hover:bg-alarm hover:text-paper",
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
      className="inline-flex shrink-0 items-center justify-center rounded-full font-black"
      style={{ width: size, height: size, background: s.bg, color: s.fg, fontSize: size * 0.42, letterSpacing: "-0.04em" }}
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

export function Tag({ children, tone = "mist" }: { children: React.ReactNode; tone?: "mist" | "dark" | "fog" | "alarm" }) {
  const tones = {
    mist: "bg-mist text-forest",
    dark: "bg-forest text-lime",
    fog: "bg-fog text-charcoal",
    alarm: "bg-alarm/10 text-alarm",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="heading text-[28px] sm:text-[36px]">{children}</h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, back, action }: { title: React.ReactNode; back?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:mb-10">
      {back && (
        <Link href={back} className="text-sm font-semibold text-slate hover:text-forest">
          ← Wróć
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="heading text-[44px] sm:text-[64px]">{title}</h1>
        {action}
      </div>
    </header>
  );
}

export function Segments({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="inline-flex rounded-full bg-fog p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            i.key === active ? "bg-lime text-forest" : "text-charcoal hover:text-forest"
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
    <div className="rounded-large bg-fog px-6 py-10 text-center">
      <p className="heading text-2xl">{title}</p>
      {children && <div className="mt-4 flex flex-col items-center gap-3 text-slate">{children}</div>}
    </div>
  );
}
