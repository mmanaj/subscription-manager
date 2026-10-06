import { notFound } from "next/navigation";
import { deleteCard, saveCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/ui";
import { getCard } from "@/lib/data";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Metoda płatności" };

export default async function EditCard(props: PageProps<"/cards/[id]/edit">) {
  const id = Number((await props.params).id);
  const user = await requireUser();
  const card = await getCard(user.id, id);
  if (!card) notFound();
  return (
    <div>
      <PageHeader title={card.kind === "account" ? "Konto" : "Karta"} back="/cards" />
      <CardForm action={saveCard.bind(null, id)} card={card} />
      <ConfirmButton
        action={deleteCard.bind(null, id)}
        confirm="Usunąć? Subskrypcje zostaną, tylko bez przypisanej płatności."
        className="mt-8 text-sm font-medium text-ember underline underline-offset-4"
      >
        Usuń
      </ConfirmButton>
    </div>
  );
}
