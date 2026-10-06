import { saveSubscription } from "@/app/actions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/ui";
import { listCategories } from "@/lib/categories";
import { listCards } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nowa subskrypcja" };

export default async function NewSubscription() {
  const user = await requireUser();
  const [cards, categories] = await Promise.all([listCards(user.id), listCategories(user.id)]);
  return (
    <div>
      <PageHeader title="Nowa" back="/subscriptions" />
      <SubscriptionForm action={saveSubscription.bind(null, null)} cards={cards} categories={categories} />
    </div>
  );
}
