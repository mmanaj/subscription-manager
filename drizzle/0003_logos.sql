CREATE TABLE "logos" (
	"subscription_id" integer PRIMARY KEY NOT NULL,
	"data" text NOT NULL,
	"content_type" text NOT NULL,
	"full_bleed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "logo_domain" text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "logo_version" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "logo_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "logo_custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "logos" ADD CONSTRAINT "logos_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;