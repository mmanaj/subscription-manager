"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import type { Card } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { BRANDS, detectBrand, formatExpiryInput, parseExpiry } from "@/lib/card-brand";
import { ColorPicker, Field, inputCls, Submit, submitWithoutReset } from "./form-bits";
import { CardThumb } from "./card-visual";

export function CardForm({ action, card }: { action: (p: FormState, fd: FormData) => Promise<FormState>; card?: Card | null }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const e = state?.fieldErrors ?? {};
  const [name, setName] = useState(card?.name ?? "");
  const [brand, setBrand] = useState(card?.brand ?? "");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [expiry, setExpiry] = useState(
    card?.expMonth && card?.expYear ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : "",
  );
  const [color, setColor] = useState(card?.color ?? "forest");
  const [trimmedNotice, setTrimmedNotice] = useState(false);

  const exp = parseExpiry(expiry);
  const expiryError = expiry && !exp && expiry.replace(/\D/g, "").length >= 4 ? "Np. 08/28" : undefined;

  // If a full card number lands here (paste/autofill), keep only the last 4 digits and use the
  // leading digits to detect the network — locally, before anything is submitted.
  function onLast4(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 4) {
      const detected = detectBrand(digits);
      if (detected) setBrand(detected);
      setTrimmedNotice(true);
    }
    setLast4(digits.slice(-4));
  }

  return (
    <form onSubmit={submitWithoutReset(formAction, startTransition)} className="flex max-w-xl flex-col gap-6">
      <div className="flex items-center gap-4 panel p-4">
        <CardThumb color={color} brand={brand || null} last4={last4} width={128} />
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{name || "Nowa karta"}</div>
          <div className="text-sm text-muted">
            {[[brand, last4 && `••${last4}`].filter(Boolean).join(" "), exp && `${String(exp.month).padStart(2, "0")}/${String(exp.year).slice(-2)}`]
              .filter(Boolean)
              .join(" · ") || "Podgląd"}
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-card bg-canvas px-4 py-3 text-sm text-ink">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        Wystarczą 4 ostatnie cyfry i data ważności. Pełnego numeru ani CVV nie podawaj — aplikacja ich nie potrzebuje i nie
        zapisuje.
      </p>

      <Field label="Nazwa" hint="np. mBank, Revolut, firmowa" error={e.name}>
        <input
          name="name"
          required
          autoComplete="off"
          value={name}
          onChange={(ev) => setName(ev.target.value)}
          className={inputCls}
          aria-invalid={!!e.name}
        />
      </Field>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-ink">Typ</legend>
        <input type="hidden" name="brand" value={brand} />
        <div className="flex flex-wrap gap-2">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={brand === b}
              onClick={() => setBrand(brand === b ? "" : b)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                brand === b ? "bg-ink text-paper" : "bg-canvas text-ink-soft hover:bg-canvas"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Ostatnie 4 cyfry" error={e.last4}>
          <input
            name="last4"
            inputMode="numeric"
            autoComplete="off"
            placeholder="1234"
            value={last4}
            onChange={(ev) => onLast4(ev.target.value)}
            className={`${inputCls} tabular tracking-widest`}
            aria-invalid={!!e.last4}
          />
        </Field>
        <Field label="Ważna do" error={expiryError ?? e.expMonth ?? e.expYear}>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/RR"
            value={expiry}
            onChange={(ev) => setExpiry(formatExpiryInput(ev.target.value))}
            className={`${inputCls} tabular`}
            aria-invalid={!!expiryError}
          />
          <input type="hidden" name="expMonth" value={exp?.month ?? ""} />
          <input type="hidden" name="expYear" value={exp?.year ?? ""} />
        </Field>
      </div>
      {trimmedNotice && (
        <p className="-mt-3 text-sm text-muted">
          Wygląda na pełny numer — zostawiłem tylko 4 ostatnie cyfry{brand ? ` i rozpoznałem: ${brand}` : ""}. Reszta nigdzie nie
          trafiła.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">Kolor</span>
        <ColorPicker name="color" value={color} onChange={setColor} />
      </div>
      {state?.error && <p className="rounded-card bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{state.error}</p>}
      <Submit pending={pending}>{card ? "Zapisz kartę" : "Dodaj kartę"}</Submit>
    </form>
  );
}
