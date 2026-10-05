CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
INSERT INTO "categories" ("name") VALUES
  ('Streaming'), ('Muzyka'), ('Oprogramowanie'), ('AI'), ('Chmura'), ('Gry'),
  ('Telefon i internet'), ('Sport'), ('Prasa'), ('Edukacja'), ('Ubezpieczenie'), ('Inne')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "categories" ("name")
  SELECT DISTINCT trim("category") FROM "subscriptions" WHERE "category" IS NOT NULL AND trim("category") <> ''
ON CONFLICT ("name") DO NOTHING;
