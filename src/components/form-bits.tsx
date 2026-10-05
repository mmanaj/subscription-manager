"use client";

import { useFormStatus } from "react-dom";
import { SWATCHES } from "@/lib/colors";

export const inputCls =
  "w-full rounded-[var(--radius-field)] border border-transparent bg-canvas px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted focus:border-hairline focus:bg-paper focus:ring-2 focus:ring-ink/10 aria-[invalid=true]:border-ember/60";

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
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? <span className="text-sm text-ember">{error}</span> : hint ? <span className="text-xs text-muted">{hint}</span> : null}
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
      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-ink-soft disabled:opacity-60 sm:w-auto"
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
            className="block h-8 w-8 rounded-full ring-1 ring-hairline ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink"
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
