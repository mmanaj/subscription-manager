"use client";

import { useActionState, useState } from "react";
import type { Card, IntervalUnit, Subscription } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { Avatar } from "./ui";
import { ColorPicker, Field, inputCls, Submit } from "./form-bits";

const PRESETS: { label: string; count: number; unit: IntervalUnit }[] = [
  { label: "Miesięcznie", count: 1, unit: "month" },
  { label: "Rocznie", count: 1, unit: "year" },
  { label: "Kwartalnie", count: 3, unit: "month" },
  { label: "Tygodniowo", count: 1, unit: "week" },
];

const CATEGORIES = ["Streaming", "Muzyka", "Oprogramowanie", "AI", "Chmura", "Gry", "Telefon i internet", "Sport", "Prasa", "Edukacja", "Ubezpieczenie", "Inne"];

export function SubscriptionForm({
  action,
  sub,
  cards,
  today,
  categories,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  sub?: Subscription | null;
  cards: Card[];
  today: string;
  categories: string[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const e = state?.fieldErrors ?? {};
  const [name, setName] = useState(sub?.name ?? "");
  const [color, setColor] = useState(sub?.color ?? "forest");
  const [count, setCount] = useState(sub?.intervalCount ?? 1);
  const [unit, setUnit] = useState<IntervalUnit>(sub?.intervalUnit ?? "month");
  const [more, setMore] = useState(
    !!(sub?.firstBillingDate || sub?.trialEndDate || sub?.endDate || (sub?.splitWith ?? 1) > 1 || sub?.url || sub?.notes),
  );
  const presetActive = (p: (typeof PRESETS)[number]) => p.count === count && p.unit === unit;
  const custom = !PRESETS.some(presetActive);
  const allCats = [...new Set([...categories, ...CATEGORIES])];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
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
            defaultValue={sub ? String(sub.amount).replace(".", ",") : ""}
            aria-invalid={!!e.amount}
            className={`${inputCls} tabular text-lg font-semibold`}
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

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-obsidian">Odnawia się</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.label}
              onClick={() => {
                setCount(p.count);
                setUnit(p.unit);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                presetActive(p) ? "bg-lime text-forest" : "bg-fog text-charcoal hover:bg-mist"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-sm ${custom ? "font-semibold text-forest" : "text-slate"}`}>co</span>
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
        {e.intervalCount && <span className="text-sm text-alarm">{e.intervalCount}</span>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Od kiedy" error={e.startDate}>
          <input name="startDate" type="date" required defaultValue={sub?.startDate ?? today} className={inputCls} />
        </Field>
        <Field label="Karta" error={e.cardId}>
          <select name="cardId" defaultValue={sub?.cardId ?? ""} className={inputCls}>
            <option value="">— brak —</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.last4 ? ` ••${c.last4}` : ""}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Kategoria" error={e.category}>
        <input name="category" list="categories" defaultValue={sub?.category ?? ""} placeholder="np. Streaming" className={inputCls} />
        <datalist id="categories">
          {allCats.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={sub?.status ?? "active"} className={inputCls}>
          <option value="active">Aktywna</option>
          <option value="paused">Wstrzymana</option>
          <option value="cancelled">Anulowana</option>
        </select>
      </Field>

      <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-sm font-semibold text-forest underline decoration-2 underline-offset-4 hover:decoration-lime">
        {more ? "Mniej opcji" : "Więcej opcji: koniec, okres próbny, podział kosztu…"}
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
        <Field label="Pierwsza płatność" hint="Tylko jeśli inna niż data startu — od niej liczone są kolejne" error={e.firstBillingDate}>
          <input name="firstBillingDate" type="date" defaultValue={sub?.firstBillingDate ?? ""} className={inputCls} />
        </Field>
        <Field label="Dzielę koszt na (osób)" hint="Np. plan rodzinny na 4 — liczy się 1/4 kwoty" error={e.splitWith}>
          <input name="splitWith" type="number" min={1} max={20} inputMode="numeric" defaultValue={sub?.splitWith ?? 1} className={`${inputCls} w-24`} />
        </Field>
        <Field label="Link do zarządzania / anulowania" error={e.url}>
          <input name="url" type="url" inputMode="url" placeholder="https://" defaultValue={sub?.url ?? ""} className={inputCls} aria-invalid={!!e.url} />
        </Field>
        <Field label="Notatki">
          <textarea name="notes" rows={3} defaultValue={sub?.notes ?? ""} className={inputCls} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-obsidian">Kolor</span>
          <ColorPicker name="color" value={color} onChange={setColor} />
        </div>
      </div>

      {state?.error && <p className="rounded-card bg-alarm/10 px-4 py-3 text-sm font-semibold text-alarm">{state.error}</p>}
      <div>
        <Submit>{sub ? "Zapisz zmiany" : "Dodaj subskrypcję"}</Submit>
      </div>
    </form>
  );
}
