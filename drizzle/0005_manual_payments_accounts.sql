CREATE TYPE "public"."payment_method_kind" AS ENUM('card', 'account');--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer NOT NULL,
	"charge_date" date NOT NULL,
	"paid_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "kind" "payment_method_kind" DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "manual" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_once" ON "payments" USING btree ("subscription_id","charge_date");--> statement-breakpoint
UPDATE "subscriptions" SET "manual" = true WHERE "notify" = true;
