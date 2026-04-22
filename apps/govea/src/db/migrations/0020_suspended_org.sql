ALTER TABLE "organizations" ADD COLUMN "suspended_at" timestamp;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "suspended_reason" text;
