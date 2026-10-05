CREATE TYPE "public"."interval_unit" AS ENUM('day', 'week', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'paused', 'cancelled');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"last4" varchar(4),
	"exp_month" integer,
	"exp_year" integer,
	"color" text DEFAULT 'forest' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'PLN' NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"interval_unit" interval_unit DEFAULT 'month' NOT NULL,
	"start_date" date NOT NULL,
	"first_billing_date" date,
	"trial_end_date" date,
	"end_date" date,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"card_id" integer,
	"split_with" integer DEFAULT 1 NOT NULL,
	"color" text DEFAULT 'forest' NOT NULL,
	"url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;