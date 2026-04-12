ALTER TABLE "principles" ALTER COLUMN "title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "principles" ADD COLUMN "name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "principles" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "principles" ADD COLUMN "description" text;