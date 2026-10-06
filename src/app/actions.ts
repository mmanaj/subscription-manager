"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { cards, categories, payments, priceChanges, pushSubscriptions, settings, subscriptions } from "@/db/schema";
import { endSession, passwordMatches, requireAuth, startSession } from "@/lib/auth";
import { nextCharge } from "@/lib/billing";
import { addDays, today } from "@/lib/dates";
import { amountOn } from "@/lib/price";
import { normalizeDomain } from "@/lib/logo-domains";
import { fetchLogo, refreshLogo, storeLogo } from "@/lib/logos";
import { sendToAll } from "@/lib/push";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

const optStr = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);
const optDate = optStr.refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Niepoprawna data");

const subscriptionSchema = z
  .object({
    name: z.string().trim().min(1, "Podaj nazwę"),
    amount: z
      .string()
      .trim()
      .transform((v) => v.replace(/\s/g, "").replace(",", "."))
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Podaj kwotę, np. 49,99"),
    currency: z.enum(["PLN", "EUR", "USD", "GBP", "CHF"]),
    intervalCount: z.coerce.number().int().min(1, "Min. 1").max(365),
    intervalUnit: z.enum(["day", "week", "month", "year"]),
    startDate: optDate,
    firstBillingDate: optDate,
    trialEndDate: optDate,
    endDate: optDate,
    status: z.enum(["active", "paused", "cancelled"]),
    scope: z.enum(["personal", "shared", "business"]).default("personal"),
    priceMode: z.enum(["change", "fix"]).default("change"),
    priceFrom: optDate,
    notify: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    manual: z
      .string()
      .optional()
      .transform((v) => v === "on"),
    cardId: optStr.transform((v) => (v ? Number(v) : null)),
    category: optStr,
    splitWith: z.coerce.number().int().min(1).max(20),
    color: z.string().default("forest"),
    url: optStr.refine((v) => v === null || /^https?:\/\//.test(v), "Adres musi zaczynać się od http(s)://"),
    notes: optStr,
  })
  .refine((v) => v.startDate || v.firstBillingDate || v.trialEndDate, {
    path: ["firstBillingDate"],
    message: "Podaj datę najbliższej płatności albo od kiedy masz subskrypcję",
  })
  .refine((v) => !v.endDate || !v.startDate || v.endDate > v.startDate, { path: ["endDate"], message: "Koniec musi być po starcie" });

function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData) {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (r.success) return { data: r.data as z.infer<T> };
  const fieldErrors: Record<string, string> = {};
  for (const issue of r.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { state: { error: "Popraw zaznaczone pola", fieldErrors } satisfies FormState };
}

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function saveSubscription(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = parseForm(subscriptionSchema, formData);
  if (!parsed.data) return parsed.state;
  const { priceMode, priceFrom, ...fields } = parsed.data;
  const values = { ...fields, splitWith: fields.scope === "shared" ? fields.splitWith : 1, updatedAt: new Date() };
  let savedId = id;
  let needsLogo = true;
  if (id) {
    const [prev] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    needsLogo = !prev?.logoCheckedAt || prev.name !== values.name || prev.url !== values.url;
    // Track when manual mode started; charges before that can't be "overdue".
    Object.assign(values, { manualSince: values.manual ? (prev?.manual ? prev.manualSince : today()) : null });
    const priceChanged = prev && Number(prev.amount) !== Number(values.amount);
    await db.transaction(async (tx) => {
      if (priceChanged && priceMode === "change") {
        const { amount, ...rest } = values;
        await tx.update(subscriptions).set(rest).where(eq(subscriptions.id, id));
        await applyPriceChange(tx, id, priceFrom ?? today(), amount);
      } else {
        await tx.update(subscriptions).set(values).where(eq(subscriptions.id, id));
        // A correction rewrites the latest known price rather than adding history.
        if (priceChanged) {
          const events = await tx.select().from(priceChanges).where(eq(priceChanges.subscriptionId, id)).orderBy(asc(priceChanges.effectiveDate));
          const last = events.at(-1);
          if (last) await tx.update(priceChanges).set({ newAmount: values.amount }).where(eq(priceChanges.id, last.id));
        }
      }
    });
  } else {
    Object.assign(values, { manualSince: values.manual ? today() : null });
    const [row] = await db.insert(subscriptions).values(values).returning({ id: subscriptions.id });
    savedId = row.id;
  }
  if (needsLogo) await lookUpLogo(savedId!);
  refreshAll();
  redirect(`/subscriptions/${savedId}`);
}

/**
 * Looks up the logo (new subscription, or its name/link changed). Waits briefly so the logo is
 * usually there on the next screen, then lets the lookup finish in the background.
 */
async function lookUpLogo(id: number) {
  const job = refreshLogo(id).catch(() => false);
  after(() => job);
  await Promise.race([job, new Promise((r) => setTimeout(r, 4000))]);
}

export async function setLogoDomain(id: number, raw: string): Promise<{ error?: string }> {
  await requireAuth();
  const domain = normalizeDomain(raw);
  if (!domain) return { error: "Wpisz adres strony, np. skyshowtime.com" };
  const logo = await fetchLogo(domain);
  if (!logo) return { error: `Nie znalazłem logo na ${domain}. Spróbuj innego adresu albo wgraj obrazek.` };
  await storeLogo(id, logo, { domain });
  refreshAll();
  return {};
}

export async function uploadLogo(id: number, dataUrl: string): Promise<{ error?: string }> {
  await requireAuth();
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { error: "Nieobsługiwany format obrazka" };
  const data = Buffer.from(m[2], "base64");
  if (data.length > 256 * 1024) return { error: "Obrazek jest za duży" };
  await storeLogo(id, { data, contentType: m[1], fullBleed: true }, { custom: true });
  refreshAll();
  return {};
}

/** mode "monogram": no logo, never auto-fetch. mode "auto": forget overrides and look up again. */
export async function resetLogo(id: number, mode: "monogram" | "auto"): Promise<{ error?: string }> {
  await requireAuth();
  if (mode === "monogram") {
    await storeLogo(id, null, { custom: true });
  } else {
    await db.update(subscriptions).set({ logoCustom: false, logoDomain: null }).where(eq(subscriptions.id, id));
    const found = await refreshLogo(id);
    refreshAll();
    if (!found) return { error: "Nie znalazłem logo automatycznie. Wpisz adres strony albo wgraj obrazek." };
  }
  refreshAll();
  return {};
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Keeps the history a consistent chain (each old = previous new) and the subscription at the latest price. */
async function rechain(tx: Tx, subId: number, fallbackAmount: string) {
  const events = await tx
    .select()
    .from(priceChanges)
    .where(eq(priceChanges.subscriptionId, subId))
    .orderBy(asc(priceChanges.effectiveDate), asc(priceChanges.id));
  for (let i = 1; i < events.length; i++) {
    if (events[i].oldAmount !== events[i - 1].newAmount) {
      await tx.update(priceChanges).set({ oldAmount: events[i - 1].newAmount }).where(eq(priceChanges.id, events[i].id));
    }
  }
  await tx
    .update(subscriptions)
    .set({ amount: events.at(-1)?.newAmount ?? fallbackAmount, updatedAt: new Date() })
    .where(eq(subscriptions.id, subId));
}

/** Records "from `date` the price is `newAmount`" — past, current or announced for the future. */
async function applyPriceChange(tx: Tx, subId: number, date: string, newAmount: string) {
  const [sub] = await tx.select().from(subscriptions).where(eq(subscriptions.id, subId));
  if (!sub) return;
  const events = await tx.select().from(priceChanges).where(eq(priceChanges.subscriptionId, subId));
  const sameDay = events.find((e) => e.effectiveDate === date);
  if (sameDay) {
    await tx.update(priceChanges).set({ newAmount }).where(eq(priceChanges.id, sameDay.id));
  } else {
    const before = amountOn(
      Number(sub.amount),
      events.map((e) => ({ effectiveDate: e.effectiveDate, oldAmount: Number(e.oldAmount), newAmount: Number(e.newAmount) })),
      addDays(date, -1),
    );
    if (before === Number(newAmount)) return;
    await tx.insert(priceChanges).values({ subscriptionId: subId, effectiveDate: date, oldAmount: before.toFixed(2), newAmount });
  }
  await rechain(tx, subId, sub.amount);
}

const priceChangeSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę"),
  amount: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").replace(",", "."))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Podaj kwotę, np. 49,99"),
});

