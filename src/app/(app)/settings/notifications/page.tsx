import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions, settings } from "@/db/schema";
import { Switch } from "@/components/switch";
import { ScopeBadge } from "@/components/scope";
import { Avatar, btn } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { updateReminderSettings } from "@/app/actions";
import { loadAll } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { pushConfigured, pushDiagnostics, publicVapidKey } from "@/lib/push";
import { PushDevice } from "./push-device";
import { RemoveDevice, SubNotifyToggle } from "./toggles";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.settings.notifications };
}

export default async function NotificationsPage() {
  const [[cfg], devices, { subs, today }, { t, f }] = await Promise.all([
    db.select().from(settings),
    db.select().from(pushSubscriptions).orderBy(asc(pushSubscriptions.createdAt)),
    loadAll(),
    getI18n(),
  ]);
  const n = t.notifications;
  const { dateShort, relative } = f;
  const daysBefore = cfg?.remindDaysBefore ?? 3;
  const sameDay = cfg?.remindSameDay ?? true;
  const live = subs.filter((s) => s.live).sort((a, b) => Number(b.notify) - Number(a.notify) || f.compare(a.name, b.name));
  const onCount = live.filter((s) => s.notify).length;
  const diag = pushDiagnostics();
  const checks: [string, boolean, string?][] = [
    [n.checks.publicKey, diag.publicKey],
    [n.checks.privateKey, diag.privateKey],
    [n.checks.keysValid, diag.keysValid, diag.keysError],
    [n.checks.subject, true, diag.subject],
    [n.checks.cron, diag.cronSecret],
    [n.checks.devices, devices.length > 0, String(devices.length)],
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title={t.settings.notifications} back="/settings" />

      {!pushConfigured() ? (
        <p className="panel p-4 text-sm text-ink">
          {n.missingKeys} <code className="font-medium">VAPID_PUBLIC_KEY</code>, <code className="font-medium">VAPID_PRIVATE_KEY</code>,{" "}
          <code className="font-medium">CRON_SECRET</code>
        </p>
      ) : (
        <section className="-mt-4 flex flex-col gap-4">
          <h2 className="heading text-lg">{n.thisDevice}</h2>
          <PushDevice publicKey={publicVapidKey()} />
          {devices.length > 0 && (
            <div>
              <p className="caption mb-2">{n.devices}</p>
              <ul className="divide-y divide-hairline border-y border-hairline">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{d.label ?? t.common.device}</span>
                      <span className="block text-xs text-muted">
                        {n.added(dateShort(d.createdAt.toISOString().slice(0, 10)))}
                        {d.lastSentAt && ` · ${n.lastSent(dateShort(d.lastSentAt.toISOString().slice(0, 10)))}`}
                      </span>
                    </span>
                    <RemoveDevice id={d.id} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <details className="group -mt-6">
        <summary className="cursor-pointer list-none text-sm text-muted [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-hairline underline-offset-4 group-open:hidden">{n.showDiag}</span>
          <span className="hidden underline decoration-hairline underline-offset-4 group-open:inline">{n.hideDiag}</span>
        </summary>
        <ul className="mt-3 divide-y divide-hairline border-y border-hairline text-sm">
          {checks.map(([label, ok, note]) => (
            <li key={label} className="flex items-start justify-between gap-3 py-2">
              <span className="text-ink">{label}</span>
              <span className={`min-w-0 break-all text-right ${ok ? "text-muted" : "text-ember"}`}>
                {ok ? "✓" : "✗"} {note}
              </span>
            </li>
          ))}
        </ul>
      </details>

      <section className="flex flex-col gap-4 border-t border-hairline pt-10">
        <h2 className="heading text-lg">{n.whenTitle}</h2>
        <form action={updateReminderSettings} className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-ink">{n.before}</span>
              <span className="block text-sm text-muted">{n.howManyDays}</span>
            </span>
            <select
              name="remindDaysBefore"
              defaultValue={daysBefore}
              className="rounded-full bg-canvas px-4 py-2 text-ink outline-none focus:ring-2 focus:ring-ink/10"
            >
              <option value={0}>{n.dontRemind}</option>
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {n.daysBefore(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-ink">{n.sameDay}</span>
              <span className="block text-sm text-muted">{n.sameDayHint}</span>
            </span>
            <Switch name="remindSameDay" defaultChecked={sameDay} label={n.sameDay} />
          </label>
          <p className="text-xs text-muted">{n.sendTime}</p>
          <button className={`${btn.secondary} self-start`}>{t.common.save}</button>
        </form>
      </section>

      <section className="flex flex-col gap-4 border-t border-hairline pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="heading text-lg">{n.whichTitle}</h2>
          <span className="text-sm text-muted">
            {n.onOf(onCount, live.length)}
          </span>
        </div>
        <p className="-mt-2 text-sm text-muted">{n.whichHint}</p>
        <ul className="divide-y divide-hairline border-y border-hairline">
          {live.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5">
              <span className="relative shrink-0">
                <Avatar name={s.name} color={s.color} logo={s.logo} size={32} />
                <ScopeBadge scope={s.scope} size={14} />
              </span>
              <Link href={`/subscriptions/${s.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-ink">{s.name}</span>
                <span className="block truncate text-xs text-muted">
                  {s.next ? `${dateShort(s.next)} · ${relative(s.next, today)}` : "—"}
                </span>
              </Link>
              <SubNotifyToggle id={s.id} name={s.name} on={s.notify} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
