CREATE TABLE "capability_relationships" (
	"parent_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	CONSTRAINT "capability_relationships_pkey" PRIMARY KEY("parent_id","child_id")
);
--> statement-breakpoint
ALTER TABLE "capability_relationships" ADD CONSTRAINT "capability_relationships_parent_id_capabilities_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "capability_relationships" ADD CONSTRAINT "capability_relationships_child_id_capabilities_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;
