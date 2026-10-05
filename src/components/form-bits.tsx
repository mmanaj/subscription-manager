"use client";

import { useFormStatus } from "react-dom";
import { SWATCHES } from "@/lib/colors";

export const inputCls =
  "w-full rounded-card border border-pebble bg-paper px-4 py-3 text-obsidian outline-none transition placeholder:text-pebble focus:border-forest focus:ring-0 aria-[invalid=true]:border-alarm";

export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-semibold text-obsidian">{label}</span>
      {children}
      {error ? <span className="text-sm text-alarm">{error}</span> : hint ? <span className="text-xs text-slate">{hint}</span> : null}
    </label>
  );
}

export function Submit({ children, pending: pendingProp }: { children: React.ReactNode; pending?: boolean }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-full bg-lime px-6 py-3.5 text-base font-semibold text-forest transition hover:brightness-95 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Zapisuję…" : children}
    </button>
  );
}

export function ColorPicker({ name, value, onChange }: { name: string; value: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(SWATCHES).map(([key, s]) => (
        <label key={key} className="cursor-pointer" title={s.label}>
          <input
            type="radio"
            name={name}
            value={key}
            defaultChecked={key === value}
            onChange={() => onChange?.(key)}
            className="peer sr-only"
          />
          <span
            className="block h-9 w-9 rounded-full ring-1 ring-black/10 ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-forest peer-focus-visible:ring-2 peer-focus-visible:ring-forest"
            style={{ background: s.bg }}
          />
        </label>
      ))}
    </div>
  );
}

/**
 * Submit handler that runs a form action without React's automatic form reset, so a validation
 * error doesn't wipe what was typed.
 */
export function submitWithoutReset(dispatch: (fd: FormData) => void, startTransition: (fn: () => void) => void) {
  return (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
