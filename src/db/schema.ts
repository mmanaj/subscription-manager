import {
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const intervalUnit = pgEnum("interval_unit", ["day", "week", "month", "year"]);
export const subscriptionStatus = pgEnum("subscription_status", ["active", "paused", "cancelled"]);

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
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
  startDate: date("start_date").notNull(),
  firstBillingDate: date("first_billing_date"),
  trialEndDate: date("trial_end_date"),
  endDate: date("end_date"),
  status: subscriptionStatus("status").notNull().default("active"),
  cardId: integer("card_id").references(() => cards.id, { onDelete: "set null" }),
  splitWith: integer("split_with").notNull().default(1),
  color: text("color").notNull().default("forest"),
  url: text("url"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Card = typeof cards.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type IntervalUnit = (typeof intervalUnit.enumValues)[number];
export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];
