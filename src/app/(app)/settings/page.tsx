import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { resetCalendarLink } from "@/app/actions";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader, btn } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { requireUser } from "@/lib/auth";
import { CopyField } from "./copy-field";

export const dynamic = "force-dynamic";
export const metadata = { title: "Więcej" };

export default async function SettingsPage() {
  const user = await requireUser();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const icsUrl = `${proto}://${host}/api/calendar/${user.icsToken}`;

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title="Więcej" />

      <ul className="divide-y divide-hairline border-y border-hairline">
        <li>
          <Link
            href="/settings/account"
            className="-mx-3 flex items-center gap-3 rounded-[var(--radius-field)] px-3 py-4 transition-colors hover:bg-surface-alt"
          >
            <UserAvatar user={user} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-ink">{user.name ?? "Konto"}</span>
              <span className="block truncate text-sm text-muted">{user.email}</span>
            </span>
            <ChevronRight className="text-muted" size={18} />
          </Link>
        </li>
        {[
          { href: "/settings/notifications", title: "Powiadomienia", sub: "Przypomnienia push o płatnościach" },
          { href: "/settings/categories", title: "Kategorie", sub: "Zmień nazwę lub usuń" },
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
        <h2 className="heading text-lg">Przypomnienia w kalendarzu</h2>
        <p className="text-muted">
          Subskrybuj ten adres w Kalendarzu Apple / Google. Każda płatność pojawi się jako wydarzenie z przypomnieniem dzień
          wcześniej — bez instalowania czegokolwiek.
        </p>
        <CopyField value={icsUrl} />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a href={icsUrl.replace(/^https?:/, "webcal:")} className={btn.link}>
            Otwórz w kalendarzu (iPhone)
          </a>
          <ConfirmButton
            action={resetCalendarLink}
            confirm="Wygenerować nowy adres? Stary przestanie działać — trzeba będzie dodać kalendarz ponownie."
            className="text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
          >
            Nowy adres
          </ConfirmButton>
        </div>
        <p className="text-xs text-muted">Adres jest prywatny — kto go zna, widzi Twoje płatności.</p>
      </section>
    </div>
  );
}
