"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addPriceChange, deletePriceChange, type FormState } from "@/app/actions";
import { pctChange } from "@/lib/price";
import { Field, inputCls, Submit, submitWithoutReset } from "./form-bits";
import { useI18n } from "./i18n-provider";

type Event = { id: number; effectiveDate: string; oldAmount: number; newAmount: number };

export function PriceHistory({
  subId,
  events,
  currency,
  split,
  today,
  startDate,
}: {
  subId: number;
  events: Event[];
  currency: string;
  split: number;
  today: string;
  startDate: string | null;
}) {
  const { t, f } = useI18n();
  const { dateLong } = f;
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addPriceChange.bind(null, subId), undefined as FormState);
  const [, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const e = state?.fieldErrors ?? {};
  const fmt = (n: number) => f.money(n / split, currency);

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      dialog.current?.close();
    }
  }, [state]);

  const first = events[0];
  const last = events.at(-1);
  const total = first && last ? pctChange(first.oldAmount, last.newAmount) : 0;
  // Newest first reads best as a timeline.
  const rows = [...events].reverse();

  return (
    <section className="border-t border-hairline pt-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="heading text-lg">{t.price.title}</h2>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="inline-flex h-8 items-center gap-1 rounded-full border border-hairline px-3 text-sm font-medium text-ink transition hover:bg-canvas"
        >
          <Plus size={16} strokeWidth={2.5} /> {t.price.change}
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted">{t.price.empty}</p>
      ) : (
        <>
          {total !== 0 && (
            <p className="mb-3 text-sm text-muted">
              {t.price.sinceStart} <span className="font-medium text-ink">{fmt(first!.oldAmount)}</span> →{" "}
              <span className="font-medium text-ink">{fmt(last!.newAmount)}</span> ({total > 0 ? "+" : ""}
              {total.toFixed(0)}%)
            </p>
          )}
          <ol className={`relative ml-2 border-l-2 border-hairline ${deleting ? "opacity-50" : ""}`}>
            {rows.map((ev) => {
              const pct = pctChange(ev.oldAmount, ev.newAmount);
              const future = ev.effectiveDate > today;
              return (
                <li key={ev.id} className="relative mb-4 pl-5">
                  <span
                    className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${future ? "bg-paper ring-ink" : "bg-ink"}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-muted">
                        {future ? t.price.from : ""}
                        {dateLong(ev.effectiveDate)}
                        {future && <span className="ml-2 rounded-full px-2 py-0.5 text-xs font-medium text-ink shadow-hairline">{t.price.announced}</span>}
                      </div>
                      <div className="tabular font-medium text-ink">
                        {fmt(ev.oldAmount)} → {fmt(ev.newAmount)}{" "}
                        <span className="text-muted">
                          {pct > 0 ? "+" : ""}
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={t.price.deleteAria(dateLong(ev.effectiveDate))}
                      onClick={() => {
                        if (window.confirm(t.price.deleteConfirm))
                          startDelete(() => deletePriceChange(subId, ev.id));
                      }}
                      className="rounded-full p-2 text-muted hover:bg-canvas hover:text-ember"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
            <li className="relative pl-5">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-muted ring-4 ring-paper" />
              <div className="text-sm text-muted">{startDate ? t.price.start(dateLong(startDate)) : t.price.initial}</div>
              <div className="tabular font-medium text-ink">{fmt(first!.oldAmount)}</div>
            </li>
          </ol>
        </>
      )}

      <dialog
        ref={dialog}
        className="sheet m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-ink-soft sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(ev) => ev.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-xl">{t.price.change}</h2>
          <button type="button" aria-label={t.common.close} onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-canvas">
            <X size={22} />
          </button>
        </div>
        <form ref={form} onSubmit={submitWithoutReset(action, startTransition)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t.price.date} error={e.date}>
              <input name="date" type="date" required defaultValue={today} className={inputCls} />
            </Field>
            <Field label={t.price.newPrice(currency)} hint={split > 1 ? t.price.beforeSplit : undefined} error={e.amount}>
              <input name="amount" required inputMode="decimal" placeholder={t.form.amountPh} className={`${inputCls} tabular`} />
            </Field>
          </div>
          <p className="text-xs text-muted">{t.price.futureNote}</p>
          {state?.error && <p className="text-sm font-medium text-ember">{state.error}</p>}
          <Submit pending={pending}>{t.price.save}</Submit>
        </form>
      </dialog>
    </section>
  );
}
