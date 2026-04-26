ALTER TABLE "cross_org_links" ADD COLUMN "flagged_for_review" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cross_org_links" ADD COLUMN "flag_reason" text;
