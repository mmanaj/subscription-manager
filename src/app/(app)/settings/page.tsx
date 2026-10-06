import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { logout } from "@/app/actions";
import { btn } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { CopyField } from "./copy-field";
import { LanguagePicker } from "./language-picker";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.settings.title };
}

export default async function SettingsPage() {
  const [h, { t, locale }] = await Promise.all([headers(), getI18n()]);
  const s = t.settings;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const token = process.env.ICS_TOKEN;
  const icsUrl = token ? `${proto}://${host}/api/calendar/${token}` : null;

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title={s.title} />

      <ul className="divide-y divide-hairline border-y border-hairline">
        {[
          { href: "/settings/notifications", title: s.notifications, sub: s.notificationsSub },
          { href: "/settings/categories", title: s.categories, sub: s.categoriesSub },
        ].map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="-mx-3 flex items-center justify-between rounded-[var(--radius-field)] px-3 py-4 transition-colors hover:bg-surface-alt"
            >
              <span>
                <span className="block font-medium text-ink">{l.title}</span>
                <span className="block text-sm text-muted">{l.sub}</span>
              </span>
              <ChevronRight className="text-muted" size={18} />
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="heading text-lg">{s.language}</h2>
        <p className="text-muted">{s.languageHint}</p>
        <LanguagePicker current={locale} />
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">{s.calendarTitle}</h2>
        <p className="text-muted">{s.calendarBody}</p>
        {icsUrl ? (
          <>
            <CopyField value={icsUrl} />
            <a href={icsUrl.replace(/^https?:/, "webcal:")} className={btn.link}>
              {s.openInCalendar}
            </a>
          </>
        ) : (
          <p className="rounded-[var(--radius-field)] bg-canvas p-4 text-sm text-ink">
            {s.icsMissing[0]} <code className="font-medium">ICS_TOKEN</code> {s.icsMissing[1]}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">{s.exportTitle}</h2>
        <p className="text-muted">{s.exportBody}</p>
        <a href="/api/export" className={`${btn.outline} self-start`}>
          {s.exportDownload}
        </a>
      </section>

      <form action={logout}>
        <button className={btn.secondary}>{s.logout}</button>
      </form>
    </div>
  );
}
