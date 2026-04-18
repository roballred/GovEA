ALTER TABLE "personas" ADD COLUMN "last_reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "capabilities" ADD COLUMN "last_reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "capabilities" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personas" ADD CONSTRAINT "personas_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "capabilities" ADD CONSTRAINT "capabilities_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_last_reviewed_by_users_id_fk" FOREIGN KEY ("last_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
