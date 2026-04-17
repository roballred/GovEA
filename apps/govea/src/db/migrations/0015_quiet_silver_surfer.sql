ALTER TABLE "organizations" ADD COLUMN "enabled_modules" jsonb DEFAULT '{}' NOT NULL;