export async function addPriceChange(subId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = parseForm(priceChangeSchema, formData);
  if (!parsed.data) return parsed.state;
  await db.transaction((tx) => applyPriceChange(tx, subId, parsed.data.date, parsed.data.amount));
  refreshAll();
  return { ok: true };
}

export async function deletePriceChange(subId: number, changeId: number) {
  await requireAuth();
  await db.transaction(async (tx) => {
    const events = await tx
      .select()
      .from(priceChanges)
      .where(eq(priceChanges.subscriptionId, subId))
      .orderBy(asc(priceChanges.effectiveDate), asc(priceChanges.id));
    const idx = events.findIndex((e) => e.id === changeId);
    if (idx < 0) return;
    const removed = events[idx];
    // Removing the first change: the next one now starts from the original price.
    if (idx === 0 && events[1]) {
      await tx.update(priceChanges).set({ oldAmount: removed.oldAmount }).where(eq(priceChanges.id, events[1].id));
    }
    await tx.delete(priceChanges).where(and(eq(priceChanges.id, changeId), eq(priceChanges.subscriptionId, subId)));
    await rechain(tx, subId, removed.oldAmount);
  });
  refreshAll();
}

export async function deleteSubscription(id: number) {
  await requireAuth();
  await db.delete(subscriptions).where(eq(subscriptions.id, id));
  refreshAll();
  redirect("/subscriptions");
}

