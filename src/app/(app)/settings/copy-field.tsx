"use client";

import { useState } from "react";

export function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-card bg-fog p-2 pl-4">
      <code className="min-w-0 flex-1 truncate text-sm text-charcoal">{value}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-forest"
      >
        {copied ? "Skopiowano" : "Kopiuj"}
      </button>
    </div>
  );
}
