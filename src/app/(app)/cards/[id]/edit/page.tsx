import { notFound } from "next/navigation";
import { deleteCard, saveCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/ui";
import { getCard } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Karta" };

export default async function EditCard(props: PageProps<"/cards/[id]/edit">) {
  const id = Number((await props.params).id);
  const card = await getCard(id);
  if (!card) notFound();
  return (
    <div>
      <PageHeader title="Karta" back="/cards" />
      <CardForm action={saveCard.bind(null, id)} card={card} />
      <ConfirmButton
        action={deleteCard.bind(null, id)}
        confirm="Usunąć kartę? Subskrypcje zostaną, tylko bez przypisanej karty."
        className="mt-8 text-sm font-semibold text-alarm underline underline-offset-4"
      >
        Usuń kartę
      </ConfirmButton>
    </div>
  );
}
