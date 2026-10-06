/** iOS-style toggle built on a real checkbox (works in forms, keyboard and screen readers). */
export function Switch({
  name,
  defaultChecked,
  checked,
  onChange,
  disabled,
  label,
}: {
  name?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        name={name}
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span className="h-7 w-12 rounded-full bg-hairline transition-colors duration-200 peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink/30 peer-disabled:opacity-50" />
      <span className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-paper shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-transform duration-200 [transition-timing-function:var(--ease-out)] peer-checked:translate-x-5" />
    </span>
  );
}
