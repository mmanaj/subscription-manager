"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
import { isLocale, LOCALE_COOKIE, type Dict } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";

export type FormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

const optStr = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional()
  .transform((v) => v ?? null);
const optDate = (t: Dict) => optStr.refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), t.errors.invalidDate);
const amountField = (t: Dict) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").replace(",", "."))
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), t.errors.amountInvalid);

const subscriptionSchema = (t: Dict) =>
  z
  .object({
    name: z.string().trim().min(1, t.errors.nameRequired),
    amount: amountField(t),
    currency: z.enum(["PLN", "EUR", "USD", "GBP", "CHF"]),
    intervalCount: z.coerce.number().int().min(1, t.errors.min1).max(365),
    intervalUnit: z.enum(["day", "week", "month", "year"]),
    startDate: optDate(t),
    firstBillingDate: optDate(t),
    trialEndDate: optDate(t),
    endDate: optDate(t),
    status: z.enum(["active", "paused", "cancelled"]),
    scope: z.enum(["personal", "shared", "business"]).default("personal"),
    priceMode: z.enum(["change", "fix"]).default("change"),
    priceFrom: optDate(t),
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
    url: optStr.refine((v) => v === null || /^https?:\/\//.test(v), t.errors.urlInvalid),
    notes: optStr,
  })
  .refine((v) => v.startDate || v.firstBillingDate || v.trialEndDate, {
    path: ["firstBillingDate"],
    message: t.errors.needDate,
  })
  .refine((v) => !v.endDate || !v.startDate || v.endDate > v.startDate, { path: ["endDate"], message: t.errors.endAfterStart });

function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData, t: Dict) {
  const r = schema.safeParse(Object.fromEntries(formData));
  if (r.success) return { data: r.data as z.infer<T> };
  const fieldErrors: Record<string, string> = {};
  for (const issue of r.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return { state: { error: t.errors.fixFields, fieldErrors } satisfies FormState };
}

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function saveSubscription(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const { t } = await getI18n();
  const parsed = parseForm(subscriptionSchema(t), formData, t);
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
  const { t } = await getI18n();
  const domain = normalizeDomain(raw);
  if (!domain) return { error: t.errors.logoDomain };
  const logo = await fetchLogo(domain);
  if (!logo) return { error: t.errors.logoNotFound(domain) };
  await storeLogo(id, logo, { domain });
  refreshAll();
  return {};
}

export async function uploadLogo(id: number, dataUrl: string): Promise<{ error?: string }> {
  await requireAuth();
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  const { t } = await getI18n();
  if (!m) return { error: t.errors.badImage };
  const data = Buffer.from(m[2], "base64");
  if (data.length > 256 * 1024) return { error: t.errors.imageTooBig };
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
    if (!found) return { error: (await getI18n()).t.errors.logoAutoFailed };
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

const priceChangeSchema = (t: Dict) =>
  z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t.errors.dateRequired),
    amount: amountField(t),
  });

export async function addPriceChange(subId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const { t } = await getI18n();
  const parsed = parseForm(priceChangeSchema(t), formData, t);
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
  const { t } = await getI18n();
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { error: t.errors.categoryName };
  if (name.length > 40) return { error: t.errors.max40 };
  await db.insert(categories).values({ name }).onConflictDoNothing();
  return { name };
}

/** Renames everywhere; renaming onto an existing category merges the two. */
export async function renameCategory(from: string, raw: string): Promise<{ error?: string }> {
  await requireAuth();
  const { t } = await getI18n();
  const to = raw.trim().replace(/\s+/g, " ");
  if (!to) return { error: t.errors.categoryName };
  if (to.length > 40) return { error: t.errors.max40 };
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
  if (!parsed.success) return { error: (await getI18n()).t.push.invalidSubscription };
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
  const { t } = await getI18n();
  try {
    const res = await sendToAll({
      title: t.push.testTitle,
      body: t.push.testBody,
      url: "/settings/notifications",
      tag: "test",
    });
    revalidatePath("/settings/notifications");
    const details = res.results
      .filter((r) => !r.ok)
      .map((r) => `${r.label ?? t.common.device}: ${r.status ? `HTTP ${r.status}` : t.push.error}${r.detail ? ` — ${r.detail}` : ""}${r.status === 404 || r.status === 410 ? t.push.removed : ""}`);
    if (!res.results.length) return { error: t.push.noDevices };
    if (!res.sent) return { error: t.push.rejected, details };
    return { sent: res.sent, total: res.results.length, details };
  } catch (e) {
    return { error: t.push.configError((e as Error).message) };
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

const cardSchema = (t: Dict) =>
  z.object({
    kind: z.enum(["card", "account"]).default("card"),
    name: z.string().trim().min(1, t.errors.nameRequired),
    brand: optStr,
    last4: optStr.refine((v) => v === null || /^\d{4}$/.test(v), t.errors.last4),
    expMonth: optStr.transform((v) => (v ? Number(v) : null)).refine((v) => v === null || (v >= 1 && v <= 12), t.errors.month),
    expYear: optStr
      .transform((v) => (v ? (Number(v) < 100 ? 2000 + Number(v) : Number(v)) : null))
      .refine((v) => v === null || (v >= 2000 && v <= 2100), t.errors.year),
    color: z.string().default("forest"),
  });

export async function saveCard(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAuth();
  const { t } = await getI18n();
  const parsed = parseForm(cardSchema(t), formData, t);
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
    return { error: (await getI18n()).t.errors.wrongPassword };
  }
  await startSession();
  redirect("/");
}

/** Saves the UI language: cookie for this browser, settings row for push and the calendar feed. */
export async function setLocale(locale: string) {
  await requireAuth();
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 400 * 86400 });
  await db.insert(settings).values({ id: 1, locale }).onConflictDoUpdate({ target: settings.id, set: { locale } });
  refreshAll();
}

export async function logout() {
  await endSession();
  redirect("/login");
}
