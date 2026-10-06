import Link from "next/link";
import { getI18n } from "@/lib/i18n/server";

export async function PageHeader({ title, back, action }: { title: React.ReactNode; back?: string; action?: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <header className="mb-8 flex flex-col gap-2 sm:mb-10">
      {back && (
        <Link href={back} className="text-sm text-muted hover:text-ink">
          {t.common.back}
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="heading text-3xl sm:text-4xl">{title}</h1>
        {action}
      </div>
    </header>
  );
}
