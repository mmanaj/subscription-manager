"use client";

import { useOptimistic, useTransition } from "react";
import { X } from "lucide-react";
import { removePushDevice, setSubscriptionNotify } from "@/app/actions";
import { Switch } from "@/components/switch";
import { useI18n } from "@/components/i18n-provider";

export function SubNotifyToggle({ id, name, on }: { id: number; name: string; on: boolean }) {
  const { t } = useI18n();
  const [optimistic, setOptimistic] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <Switch
      label={t.notifications.toggleLabel(name)}
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
  const { t } = useI18n();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={t.notifications.removeDevice}
      disabled={pending}
      onClick={() => start(() => removePushDevice(id))}
      className="rounded-full p-2 text-muted transition hover:bg-ember/10 hover:text-ember"
    >
      <X size={16} />
    </button>
  );
}