/** Cancel: stop renewing. Access runs until the next charge date, which becomes the end date. */
export async function cancelSubscription(id: number) {
  await requireAuth();
  const [s] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
  if (!s) return;
  const t = today();
  const end = s.endDate && s.endDate <= t ? s.endDate : (nextCharge(s, t) ?? t);
  await db
    .update(subscriptions)
    .set({ status: "cancelled", endDate: end, updatedAt: new Date() })
    .where(eq(subscriptions.id, id));
  refreshAll();
}

export async function setStatus(id: number, status: "active" | "paused") {
  await requireAuth();
  const patch: Partial<typeof subscriptions.$inferInsert> = { status, updatedAt: new Date() };
  if (status === "active") patch.endDate = null;
  await db.update(subscriptions).set(patch).where(eq(subscriptions.id, id));
  refreshAll();
}

export async function addCategory(raw: string): Promise<{ name?: string; error?: string }> {
  await requireAuth();
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Wpisz nazwę" };
  if (name.length > 40) return { error: "Max 40 znaków" };
  await db.insert(categories).values({ name }).onConflictDoNothing();
  return { name };
}

/** Renames everywhere; renaming onto an existing category merges the two. */
export async function renameCategory(from: string, raw: string): Promise<{ error?: string }> {
  await requireAuth();
  const to = raw.trim().replace(/\s+/g, " ");
  if (!to) return { error: "Wpisz nazwę" };
  if (to.length > 40) return { error: "Max 40 znaków" };
  if (to === from) return {};
  await db.transaction(async (tx) => {
    await tx.insert(categories).values({ name: to }).onConflictDoNothing();
    await tx.update(subscriptions).set({ category: to }).where(sql`trim(${subscriptions.category}) = ${from}`);
    await tx.delete(categories).where(eq(categories.name, from));
  });
  refreshAll();
  return {};
}

/** Deletes a category; subscriptions in it become uncategorised. */
export async function deleteCategory(name: string) {
  await requireAuth();
  await db.transaction(async (tx) => {
    await tx.update(subscriptions).set({ category: null }).where(sql`trim(${subscriptions.category}) = ${name}`);
    await tx.delete(categories).where(eq(categories.name, name));
  });
  refreshAll();
}

/** Ticks a manual charge off as paid (or undoes it). */
export async function markPaid(subId: number, chargeDate: string, paid: boolean) {
  await requireAuth();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chargeDate)) return;
  if (paid) await db.insert(payments).values({ subscriptionId: subId, chargeDate }).onConflictDoNothing();
  else await db.delete(payments).where(and(eq(payments.subscriptionId, subId), eq(payments.chargeDate, chargeDate)));
  refreshAll();
}

