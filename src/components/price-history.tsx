"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addPriceChange, deletePriceChange, type FormState } from "@/app/actions";
import { dateLong } from "@/lib/format";
import { pctChange } from "@/lib/price";
import { Field, inputCls, Submit, submitWithoutReset } from "./form-bits";

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
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(addPriceChange.bind(null, subId), undefined as FormState);
  const [, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const e = state?.fieldErrors ?? {};
  const fmt = (n: number) =>
    new Intl.NumberFormat("pl-PL", { style: "currency", currency, minimumFractionDigits: 2 }).format(n / split);

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
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="heading text-2xl">Historia ceny</h2>
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="inline-flex items-center gap-1 rounded-full border border-forest px-4 py-2 text-sm font-semibold text-forest transition hover:bg-mist"
        >
          <Plus size={16} strokeWidth={2.5} /> Zmiana ceny
        </button>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-slate">Bez zmian. Gdy serwis zmieni cenę albo ją zapowie, dodaj ją tutaj — przeliczę historię i przyszłe płatności.</p>
      ) : (
        <>
          {total !== 0 && (
            <p className="mb-3 text-sm text-slate">
              Od początku: <span className="font-semibold text-obsidian">{fmt(first!.oldAmount)}</span> →{" "}
              <span className="font-semibold text-obsidian">{fmt(last!.newAmount)}</span> ({total > 0 ? "+" : ""}
              {total.toFixed(0)}%)
            </p>
          )}
          <ol className={`relative ml-2 border-l-2 border-fog ${deleting ? "opacity-50" : ""}`}>
            {rows.map((ev) => {
              const pct = pctChange(ev.oldAmount, ev.newAmount);
              const future = ev.effectiveDate > today;
              return (
                <li key={ev.id} className="relative mb-4 pl-5">
                  <span
                    className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full ring-4 ring-paper ${future ? "bg-lime" : "bg-forest"}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm text-slate">
                        {future ? "od " : ""}
                        {dateLong(ev.effectiveDate)}
                        {future && <span className="ml-2 rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-forest">zapowiedziana</span>}
                      </div>
                      <div className="tabular font-semibold text-obsidian">
                        {fmt(ev.oldAmount)} → {fmt(ev.newAmount)}{" "}
                        <span className={pct > 0 ? "text-alarm" : "text-spruce"}>
                          {pct > 0 ? "+" : ""}
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Usuń zmianę z ${ev.effectiveDate}`}
                      onClick={() => {
                        if (window.confirm("Usunąć tę zmianę ceny z historii?"))
                          startDelete(() => deletePriceChange(subId, ev.id));
                      }}
                      className="rounded-full p-2 text-pebble hover:bg-fog hover:text-alarm"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
            <li className="relative pl-5">
              <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full bg-pebble ring-4 ring-paper" />
              <div className="text-sm text-slate">{startDate ? `start · ${dateLong(startDate)}` : "cena początkowa"}</div>
              <div className="tabular font-semibold text-obsidian">{fmt(first!.oldAmount)}</div>
            </li>
          </ol>
        </>
      )}

      <dialog
        ref={dialog}
        className="m-0 mt-auto w-full max-w-none rounded-t-large bg-paper p-6 pb-10 text-charcoal backdrop:bg-obsidian/50 sm:m-auto sm:max-w-md sm:rounded-large sm:pb-6"
        onClick={(ev) => ev.target === dialog.current && dialog.current?.close()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="heading text-[28px]">Zmiana ceny</h2>
          <button type="button" aria-label="Zamknij" onClick={() => dialog.current?.close()} className="rounded-full p-2 hover:bg-fog">
            <X size={22} />
          </button>
        </div>
        <form ref={form} onSubmit={submitWithoutReset(action, startTransition)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Od kiedy" error={e.date}>
              <input name="date" type="date" required defaultValue={today} className={inputCls} />
            </Field>
            <Field label={`Nowa cena (${currency})`} hint={split > 1 ? "całość, przed podziałem" : undefined} error={e.amount}>
              <input name="amount" required inputMode="decimal" placeholder="49,99" className={`${inputCls} tabular`} />
            </Field>
          </div>
          <p className="text-xs text-slate">Data w przyszłości = zapowiedziana podwyżka. Do tego dnia płatności liczą się po starej cenie.</p>
          {state?.error && <p className="text-sm font-semibold text-alarm">{state.error}</p>}
          <Submit pending={pending}>Zapisz zmianę</Submit>
        </form>
      </dialog>
    </section>
  );
}
