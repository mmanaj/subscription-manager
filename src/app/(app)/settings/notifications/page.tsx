import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { Switch } from "@/components/switch";
import { ScopeBadge } from "@/components/scope";
import { Avatar, btn, PageHeader } from "@/components/ui";
import { updateReminderSettings } from "@/app/actions";
import { loadAll } from "@/lib/data";
import { dateShort, relative } from "@/lib/format";
import { pushConfigured, pushDiagnostics, publicVapidKey } from "@/lib/push";
import { PushDevice } from "./push-device";
import { RemoveDevice, SubNotifyToggle } from "./toggles";

export const dynamic = "force-dynamic";
export const metadata = { title: "Powiadomienia" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const [devices, { subs, today }] = await Promise.all([
    db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, user.id)).orderBy(asc(pushSubscriptions.createdAt)),
    loadAll(user.id),
  ]);
  const daysBefore = user.remindDaysBefore;
  const sameDay = user.remindSameDay;
  const live = subs.filter((s) => s.live).sort((a, b) => Number(b.notify) - Number(a.notify) || a.name.localeCompare(b.name, "pl"));
  const onCount = live.filter((s) => s.notify).length;
  const diag = pushDiagnostics();
  const checks: [string, boolean, string?][] = [
    ["Klucz publiczny (VAPID_PUBLIC_KEY)", diag.publicKey],
    ["Klucz prywatny (VAPID_PRIVATE_KEY)", diag.privateKey],
    ["Klucze poprawne", diag.keysValid, diag.keysError],
    ["Nadawca (VAPID_SUBJECT)", true, diag.subject],
    ["Zadanie dzienne (CRON_SECRET)", diag.cronSecret],
    ["Zarejestrowane urządzenia", devices.length > 0, String(devices.length)],
  ];

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title="Powiadomienia" back="/settings" />

      {!pushConfigured() ? (
        <p className="panel p-4 text-sm text-ink">
          Brakuje kluczy powiadomień. Ustaw w Vercelu zmienne <code className="font-medium">VAPID_PUBLIC_KEY</code>,{" "}
          <code className="font-medium">VAPID_PRIVATE_KEY</code> i <code className="font-medium">CRON_SECRET</code>, potem zrób Redeploy.
        </p>
      ) : (
        <section className="-mt-4 flex flex-col gap-4">
          <h2 className="heading text-lg">To urządzenie</h2>
          <PushDevice publicKey={publicVapidKey()} />
          {devices.length > 0 && (
            <div>
              <p className="caption mb-2">Urządzenia z powiadomieniami</p>
              <ul className="divide-y divide-hairline border-y border-hairline">
                {devices.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-ink">{d.label ?? "Urządzenie"}</span>
                      <span className="block text-xs text-muted">
                        dodane {dateShort(d.createdAt.toISOString().slice(0, 10))}
                        {d.lastSentAt && ` · ostatnio ${dateShort(d.lastSentAt.toISOString().slice(0, 10))}`}
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
          <span className="underline decoration-hairline underline-offset-4 group-open:hidden">Pokaż diagnostykę</span>
          <span className="hidden underline decoration-hairline underline-offset-4 group-open:inline">Ukryj diagnostykę</span>
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
        <h2 className="heading text-lg">Kiedy przypominać</h2>
        <form action={updateReminderSettings} className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-ink">Przed płatnością</span>
              <span className="block text-sm text-muted">Ile dni wcześniej</span>
            </span>
            <select
              name="remindDaysBefore"
              defaultValue={daysBefore}
              className="rounded-full bg-canvas px-4 py-2 text-ink outline-none focus:ring-2 focus:ring-ink/10"
            >
              <option value={0}>nie przypominaj</option>
              {[1, 2, 3, 5, 7].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? "dzień" : "dni"} wcześniej
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-ink">W dniu płatności</span>
              <span className="block text-sm text-muted">Rano, w dniu terminu</span>
            </span>
            <Switch name="remindSameDay" defaultChecked={sameDay} label="W dniu płatności" />
          </label>
          <p className="text-xs text-muted">Przypomnienia wychodzą raz dziennie około 8–9 rano.</p>
          <button className={`${btn.secondary} self-start`}>Zapisz</button>
        </form>
      </section>

      <section className="flex flex-col gap-4 border-t border-hairline pt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="heading text-lg">Które subskrypcje</h2>
          <span className="text-sm text-muted">
            {onCount} z {live.length}
          </span>
        </div>
        <p className="-mt-2 text-sm text-muted">Włącz dla płatności, które robisz ręcznie — te automatyczne zwykle nie potrzebują przypomnień.</p>
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
