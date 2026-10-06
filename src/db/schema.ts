import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const intervalUnit = pgEnum("interval_unit", ["day", "week", "month", "year"]);
export const paymentMethodKind = pgEnum("payment_method_kind", ["card", "account"]);
export const subscriptionScope = pgEnum("subscription_scope", ["personal", "shared", "business"]);
export const subscriptionStatus = pgEnum("subscription_status", ["active", "paused", "cancelled"]);

/** Payment methods: cards and bank accounts (table name kept for compatibility). */
export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  kind: paymentMethodKind("kind").notNull().default("card"),
  name: text("name").notNull(),
  brand: text("brand"),
  last4: varchar("last4", { length: 4 }),
  expMonth: integer("exp_month"),
  expYear: integer("exp_year"),
  color: text("color").notNull().default("forest"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("PLN"),
  intervalCount: integer("interval_count").notNull().default(1),
  intervalUnit: intervalUnit("interval_unit").notNull().default("month"),
  startDate: date("start_date"),
  firstBillingDate: date("first_billing_date"),
  trialEndDate: date("trial_end_date"),
  endDate: date("end_date"),
  status: subscriptionStatus("status").notNull().default("active"),
  cardId: integer("card_id").references(() => cards.id, { onDelete: "set null" }),
  scope: subscriptionScope("scope").notNull().default("personal"),
  splitWith: integer("split_with").notNull().default(1),
  color: text("color").notNull().default("forest"),
  url: text("url"),
  notes: text("notes"),
  /** Site the logo is taken from (auto-detected or set by hand) */
  logoDomain: text("logo_domain"),
  /** Bumped whenever the stored logo changes; null = no logo, show monogram */
  logoVersion: integer("logo_version"),
  /** Set after an automatic lookup ran, so it isn't retried on every view */
  logoCheckedAt: timestamp("logo_checked_at", { withTimezone: true }),
  /** User uploaded their own image — never overwritten automatically */
  logoCustom: boolean("logo_custom").notNull().default(false),
  /** Paid by hand (transfer etc.) — charges must be marked as paid */
  manual: boolean("manual").notNull().default(false),
  /** When manual mode was switched on — earlier charges are never "overdue" */
  manualSince: date("manual_since"),
  /** Send push reminders before/on payment day (for payments made by hand) */
  notify: boolean("notify").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** "From effectiveDate the price is newAmount (it was oldAmount)". Current price = subscriptions.amount. */
export const priceChanges = pgTable("price_changes", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  effectiveDate: date("effective_date").notNull(),
  oldAmount: numeric("old_amount", { precision: 12, scale: 2 }).notNull(),
  newAmount: numeric("new_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Logo images kept apart so listing subscriptions never loads image bytes. */
export const logos = pgTable("logos", {
  subscriptionId: integer("subscription_id")
    .primaryKey()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  data: text("data").notNull(), // base64
  contentType: text("content_type").notNull(),
  /** Full-bleed square icon (apple-touch-icon) vs. small favicon that needs padding */
  fullBleed: boolean("full_bleed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per browser/device that allowed notifications. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  label: text("label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
});

/** Reminders already sent, so a re-run of the daily job never notifies twice. */
export const notificationLog = pgTable(
  "notification_log",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    chargeDate: date("charge_date").notNull(),
    kind: text("kind").notNull(), // "before" | "day"
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("notification_log_once").on(t.subscriptionId, t.chargeDate, t.kind)],
);

/** Manual charges marked as paid. One row per subscription + charge date. */
export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    chargeDate: date("charge_date").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payments_once").on(t.subscriptionId, t.chargeDate)],
);

/** Single-row app settings. */
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  remindDaysBefore: integer("remind_days_before").notNull().default(3),
  remindSameDay: boolean("remind_same_day").notNull().default(true),
  /** UI + notification language */
  locale: text("locale").notNull().default("pl"),
});

export type Card = typeof cards.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type PaymentMethodKind = (typeof paymentMethodKind.enumValues)[number];
export type PushSub = typeof pushSubscriptions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type PriceChange = typeof priceChanges.$inferSelect;
export type SubscriptionScope = (typeof subscriptionScope.enumValues)[number];
export type IntervalUnit = (typeof intervalUnit.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];
