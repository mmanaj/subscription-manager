import Link from "next/link";
import { headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { logout } from "@/app/actions";
import { PageHeader, btn } from "@/components/ui";
import { CopyField } from "./copy-field";

export const dynamic = "force-dynamic";
export const metadata = { title: "Więcej" };

export default async function SettingsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const token = process.env.ICS_TOKEN;
  const icsUrl = token ? `${proto}://${host}/api/calendar/${token}` : null;

  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title="Więcej" />

      <Link href="/settings/categories" className="-mx-3 flex items-center justify-between rounded-[var(--radius-field)] border-y border-hairline px-3 py-4 transition hover:bg-surface-alt">
        <span>
          <span className="block font-medium text-ink">Kategorie</span>
          <span className="block text-sm text-muted">Zmień nazwę lub usuń</span>
        </span>
        <ChevronRight className="text-ink" />
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="heading text-lg">Przypomnienia w kalendarzu</h2>
        <p className="text-muted">
          Subskrybuj ten adres w Kalendarzu Apple / Google. Każda płatność pojawi się jako wydarzenie z przypomnieniem dzień
          wcześniej — bez instalowania czegokolwiek.
        </p>
        {icsUrl ? (
          <>
            <CopyField value={icsUrl} />
            <a href={icsUrl.replace(/^https?:/, "webcal:")} className={btn.link}>
              Otwórz w kalendarzu (iPhone)
            </a>
          </>
        ) : (
          <p className="rounded-[var(--radius-field)] bg-canvas p-4 text-sm text-ink">
            Ustaw zmienną <code className="font-medium">ICS_TOKEN</code> w Vercelu, żeby włączyć kalendarz.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">Kopia danych</h2>
        <p className="text-muted">Wszystkie subskrypcje i karty jako JSON.</p>
        <a href="/api/export" className={`${btn.outline} self-start`}>
          Pobierz eksport
        </a>
      </section>

      <form action={logout}>
        <button className={btn.secondary}>Wyloguj</button>
      </form>
    </div>
  );
}
