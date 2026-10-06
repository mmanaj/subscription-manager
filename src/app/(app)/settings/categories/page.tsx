import { PageHeader } from "@/components/ui";
import { categoryUsage, listCategories } from "@/lib/categories";
import { CategoryRow } from "./category-row";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kategorie" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const [names, usage] = await Promise.all([listCategories(user.id), categoryUsage(user.id)]);
  return (
    <div className="max-w-2xl">
      <PageHeader title="Kategorie" back="/settings" />
      <p className="mb-6 text-sm text-muted">
        Nowe dodajesz przy subskrypcji przyciskiem „+ Nowa”. Zmiana nazwy na już istniejącą połączy obie kategorie.
      </p>
      <ul className="divide-y divide-hairline border-y border-hairline">
        {names.map((n) => (
          <CategoryRow key={n} name={n} count={usage.get(n) ?? 0} />
        ))}
      </ul>
    </div>
  );
}
