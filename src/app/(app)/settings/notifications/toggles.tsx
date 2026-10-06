"use client";

import { useOptimistic, useTransition } from "react";
import { X } from "lucide-react";
import { removePushDevice, setSubscriptionNotify } from "@/app/actions";
import { Switch } from "@/components/switch";

export function SubNotifyToggle({ id, name, on }: { id: number; name: string; on: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <Switch
      label={`Przypomnienia: ${name}`}
      checked={optimistic}
      onChange={(v) =>
        start(async () => {
          setOptimistic(v);
          await setSubscriptionNotify(id, v);
        })
      }
    />
  );
}

export function RemoveDevice({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label="Usuń urządzenie"
      disabled={pending}
      onClick={() => start(() => removePushDevice(id))}
      className="rounded-full p-2 text-muted transition hover:bg-ember/10 hover:text-ember"
    >
      <X size={16} />
    </button>
  );
}
