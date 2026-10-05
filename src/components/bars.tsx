import { money } from "@/lib/format";

/** Single-series horizontal bars: magnitude only, one hue, values in text ink. */
export function Bars({ data, total }: { data: { label: string; value: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li key={d.label} title={`${d.label}: ${money(d.value)} / mies.`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-obsidian">{d.label}</span>
            <span className="tabular shrink-0 text-charcoal">
              {money(d.value)} <span className="text-pebble">· {total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-fog">
            <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
