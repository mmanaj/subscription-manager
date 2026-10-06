import { notFound } from "next/navigation";
import { saveSubscription } from "@/app/actions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { listCategories } from "@/lib/categories";
import { getRawSubscription, listCards } from "@/lib/data";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.form.editTitle };
}

export default async function EditSubscription(props: PageProps<"/subscriptions/[id]/edit">) {
  const id = Number((await props.params).id);
  const [sub, cards, categories, { t }] = await Promise.all([getRawSubscription(id), listCards(), listCategories(), getI18n()]);
  if (!sub) notFound();
  return (
    <div>
      <PageHeader title={t.form.editTitle} back={`/subscriptions/${id}`} />
      <SubscriptionForm action={saveSubscription.bind(null, id)} sub={sub} cards={cards} categories={categories} />
    </div>
  );
}
