import { saveCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nowa karta" };

export default function NewCard() {
  return (
    <div>
      <PageHeader title="Nowa karta" back="/cards" />
      <CardForm action={saveCard.bind(null, null)} />
    </div>
  );
}
