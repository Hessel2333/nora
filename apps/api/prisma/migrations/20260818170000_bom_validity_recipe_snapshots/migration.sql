-- Published BOM versions use half-open validity windows: [effective_at, effective_to).
ALTER TABLE "bom_versions" ADD COLUMN "effective_to" TIMESTAMPTZ(3);

WITH ordered_versions AS (
  SELECT
    id,
    LEAD(effective_at) OVER (PARTITION BY bom_id ORDER BY effective_at, created_at) AS next_effective_at
  FROM bom_versions
  WHERE status <> 'draft' AND effective_at IS NOT NULL
)
UPDATE bom_versions AS target
SET effective_to = ordered_versions.next_effective_at
FROM ordered_versions
WHERE target.id = ordered_versions.id;

ALTER TABLE "production_demand_lines" ADD COLUMN "recipe_snapshot" JSONB;

-- Existing approved demands did not capture nested recipes. Preserve the known
-- top-level version as an explicitly incomplete legacy snapshot so application
-- code can fail closed instead of silently recomputing against mutable masters.
UPDATE production_demand_lines AS demand_line
SET recipe_snapshot = jsonb_build_object(
  'schemaVersion', 0,
  'incomplete', true,
  'reason', 'legacy-demand-without-recursive-recipe-snapshot',
  'selectedBomVersionId', demand_line.selected_bom_version_id,
  'selectedBomVersion', demand_line.bom_version_snapshot
)
WHERE demand_line.selected_bom_version_id IS NOT NULL;

CREATE INDEX "bom_versions_bom_id_effective_at_effective_to_idx"
ON "bom_versions"("bom_id", "effective_at", "effective_to");

ALTER TABLE "bom_versions"
ADD CONSTRAINT "bom_versions_valid_window_check"
CHECK ("effective_to" IS NULL OR "effective_at" IS NULL OR "effective_to" > "effective_at");

-- Prisma does not model PostgreSQL exclusion constraints, but the database must
-- remain the final guard when two publishers race.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bom_versions"
ADD CONSTRAINT "bom_versions_no_overlapping_validity"
EXCLUDE USING GIST (
  "bom_id" WITH =,
  tstzrange("effective_at", COALESCE("effective_to", 'infinity'::timestamptz), '[)') WITH &&
)
WHERE ("status" <> 'draft' AND "effective_at" IS NOT NULL);
