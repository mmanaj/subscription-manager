import { notFound } from "next/navigation";
import { saveSubscription } from "@/app/actions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/ui";
import { usedCategories } from "@/lib/categories";
import { getRawSubscription, listCards } from "@/lib/data";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edycja" };

export default async function EditSubscription(props: PageProps<"/subscriptions/[id]/edit">) {
  const id = Number((await props.params).id);
  const [sub, cards, categories] = await Promise.all([getRawSubscription(id), listCards(), usedCategories()]);
  if (!sub) notFound();
  return (
    <div>
      <PageHeader title="Edycja" back={`/subscriptions/${id}`} />
      <SubscriptionForm action={saveSubscription.bind(null, id)} sub={sub} cards={cards} today={today()} categories={categories} />
    </div>
  );
}
