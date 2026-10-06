"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n-provider";

export function CopyField({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-full bg-canvas p-1.5 pl-4">
      <code className="min-w-0 flex-1 truncate text-sm text-ink-soft">{value}</code>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="shrink-0 h-8 rounded-full bg-ink px-3.5 text-sm font-medium text-paper"
      >
        {copied ? t.settings.copied : t.settings.copy}
      </button>
    </div>
  );
}
