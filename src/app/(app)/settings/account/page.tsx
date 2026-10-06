import { logout } from "@/app/actions";
import { PageHeader, btn } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { requireUser } from "@/lib/auth";
import { dateLong } from "@/lib/format";
import { DeleteAccount } from "./delete-account";

export const dynamic = "force-dynamic";
export const metadata = { title: "Konto" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <div className="flex max-w-2xl flex-col gap-12">
      <PageHeader title="Konto" back="/settings" />

      <section className="-mt-4 flex items-center gap-4">
        <UserAvatar user={user} size={56} />
        <div className="min-w-0">
          {user.name && <p className="truncate text-lg font-medium text-ink">{user.name}</p>}
          <p className="truncate text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-muted">Konto Google · od {dateLong(user.createdAt.toISOString().slice(0, 10))}</p>
        </div>
      </section>

      <p className="-mt-6 text-sm text-muted">
        Imię, e-mail i zdjęcie pochodzą z Twojego konta Google i odświeżają się przy każdym logowaniu.
      </p>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">Kopia danych</h2>
        <p className="text-muted">Wszystkie subskrypcje, karty, konta i kategorie jako JSON.</p>
        <a href="/api/export" className={`${btn.outline} self-start`}>
          Pobierz eksport
        </a>
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">Sesja</h2>
        <form action={logout}>
          <button className={btn.secondary}>Wyloguj</button>
        </form>
      </section>

      <section className="flex flex-col gap-3 border-t border-hairline pt-10">
        <h2 className="heading text-lg">Usunięcie konta</h2>
        <DeleteAccount email={user.email} />
      </section>
    </div>
  );
}
