CREATE TYPE "BomVersionEventType" AS ENUM (
  'created',
  'updated',
  'published',
  'superseded',
  'retired'
);

CREATE TABLE "bom_version_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "bom_version_id" UUID NOT NULL,
  "type" "BomVersionEventType" NOT NULL,
  "actor" VARCHAR(80) NOT NULL,
  "revision" INTEGER NOT NULL,
  "effective_at" TIMESTAMPTZ(3),
  "details" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "bom_version_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bom_version_events_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "bom_version_events_bom_version_id_fkey"
    FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "bom_version_events_organization_id_created_at_idx"
ON "bom_version_events"("organization_id", "created_at");

CREATE INDEX "bom_version_events_bom_version_id_created_at_idx"
ON "bom_version_events"("bom_version_id", "created_at");

-- Existing lifecycle rows predate the audit stream. Backfill only facts that
-- can be proven from stored columns and keep the unknown actor explicit.
INSERT INTO "bom_version_events" (
  "organization_id",
  "bom_version_id",
  "type",
  "actor",
  "revision",
  "created_at",
  "details"
)
SELECT
  b."organization_id",
  v."id",
  'created'::"BomVersionEventType",
  'migration:historical-actor-unknown',
  1,
  v."created_at",
  jsonb_build_object('backfilled', true)
FROM "bom_versions" v
JOIN "boms" b ON b."id" = v."bom_id";

INSERT INTO "bom_version_events" (
  "organization_id",
  "bom_version_id",
  "type",
  "actor",
  "revision",
  "effective_at",
  "created_at",
  "details"
)
SELECT
  b."organization_id",
  v."id",
  'published'::"BomVersionEventType",
  'migration:historical-actor-unknown',
  v."revision",
  v."effective_at",
  v."published_at",
  jsonb_build_object('backfilled', true)
FROM "bom_versions" v
JOIN "boms" b ON b."id" = v."bom_id"
WHERE v."published_at" IS NOT NULL;
