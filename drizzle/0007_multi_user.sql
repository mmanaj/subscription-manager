CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"google_sub" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"picture" text,
	"ics_token" text NOT NULL,
	"remind_days_before" integer DEFAULT 3 NOT NULL,
	"remind_same_day" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub"),
	CONSTRAINT "users_ics_token_unique" UNIQUE("ics_token")
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_name_unique";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "user_id" integer;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_user" ON "cards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_name" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "subscriptions_user" ON "subscriptions" USING btree ("user_id");