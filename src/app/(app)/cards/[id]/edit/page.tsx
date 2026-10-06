import { notFound } from "next/navigation";
import { deleteCard, saveCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";
import { getCard } from "@/lib/data";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.cards.editMeta };
}

export default async function EditCard(props: PageProps<"/cards/[id]/edit">) {
  const id = Number((await props.params).id);
  const [card, { t }] = await Promise.all([getCard(id), getI18n()]);
  if (!card) notFound();
  return (
    <div>
      <PageHeader title={card.kind === "account" ? t.cards.account : t.cards.card} back="/cards" />
      <CardForm action={saveCard.bind(null, id)} card={card} />
      <ConfirmButton
        action={deleteCard.bind(null, id)}
        confirm={t.cards.deleteConfirm}
        className="mt-8 text-sm font-medium text-ember underline underline-offset-4"
      >
        {t.common.delete}
      </ConfirmButton>
    </div>
  );
}
