"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { cards, subscriptions } from "@/db/schema";
import { endSession, passwordMatches, requireAuth, startSession } from "@/lib/auth";
import { nextCharge } from "@/lib/billing";
import { today } from "@/lib/dates";

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

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
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę rozpoczęcia"),
    firstBillingDate: optDate,
    trialEndDate: optDate,
    endDate: optDate,
    status: z.enum(["active", "paused", "cancelled"]),
    cardId: optStr.transform((v) => (v ? Number(v) : null)),
    category: optStr,
    splitWith: z.coerce.number().int().min(1).max(20),
    color: z.string().default("forest"),
    url: optStr.refine((v) => v === null || /^https?:\/\//.test(v), "Adres musi zaczynać się od http(s)://"),
    notes: optStr,
  })
  .refine((v) => !v.endDate || v.endDate > v.startDate, { path: ["endDate"], message: "Koniec musi być po starcie" });

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
  const values = { ...parsed.data, updatedAt: new Date() };
  let savedId = id;
  if (id) {
    await db.update(subscriptions).set(values).where(eq(subscriptions.id, id));
  } else {
    const [row] = await db.insert(subscriptions).values(values).returning({ id: subscriptions.id });
    savedId = row.id;
  }
  refreshAll();
  redirect(`/subscriptions/${savedId}`);
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

const cardSchema = z.object({
  name: z.string().trim().min(1, "Podaj nazwę karty"),
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
