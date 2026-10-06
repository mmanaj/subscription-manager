"use client";

import { useActionState, useState, useTransition } from "react";
import type { Card, IntervalUnit, Subscription, SubscriptionScope } from "@/db/schema";
import type { FormState } from "@/app/actions";
import { Avatar } from "./ui";
import { CategoryPicker } from "./category-picker";
import { Switch } from "./switch";
import { ColorPicker, Field, inputCls, Submit, submitWithoutReset } from "./form-bits";
import { useI18n } from "./i18n-provider";

const SCOPE_OPTIONS: SubscriptionScope[] = ["personal", "shared", "business"];

const toNum = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

const PRESETS: { key: "monthly" | "yearly" | "quarterly" | "weekly"; count: number; unit: IntervalUnit }[] = [
  { key: "monthly", count: 1, unit: "month" },
  { key: "yearly", count: 1, unit: "year" },
  { key: "quarterly", count: 3, unit: "month" },
  { key: "weekly", count: 1, unit: "week" },
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
  const { t, locale } = useI18n();
  const [state, formAction, pending] = useActionState(action, undefined);
  const [, startTransition] = useTransition();
  const e = state?.fieldErrors ?? {};
  const [name, setName] = useState(sub?.name ?? "");
  const [color, setColor] = useState(sub?.color ?? "forest");
  const [count, setCount] = useState(sub?.intervalCount ?? 1);
  const [unit, setUnit] = useState<IntervalUnit>(sub?.intervalUnit ?? "month");
  const [scope, setScope] = useState<SubscriptionScope>(sub?.scope ?? "personal");
  const initialAmount = sub ? (locale === "pl" ? String(sub.amount).replace(".", ",") : String(sub.amount)) : "";
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
        <Field label={t.common.name} error={e.name} className="flex-1">
          <input
            name="name"
            required
            autoComplete="off"
            placeholder={t.form.namePh}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            aria-invalid={!!e.name}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label={t.form.amount} error={e.amount}>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder={t.form.amountPh}
            value={amount}
            onChange={(ev) => setAmount(ev.target.value)}
            aria-invalid={!!e.amount}
            className={`${inputCls} tabular text-lg font-medium`}
          />
        </Field>
        <Field label={t.form.currency}>
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
                ["change", t.form.priceChanged],
                ["fix", t.form.priceFix],
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
            <Field label={t.form.priceFrom} hint={t.form.priceFromHint}>
              <input name="priceFrom" type="date" defaultValue={new Intl.DateTimeFormat("en-CA").format(new Date())} className={inputCls} />
            </Field>
          ) : (
            <p className="text-sm text-ink">{t.form.priceFixNote}</p>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">{t.form.scope}</legend>
        <input type="hidden" name="scope" value={scope} />
        <div className="grid grid-cols-3 gap-2">
          {SCOPE_OPTIONS.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={scope === o}
              onClick={() => setScope(o)}
              className={`flex flex-col items-start rounded-card px-3 py-2.5 text-left transition ${
                scope === o ? "bg-ink text-paper" : "bg-canvas text-ink-soft hover:bg-canvas"
              }`}
            >
              <span className="text-sm font-medium">{t.scope[o].one}</span>
              <span className="text-[11px] leading-tight opacity-75">{t.scope[o].hint}</span>
            </button>
          ))}
        </div>
        {scope === "shared" ? (
          <Field label={t.form.splitWith} hint={t.form.splitHint} error={e.splitWith} className="mt-2">
            <input name="splitWith" type="number" min={1} max={20} inputMode="numeric" defaultValue={sub?.splitWith ?? 1} className={`${inputCls} w-24`} />
          </Field>
        ) : (
          <input type="hidden" name="splitWith" value="1" />
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium text-ink">{t.form.renews}</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.key}
              onClick={() => {
                setCount(p.count);
                setUnit(p.unit);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                presetActive(p) ? "bg-ink text-paper" : "bg-canvas text-ink-soft hover:bg-canvas"
              }`}
            >
              {t.form.presets[p.key]}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`text-sm ${custom ? "font-medium text-ink" : "text-muted"}`}>{t.form.every}</span>
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
            {(["day", "week", "month", "year"] as const).map((u) => (
              <option key={u} value={u}>
                {t.form.units[u]}
              </option>
            ))}
          </select>
        </div>
        {e.intervalCount && <span className="text-sm text-ember">{e.intervalCount}</span>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t.form.billingDate} hint={t.form.billingHint} error={e.firstBillingDate}>
          <input name="firstBillingDate" type="date" defaultValue={sub?.firstBillingDate ?? ""} className={inputCls} aria-invalid={!!e.firstBillingDate} />
        </Field>
        <Field label={t.form.startDate} hint={t.common.optional} error={e.startDate}>
          <input name="startDate" type="date" defaultValue={sub?.startDate ?? ""} className={inputCls} />
        </Field>
      </div>
      <p className="-mt-3 text-xs text-muted">
        {t.form.datesNote}
      </p>

      <Field label={t.form.payment} error={e.cardId}>
        <select name="cardId" defaultValue={sub?.cardId ?? ""} className={inputCls}>
          <option value="">{t.form.noPayment}</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.last4 ? ` ••${c.last4}` : ""}
              {c.kind === "account" ? t.form.accountSuffix : ""}
            </option>
          ))}
        </select>
      </Field>

      <CategoryPicker name="category" initial={sub?.category ?? null} options={categories} />

      <div className="divide-y divide-hairline rounded-[var(--radius-field)] bg-canvas px-4">
        <label className="flex items-start justify-between gap-4 py-4">
          <span>
            <span className="block text-sm font-medium text-ink">{t.form.manual}</span>
            <span className="mt-0.5 block text-xs text-muted">{t.form.manualHint}</span>
          </span>
          <Switch name="manual" defaultChecked={sub?.manual ?? false} label={t.form.manual} />
        </label>
        <label className="flex items-start justify-between gap-4 py-4">
          <span>
            <span className="block text-sm font-medium text-ink">{t.form.notify}</span>
            <span className="mt-0.5 block text-xs text-muted">{t.form.notifyHint}</span>
          </span>
          <Switch name="notify" defaultChecked={sub?.notify ?? false} label={t.form.notify} />
        </label>
      </div>

      <Field label={t.form.status}>
        <select name="status" defaultValue={sub?.status ?? "active"} className={inputCls}>
          {(["active", "paused", "cancelled"] as const).map((v) => (
            <option key={v} value={v}>
              {t.form.statuses[v]}
            </option>
          ))}
        </select>
      </Field>

      <button type="button" onClick={() => setMore((m) => !m)} className="self-start text-sm font-medium text-ink underline decoration-2 underline-offset-4 hover:decoration-ink/30">
        {more ? t.form.lessOptions : t.form.moreOptions}
      </button>

      <div className={more ? "flex flex-col gap-6" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t.form.endDate} hint={t.form.endHint} error={e.endDate}>
            <input name="endDate" type="date" defaultValue={sub?.endDate ?? ""} className={inputCls} aria-invalid={!!e.endDate} />
          </Field>
          <Field label={t.form.trialEnd} hint={t.form.trialHint} error={e.trialEndDate}>
            <input name="trialEndDate" type="date" defaultValue={sub?.trialEndDate ?? ""} className={inputCls} />
          </Field>
        </div>
        <Field label={t.form.url} error={e.url}>
          <input name="url" type="url" inputMode="url" placeholder="https://" defaultValue={sub?.url ?? ""} className={inputCls} aria-invalid={!!e.url} />
        </Field>
        <Field label={t.form.notes}>
          <textarea name="notes" rows={3} defaultValue={sub?.notes ?? ""} className={inputCls} />
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">{t.common.color}</span>
          <ColorPicker name="color" value={color} onChange={setColor} />
        </div>
      </div>

      {state?.error && <p className="rounded-card bg-ember/10 px-4 py-3 text-sm font-medium text-ember">{state.error}</p>}
      <div>
        <Submit pending={pending}>{sub ? t.form.saveChanges : t.nav.addSubscription}</Submit>
      </div>
    </form>
  );
}
