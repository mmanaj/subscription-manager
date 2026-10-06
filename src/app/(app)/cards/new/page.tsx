import { saveCard } from "@/app/actions";
import { CardForm } from "@/components/card-form";
import { PageHeader } from "@/components/page-header";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.cards.newMeta };
}

export default async function NewCard() {
  const { t } = await getI18n();
  return (
    <div>
      <PageHeader title={t.cards.newTitle} back="/cards" />
      <CardForm action={saveCard.bind(null, null)} />
    </div>
  );
}
