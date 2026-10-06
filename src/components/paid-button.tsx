"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { markPaid } from "@/app/actions";

/** Round tick for manual charges: empty = to pay, filled = paid. */
export function PaidButton({ subId, date, paid, label }: { subId: number; date: string; paid: boolean; label?: boolean }) {
  const [on, setOn] = useOptimistic(paid);
  const [pending, start] = useTransition();
  const toggle = () =>
    start(async () => {
      setOn(!on);
      await markPaid(subId, date, !on);
    });
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Opłacone — cofnij" : "Oznacz jako opłacone"}
      title={on ? "Opłacone — cofnij" : "Oznacz jako opłacone"}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full transition-colors ${
        label ? "h-9 px-3.5 text-sm font-medium" : "h-8 w-8"
      } ${on ? "bg-ink text-paper" : "bg-paper text-muted shadow-hairline hover:text-ink"} ${pending ? "opacity-70" : ""}`}
    >
      <Check size={label ? 15 : 16} strokeWidth={2.5} />
      {label && (on ? "Opłacone" : "Oznacz jako opłacone")}
    </button>
  );
}
