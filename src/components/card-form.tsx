"use client";

import { useActionState, useState, useTransition } from "react";
import { ShieldCheck } from "lucide-react";
import type { Card, PaymentMethodKind } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { BRANDS, detectBrand, formatExpiryInput, parseExpiry } from "@/lib/card-brand";
import { ColorPicker, Field, inputCls, Submit, submitWithoutReset } from "./form-bits";
import { CardThumb } from "./card-visual";
import { useI18n } from "./i18n-provider";

export function CardForm({ action, card }: { action: (p: FormState, fd: FormData) => Promise<FormState>; card?: Card | null }) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const e = state?.fieldErrors ?? {};
  const [kind, setKind] = useState<PaymentMethodKind>(card?.kind ?? "card");
  const isCard = kind === "card";
  const [name, setName] = useState(card?.name ?? "");
  const [brand, setBrand] = useState(card?.brand ?? "");
  const [last4, setLast4] = useState(card?.last4 ?? "");
  const [expiry, setExpiry] = useState(
    card?.expMonth && card?.expYear ? `${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}` : "",
  );
  const [color, setColor] = useState(card?.color ?? "forest");
  const [trimmedNotice, setTrimmedNotice] = useState(false);

  const exp = parseExpiry(expiry);
  // "Inne" is the stored value for "other network"; show it in the UI language.
  const brandLabel = (b: string) => (b === "Inne" ? t.cards.brandOther : b);
  const expiryError = expiry && !exp && expiry.replace(/\D/g, "").length >= 4 ? t.cards.expiryErr : undefined;

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
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-ink">{t.cards.kind}</legend>
        <input type="hidden" name="kind" value={kind} />
        <div className="inline-grid grid-cols-2 rounded-full bg-hairline/60 p-1">
          {(
            [
              ["card", t.cards.card],
              ["account", t.cards.bankAccount],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${kind === k ? "bg-paper text-ink shadow-card" : "text-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4 panel p-4">
        <CardThumb kind={kind} color={color} brand={isCard ? brand || null : null} last4={last4} width={128} />
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{name || (isCard ? t.cards.newCard : t.cards.newAccount)}</div>
          <div className="text-sm text-muted">
            {(isCard
              ? [[brandLabel(brand), last4 && `••${last4}`].filter(Boolean).join(" "), exp && `${String(exp.month).padStart(2, "0")}/${String(exp.year).slice(-2)}`]
              : [t.cards.bankAccount, last4 && `••${last4}`]
            )
              .filter(Boolean)
              .join(" · ") || t.cards.preview}
          </div>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-card bg-canvas px-4 py-3 text-sm text-ink">
        <ShieldCheck size={18} className="mt-0.5 shrink-0" />
        {isCard ? t.cards.safeCard : t.cards.safeAccount}
      </p>

      <Field label={t.common.name} hint={isCard ? t.cards.nameHintCard : t.cards.nameHintAccount} error={e.name}>
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

      <input type="hidden" name="brand" value={isCard ? brand : ""} />
      <fieldset className={isCard ? "flex flex-col gap-1.5" : "hidden"}>
        <legend className="mb-1.5 text-sm font-medium text-ink">{t.cards.type}</legend>
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
              {brandLabel(b)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label={isCard ? t.cards.last4 : t.cards.accountEnd} hint={isCard ? undefined : t.common.optional} error={e.last4}>
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
        <Field label={t.cards.validUntil} error={expiryError ?? e.expMonth ?? e.expYear} className={isCard ? "" : "invisible"}>
          <input
            inputMode="numeric"
            autoComplete="off"
            placeholder={t.cards.expiryPh}
            value={expiry}
            onChange={(ev) => setExpiry(formatExpiryInput(ev.target.value))}
            className={`${inputCls} tabular`}
            aria-invalid={!!expiryError}
          />
          <input type="hidden" name="expMonth" value={isCard ? (exp?.month ?? "") : ""} />
          <input type="hidden" name="expYear" value={isCard ? (exp?.year ?? "") : ""} />
        </Field>
      </div>
      {trimmedNotice && (
        <p className="-mt-3 text-sm text-muted">
          {t.cards.trimmed(brandLabel(brand))}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{t.common.color}</span>
        <ColorPicker name="color" value={color} onChange={setColor} />
      </div>
      {state?.error && <p className="rounded-card bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{state.error}</p>}
      <Submit pending={pending}>{card ? t.common.save : isCard ? t.cards.addCard : t.cards.addAccount}</Submit>
    </form>
  );
}
