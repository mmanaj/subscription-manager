import { notFound } from "next/navigation";
import { saveSubscription } from "@/app/actions";
import { SubscriptionForm } from "@/components/subscription-form";
import { PageHeader } from "@/components/ui";
import { listCategories } from "@/lib/categories";
import { getRawSubscription, listCards } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edycja" };

export default async function EditSubscription(props: PageProps<"/subscriptions/[id]/edit">) {
  const id = Number((await props.params).id);
  const user = await requireUser();
  const [sub, cards, categories] = await Promise.all([getRawSubscription(user.id, id), listCards(user.id), listCategories(user.id)]);
  if (!sub) notFound();
  return (
    <div>
      <PageHeader title="Edycja" back={`/subscriptions/${id}`} />
      <SubscriptionForm action={saveSubscription.bind(null, id)} sub={sub} cards={cards} categories={categories} />
    </div>
  );
}
