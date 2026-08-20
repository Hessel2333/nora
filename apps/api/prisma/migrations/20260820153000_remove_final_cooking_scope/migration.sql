-- Nora models net-prep production only. Final-heating steps are removed from
-- the active operation enum. Automatic correction is deliberately limited to
-- the deterministic NORA-DEMO organization; real historical facts require an
-- explicit, organization-owned remediation before this migration can proceed.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "bom_operations" operation
    JOIN "bom_versions" version ON version."id" = operation."bom_version_id"
    JOIN "boms" bom ON bom."id" = version."bom_id"
    JOIN "organizations" organization ON organization."id" = bom."organization_id"
    WHERE operation."kind" = 'cook'
      AND organization."code" <> 'NORA-DEMO'
  ) THEN
    RAISE EXCEPTION 'unsupported final-heating BOM operations exist outside NORA-DEMO; remediate them with an audited organization-specific migration first';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "production_demand_lines" line
    JOIN "production_demands" demand ON demand."id" = line."production_demand_id"
    JOIN "organizations" organization ON organization."id" = demand."organization_id"
    WHERE line."recipe_snapshot"::text LIKE '%"kind": "cook"%'
      AND organization."code" <> 'NORA-DEMO'
  ) THEN
    RAISE EXCEPTION 'unsupported final-heating recipe snapshots exist outside NORA-DEMO; preserve and remediate them under the owning organization audit policy first';
  END IF;
END $$;

CREATE TEMP TABLE "_nora_net_prep_corrected_versions" ON COMMIT DROP AS
SELECT DISTINCT version."id"
FROM "bom_operations" operation
JOIN "bom_versions" version ON version."id" = operation."bom_version_id"
JOIN "boms" bom ON bom."id" = version."bom_id"
JOIN "organizations" organization ON organization."id" = bom."organization_id"
WHERE operation."kind" = 'cook'
  AND organization."code" = 'NORA-DEMO';

UPDATE "bom_operations" operation
SET
  "kind" = CASE WHEN bom."code" = 'BOM-CP0003' THEN 'quality' ELSE 'mix' END::"BomOperationKind",
  "name" = CASE WHEN bom."code" = 'BOM-CP0003' THEN '复核称重' ELSE '辅料称重组配' END,
  "work_center" = '净菜组配间',
  "duration_minutes" = CASE WHEN bom."code" = 'BOM-CP0003' THEN 4 ELSE 8 END,
  "wait_minutes" = 0,
  "temperature_min" = NULL,
  "temperature_max" = 12,
  "instructions" = CASE
    WHEN bom."code" = 'BOM-CP0003' THEN '复核规格、净重、感官状态和可见异物。'
    ELSE '按批次分项称量辅料，并与主料分隔组配。'
  END,
  "updated_at" = CURRENT_TIMESTAMP
FROM "bom_versions" version
JOIN "boms" bom ON bom."id" = version."bom_id"
JOIN "organizations" organization ON organization."id" = bom."organization_id"
WHERE operation."bom_version_id" = version."id"
  AND operation."kind" = 'cook'
  AND organization."code" = 'NORA-DEMO';

UPDATE "bom_operations" operation
SET
  "name" = '分装贴标',
  "work_center" = '净菜包装间',
  "instructions" = '复核净重、批次和标签后完成分隔封装，转入冷藏。',
  "updated_at" = CURRENT_TIMESTAMP
FROM "bom_versions" version
JOIN "boms" bom ON bom."id" = version."bom_id"
JOIN "organizations" organization ON organization."id" = bom."organization_id"
WHERE operation."bom_version_id" = version."id"
  AND operation."kind" = 'pack'
  AND organization."code" = 'NORA-DEMO'
  AND (operation."work_center" = '热链包装线' OR operation."name" = '装盒');

UPDATE "bom_versions" version
SET "revision" = version."revision" + 1,
    "updated_at" = CURRENT_TIMESTAMP
WHERE version."id" IN (SELECT "id" FROM "_nora_net_prep_corrected_versions");

INSERT INTO "bom_version_events" (
  "id",
  "organization_id",
  "bom_version_id",
  "type",
  "actor",
  "revision",
  "details",
  "created_at"
)
SELECT
  gen_random_uuid(),
  bom."organization_id",
  version."id",
  'updated',
  'migration:net-prep-scope-correction',
  version."revision",
  jsonb_build_object(
    'migration', '20260820153000_remove_final_cooking_scope',
    'reason', 'net_prep_scope_boundary'
  ),
  CURRENT_TIMESTAMP
FROM "_nora_net_prep_corrected_versions" corrected
JOIN "bom_versions" version ON version."id" = corrected."id"
JOIN "boms" bom ON bom."id" = version."bom_id";

UPDATE "products" product
SET
  "name" = CASE product."code"
    WHEN 'CP0001' THEN '宫保鸡丁净菜包'
    WHEN 'CP0002' THEN '鱼香肉丝净菜包'
    WHEN 'CP0003' THEN '时蔬净菜包'
    ELSE product."name"
  END,
  "category" = CASE WHEN product."code" IN ('CP0001', 'CP0002', 'CP0003') THEN '净菜包' ELSE product."category" END,
  "tags" = array_replace(product."tags", '即烹配菜', '分隔组配'),
  "updated_at" = CURRENT_TIMESTAMP
FROM "organizations" organization
WHERE product."organization_id" = organization."id"
  AND organization."code" = 'NORA-DEMO';

UPDATE "sales_order_lines" line
SET "product_name" = product."name"
FROM "products" product
JOIN "organizations" organization ON organization."id" = product."organization_id"
WHERE line."product_id" = product."id"
  AND organization."code" = 'NORA-DEMO';

UPDATE "production_demand_lines" line
SET
  "product_name" = product."name",
  "recipe_snapshot" = replace(
    replace(
    replace(
      replace(
        replace(
          replace(
            replace(
              replace(
                replace(
                  replace(
                    replace(line."recipe_snapshot"::text,
                      '分批炒制并记录出锅批次。', '按批次分项称量辅料，并与主料分隔组配。'),
                    '大火快炒，分批记录。', '复核规格、净重、感官状态和可见异物。'),
                  '按标准份量装盒。', '按标准份量分装并复核标签。'),
                '热厨烹调线', '净菜组配间'),
              '热链包装线', '净菜包装间'),
            '炒制', '辅料称重组配'),
          '装盒', '分装贴标'),
        '"cook"', '"mix"'),
      '"宫保鸡丁"', '"宫保鸡丁净菜包"'),
    '"鱼香肉丝"', '"鱼香肉丝净菜包"'),
    '"清炒时蔬"', '"时蔬净菜包"')::jsonb
FROM "products" product
JOIN "production_demands" demand ON TRUE
JOIN "organizations" organization ON organization."id" = demand."organization_id"
WHERE line."product_id" = product."id"
  AND line."production_demand_id" = demand."id"
  AND organization."code" = 'NORA-DEMO'
  AND line."recipe_snapshot" IS NOT NULL;

CREATE TYPE "BomOperationKind_net_prep" AS ENUM (
  'receive',
  'wash',
  'cut',
  'marinate',
  'mix',
  'cool',
  'pack',
  'quality'
);

ALTER TABLE "bom_operations"
  ALTER COLUMN "kind" TYPE "BomOperationKind_net_prep"
  USING ("kind"::text::"BomOperationKind_net_prep");

DROP TYPE "BomOperationKind";
ALTER TYPE "BomOperationKind_net_prep" RENAME TO "BomOperationKind";
