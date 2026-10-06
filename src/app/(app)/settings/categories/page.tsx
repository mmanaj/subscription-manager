import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { categoryUsage, listCategories } from "@/lib/categories";
import { CategoryRow } from "./category-row";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.settings.categories };
}

export default async function CategoriesPage() {
  const [names, usage, { t }] = await Promise.all([listCategories(), categoryUsage(), getI18n()]);
  return (
    <div className="max-w-2xl">
      <PageHeader title={t.settings.categories} back="/settings" />
      <p className="mb-6 text-sm text-muted">{t.categories.hint}</p>
      <ul className="divide-y divide-hairline border-y border-hairline">
        {names.map((n) => (
          <CategoryRow key={n} name={n} count={usage.get(n) ?? 0} />
        ))}
      </ul>
    </div>
  );
}
