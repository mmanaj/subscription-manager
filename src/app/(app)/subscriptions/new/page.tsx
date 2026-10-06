import { saveSubscription } from "@/app/actions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { listCategories } from "@/lib/categories";
import { listCards } from "@/lib/data";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.form.newMeta };
}

export default async function NewSubscription() {
  const [cards, categories, { t }] = await Promise.all([listCards(), listCategories(), getI18n()]);
  return (
    <div>
      <PageHeader title={t.form.newTitle} back="/subscriptions" />
      <SubscriptionForm action={saveSubscription.bind(null, null)} cards={cards} categories={categories} />
    </div>
  );
}