/* ── Push notifications ─────────────────────────────────────────────────────────────────── */

const pushSubSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Stores (or refreshes) this device's push subscription. */
export async function savePushSubscription(raw: unknown, label: string): Promise<{ error?: string }> {
  await requireAuth();
  const parsed = pushSubSchema.safeParse(raw);
  if (!parsed.success) return { error: "Nieprawidłowa subskrypcja push" };
  const { endpoint, keys } = parsed.data;
  const row = { endpoint, p256dh: keys.p256dh, auth: keys.auth, label: label.slice(0, 80) || null };
  await db.insert(pushSubscriptions).values(row).onConflictDoUpdate({ target: pushSubscriptions.endpoint, set: row });
  revalidatePath("/settings/notifications");
  return {};
}

export async function removePushDevice(endpointOrId: string | number) {
  await requireAuth();
  await db
    .delete(pushSubscriptions)
    .where(typeof endpointOrId === "number" ? eq(pushSubscriptions.id, endpointOrId) : eq(pushSubscriptions.endpoint, endpointOrId));
  revalidatePath("/settings/notifications");
}

export async function sendTestPush(): Promise<{ error?: string; sent?: number; total?: number; details?: string[] }> {
  await requireAuth();
  try {
    const res = await sendToAll({
      title: "Powiadomienia działają",
      body: "Tak będą wyglądać przypomnienia o płatnościach.",
      url: "/settings/notifications",
      tag: "test",
    });
    revalidatePath("/settings/notifications");
    const details = res.results
      .filter((r) => !r.ok)
      .map((r) => `${r.label ?? "Urządzenie"}: ${r.status ? `HTTP ${r.status}` : "błąd"}${r.detail ? ` — ${r.detail}` : ""}${r.status === 404 || r.status === 410 ? " (usunięte — włącz ponownie)" : ""}`);
    if (!res.results.length) return { error: "Brak zarejestrowanych urządzeń. Włącz powiadomienia na tym urządzeniu." };
    if (!res.sent) return { error: "Serwer push odrzucił wysyłkę.", details };
    return { sent: res.sent, total: res.results.length, details };
  } catch (e) {
    return { error: `Błąd konfiguracji: ${(e as Error).message}` };
  }
}

export async function updateReminderSettings(formData: FormData) {
  await requireAuth();
  const days = Math.min(14, Math.max(0, Number(formData.get("remindDaysBefore")) || 0));
  const sameDay = formData.get("remindSameDay") === "on";
  await db
    .insert(settings)
    .values({ id: 1, remindDaysBefore: days, remindSameDay: sameDay })
    .onConflictDoUpdate({ target: settings.id, set: { remindDaysBefore: days, remindSameDay: sameDay } });
  revalidatePath("/settings/notifications");
}

export async function setSubscriptionNotify(id: number, notify: boolean) {
  await requireAuth();
  await db.update(subscriptions).set({ notify }).where(eq(subscriptions.id, id));
  refreshAll();
}

const cardSchema = z.object({
  kind: z.enum(["card", "account"]).default("card"),
  name: z.string().trim().min(1, "Podaj nazwę"),
  brand: optStr,
  last4: optStr.refine((v) => v === null || /^\d{4}$/.test(v), "4 cyfry"),
  expMonth: optStr.transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (v >= 1 && v <= 12), "1–12"),
  expYear: optStr
    .transform((v) => (v ? (Number(v) < 100 ? 2000 + Number(v) : Number(v)) : null))
    .refine((v) => v === null || (v >= 2000 && v <= 2100), "Np. 2028"),
  color: z.string().default("forest"),
});

export async function saveCard(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const parsed = parseForm(cardSchema, formData);
  if (!parsed.data) return parsed.state;
  if (id) await db.update(cards).set(parsed.data).where(eq(cards.id, id));
  else await db.insert(cards).values(parsed.data);
  refreshAll();
  redirect("/cards");
}

export async function deleteCard(id: number) {
  await requireAuth();
  await db.delete(cards).where(eq(cards.id, id));
  refreshAll();
  redirect("/cards");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Złe hasło" };
  }
  await startSession();
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
