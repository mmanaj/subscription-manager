CREATE TYPE "public"."subscription_scope" AS ENUM('personal', 'shared', 'business');--> statement-breakpoint
CREATE TABLE "price_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"effective_date" date NOT NULL,
	"old_amount" numeric(12, 2) NOT NULL,
	"new_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "scope" "subscription_scope" DEFAULT 'personal' NOT NULL;--> statement-breakpoint
ALTER TABLE "price_changes" ADD CONSTRAINT "price_changes_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
UPDATE "subscriptions" SET "scope" = 'shared' WHERE "split_with" > 1;
