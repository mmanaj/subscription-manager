"use client";

import { useActionState, useState, useTransition } from "react";
import type { Card, IntervalUnit, Subscription, SubscriptionScope } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { Avatar } from "./ui";
import { CategoryPicker } from "./category-picker";
import { Switch } from "./switch";
import { ColorPicker, Field, inputCls, Submit, submitWithoutReset } from "./form-bits";

const SCOPE_OPTIONS: { value: SubscriptionScope; label: string; hint: string }[] = [
  { value: "personal", label: "Prywatna", hint: "Płacę tylko za siebie" },
  { value: "shared", label: "Wspólna", hint: "Rodzinna / dzielona z kimś" },
  { value: "business", label: "Firmowa", hint: "Koszt firmy" },
];

const toNum = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

const PRESETS: { label: string; count: number; unit: IntervalUnit }[] = [
  { label: "Miesięcznie", count: 1, unit: "month" },
  { label: "Rocznie", count: 1, unit: "year" },
  { label: "Kwartalnie", count: 3, unit: "month" },
  { label: "Tygodniowo", count: 1, unit: "week" },
];

export function SubscriptionForm({
  action,
  sub,
  cards,
  categories,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  sub?: Subscription | null;
  cards: Card[];
  categories: string[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const e = state?.fieldErrors ?? {};
  const [name, setName] = useState(sub?.name ?? "");
  const [color, setColor] = useState(sub?.color ?? "forest");
  const [count, setCount] = useState(sub?.intervalCount ?? 1);
  const [unit, setUnit] = useState<IntervalUnit>(sub?.intervalUnit ?? "month");
  const [scope, setScope] = useState<SubscriptionScope>(sub?.scope ?? "personal");
  const initialAmount = sub ? String(sub.amount).replace(".", ",") : "";
  const [amount, setAmount] = useState(initialAmount);
  const [priceMode, setPriceMode] = useState<"change" | "fix">("change");
  const priceChanged = !!sub && amount.trim() !== "" && toNum(amount) !== Number(sub.amount);
  const [more, setMore] = useState(
    !!(sub?.trialEndDate || sub?.endDate || sub?.url || sub?.notes),
  );
  const presetActive = (p: (typeof PRESETS)[number]) => p.count === count && p.unit === unit;
  const custom = !PRESETS.some(presetActive);

  return (
    <form onSubmit={submitWithoutReset(formAction, startTransition)} className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center gap-4">
        <Avatar name={name || "?"} color={color} size={56} />
        <Field label="Nazwa" error={e.name} className="flex-1">
          <input
            name="name"
            required
            autoComplete="off"
            placeholder="np. Netflix"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            aria-invalid={!!e.name}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Kwota (całość)" error={e.amount}>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="49,99"
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            aria-invalid={!!e.amount}
            className={`${inputCls} tabular text-lg font-medium`}
          />
        </Field>
        <Field label="Waluta">
          <select name="currency" defaultValue={sub?.currency ?? "PLN"} className={inputCls}>
            {["PLN", "EUR", "USD", "GBP", "CHF"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      {priceChanged && (
        <div className="-mt-3 flex flex-col gap-3 rounded-card bg-canvas p-4">
          <input type="hidden" name="priceMode" value={priceMode} />
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["change", "Cena się zmieniła"],
                ["fix", "Poprawiam błąd"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setPriceMode(v)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  priceMode === v ? "bg-ink text-paper" : "bg-paper text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {priceMode === "change" ? (
            <Field label="Nowa cena obowiązuje od" hint="Stara cena zostanie w historii. Może być data w przyszłości.">
              <input name="priceFrom" type="date" defaultValue={new Intl.DateTimeFormat("en-CA").format(new Date())} className={inputCls} />
            </Field>
          ) : (
            <p className="text-sm text-ink">Kwota zostanie nadpisana bez wpisu w historii cen.</p>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Czyja</legend>
        <input type="hidden" name="scope" value={scope} />
        <div className="grid grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={scope === o.value}
              onClick={() => setScope(o.value)}
              className={`flex flex-col items-start rounded-card px-3 py-2.5 text-left transition ${
                scope === o.value ? "bg-ink text-paper" : "bg-canvas text-ink-soft hover:bg-canvas"
              }`}
            >
              <span className="text-sm font-medium">{o.label}</span>
              <span className="text-[11px] leading-tight opacity-75">{o.hint}</span>
            </button>
          ))}
        </div>
        {scope === "shared" ? (
          <Field label="Dzielę koszt na (osób)" hint="Np. plan rodzinny na 4 — do sum liczy się 1/4 kwoty" error={e.splitWith} className="mt-2">
            <input name="splitWith" type="number" min={1} max={20} inputMode="numeric" defaultValue={sub?.splitWith ?? 1} className={`${inputCls} w-24`} />
          </Field>
        ) : (
          <input type="hidden" name="splitWith" value="1" />
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">Odnawia się</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => {
                setCount(p.count);
                setUnit(p.unit);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                presetActive(p) ? "bg-ink text-paper" : "bg-canvas text-ink-soft hover:bg-canvas"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-sm ${custom ? "font-medium text-ink" : "text-muted"}`}>co</span>
          <input
            name="intervalCount"
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            value={count}
            onChange={(ev) => setCount(Math.max(1, Number(ev.target.value) || 1))}
            className={`${inputCls} w-20 text-center`}
          />
          <select name="intervalUnit" value={unit} onChange={(ev) => setUnit(ev.target.value as IntervalUnit)} className={`${inputCls} w-auto`}>
            <option value="day">dni</option>
            <option value="week">tyg.</option>
            <option value="month">mies.</option>
            <option value="year">lat</option>
          </select>
        </div>
        {e.intervalCount && <span className="text-sm text-ember">{e.intervalCount}</span>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Dzień płatności" hint="np. najbliższa" error={e.firstBillingDate}>
          <input name="firstBillingDate" type="date" defaultValue={sub?.firstBillingDate ?? ""} className={inputCls} aria-invalid={!!e.firstBillingDate} />
        </Field>
        <Field label="Od kiedy" hint="opcjonalnie" error={e.startDate}>
          <input name="startDate" type="date" defaultValue={sub?.startDate ?? ""} className={inputCls} />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted">
        Wystarczy jedna z dat. Kolejne płatności liczę od dnia płatności; data startu dolicza historię wstecz.
      </p>

      <Field label="Płatność" error={e.cardId}>
        <select name="cardId" defaultValue={sub?.cardId ?? ""} className={inputCls}>
          <option value="">— brak —</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.last4 ? ` ••${c.last4}` : ""}
              {c.kind === "account" ? " (konto)" : ""}
            </option>
          ))}
        </select>
      </Field>

      <CategoryPicker name="category" initial={sub?.category ?? null} options={categories} />

      <div className="divide-y divide-hairline rounded-[var(--radius-field)] bg-canvas px-4">
        <label className="flex items-start justify-between gap-4 py-4">
          <span>
            <span className="block text-sm font-medium text-ink">Płacę ręcznie</span>
            <span className="mt-0.5 block text-xs text-muted">
              Przelew lub płatność, której nie pobiera karta. Każdą płatność odhaczasz jako opłaconą.
            </span>
          </span>
          <Switch name="manual" defaultChecked={sub?.manual ?? false} label="Płacę ręcznie" />
        </label>
        <label className="flex items-start justify-between gap-4 py-4">
          <span>
            <span className="block text-sm font-medium text-ink">Przypominaj o płatności</span>
            <span className="mt-0.5 block text-xs text-muted">
              Powiadomienie push przed terminem i w dniu płatności. Ustawienia w Więcej → Powiadomienia.
            </span>
          </span>
          <Switch name="notify" defaultChecked={sub?.notify ?? false} label="Przypominaj o płatności" />
        </label>
      </div>

      <Field label="Status">
        <select name="status" defaultValue={sub?.status ?? "active"} className={inputCls}>
          <option value="active">Aktywna</option>
          <option value="paused">Wstrzymana</option>
          <option value="cancelled">Anulowana</option>
        </select>
      </Field>

      <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-sm font-medium text-ink underline decoration-2 underline-offset-4 hover:decoration-ink/30">
        {more ? "Mniej opcji" : "Więcej opcji: koniec, okres próbny, link, notatki…"}
      </button>

      <div className={more ? "flex flex-col gap-6" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Do kiedy" hint="Puste = odnawia się bez końca" error={e.endDate}>
            <input name="endDate" type="date" defaultValue={sub?.endDate ?? ""} className={inputCls} aria-invalid={!!e.endDate} />
          </Field>
          <Field label="Koniec okresu próbnego" hint="Pierwsza płatność tego dnia" error={e.trialEndDate}>
            <input name="trialEndDate" type="date" defaultValue={sub?.trialEndDate ?? ""} className={inputCls} />
          </Field>
        </div>
        <Field label="Link do zarządzania / anulowania" error={e.url}>
          <input name="url" type="url" inputMode="url" placeholder="https://" defaultValue={sub?.url ?? ""} className={inputCls} aria-invalid={!!e.url} />
        </Field>
        <Field label="Notatki">
          <textarea name="notes" rows={3} defaultValue={sub?.notes ?? ""} className={inputCls} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Kolor</span>
          <ColorPicker name="color" value={color} onChange={setColor} />
        </div>
      </div>

      {state?.error && <p className="rounded-card bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{state.error}</p>}
      <div>
        <Submit pending={pending}>{sub ? "Zapisz zmiany" : "Dodaj subskrypcję"}</Submit>
      </div>
    </form>
  );
}
