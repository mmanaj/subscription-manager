import Link from "next/link";
import { money } from "@/lib/format";

/** Single-series horizontal bars: magnitude only, one hue, values in text ink. */
export function Bars({
  data,
  total,
  href,
}: {
  data: { label: string; value: number }[];
  total: number;
  /** Optional drill-down link per bar */
  href?: (label: string) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d, i) => (
        <li key={d.label} title={`${d.label}: ${money(d.value)} / mies.`}>
          {href ? (
            <Link href={href(d.label)} className="press -mx-2 block rounded-card px-2 py-1 hover:bg-fog/60">
              <Bar d={d} i={i} max={max} total={total} />
            </Link>
          ) : (
            <Bar d={d} i={i} max={max} total={total} />
          )}
        </li>
      ))}
    </ul>
  );
}

function Bar({ d, i, max, total }: { d: { label: string; value: number }; i: number; max: number; total: number }) {
  return (
    <>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-obsidian">{d.label}</span>
        <span className="tabular shrink-0 text-charcoal">
          {money(d.value)} <span className="text-pebble">· {total ? Math.round((d.value / total) * 100) : 0}%</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-fog">
        <div
          className="grow-x h-full rounded-full bg-forest"
          style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, "--i": i } as React.CSSProperties}
        />
      </div>
    </>
  );
}
