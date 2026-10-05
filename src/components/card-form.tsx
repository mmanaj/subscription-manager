"use client";

import { useActionState, useState } from "react";
import type { Card } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { ColorPicker, Field, inputCls, Submit } from "./form-bits";
import { CardVisual } from "./card-visual";

export function CardForm({ action, card }: { action: (p: FormState, fd: FormData) => Promise<FormState>; card?: Card | null }) {
  const [state, formAction] = useActionState(action, undefined);
  const e = state?.fieldErrors ?? {};
  const [preview, setPreview] = useState({
    name: card?.name ?? "",
    brand: card?.brand ?? "",
    last4: card?.last4 ?? "",
    expMonth: card?.expMonth ?? null,
    expYear: card?.expYear ?? null,
    color: card?.color ?? "forest",
  });
  const set = (k: keyof typeof preview) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setPreview((p) => ({ ...p, [k]: ev.target.value }));

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <CardVisual card={{ ...preview, expMonth: Number(preview.expMonth) || null, expYear: Number(preview.expYear) || null }} />
      <Field label="Nazwa" hint="np. mBank Visa, Revolut" error={e.name}>
        <input name="name" required defaultValue={card?.name ?? ""} onChange={set("name")} className={inputCls} aria-invalid={!!e.name} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Typ">
          <select name="brand" defaultValue={card?.brand ?? ""} onChange={set("brand")} className={inputCls}>
            <option value="">—</option>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
            <option>PayPal</option>
            <option>BLIK</option>
            <option>Inne</option>
          </select>
        </Field>
        <Field label="Ostatnie 4 cyfry" error={e.last4}>
          <input name="last4" inputMode="numeric" maxLength={4} pattern="\d{4}" defaultValue={card?.last4 ?? ""} onChange={set("last4")} className={`${inputCls} tabular`} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ważna do — miesiąc" error={e.expMonth}>
          <input name="expMonth" type="number" min={1} max={12} inputMode="numeric" placeholder="MM" defaultValue={card?.expMonth ?? ""} onChange={set("expMonth")} className={inputCls} />
        </Field>
        <Field label="Rok" error={e.expYear}>
          <input name="expYear" type="number" min={2000} max={2100} inputMode="numeric" placeholder="RRRR" defaultValue={card?.expYear ?? ""} onChange={set("expYear")} className={inputCls} />
        </Field>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-obsidian">Kolor</span>
        <ColorPicker name="color" value={preview.color} onChange={(c) => setPreview((p) => ({ ...p, color: c }))} />
      </div>
      {state?.error && <p className="rounded-card bg-alarm/10 px-4 py-3 text-sm font-semibold text-alarm">{state.error}</p>}
      <Submit>{card ? "Zapisz kartę" : "Dodaj kartę"}</Submit>
    </form>
  );
}
