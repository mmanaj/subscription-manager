ALTER TABLE "subscriptions" ADD COLUMN "manual_since" date;--> statement-breakpoint
UPDATE "subscriptions" SET "manual_since" = CURRENT_DATE WHERE "manual" = true;
