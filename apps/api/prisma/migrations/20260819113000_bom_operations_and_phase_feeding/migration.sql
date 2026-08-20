-- Versioned process steps are separate facts from material structure. BOM items
-- point to their consumption step so the same material can be used in more than
-- one stage without losing sequence semantics.
CREATE TYPE "BomOperationKind" AS ENUM (
  'receive',
  'wash',
  'cut',
  'marinate',
  'mix',
  'cook',
  'cool',
  'pack',
  'quality'
);

CREATE TABLE "bom_operations" (
  "id" UUID NOT NULL,
  "bom_version_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "kind" "BomOperationKind" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "work_center" VARCHAR(80),
  "duration_minutes" INTEGER NOT NULL DEFAULT 0,
  "wait_minutes" INTEGER NOT NULL DEFAULT 0,
  "temperature_min" DECIMAL(6,2),
  "temperature_max" DECIMAL(6,2),
  "instructions" VARCHAR(1000),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "bom_operations_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "bom_items" ADD COLUMN "operation_id" UUID;

CREATE UNIQUE INDEX "bom_operations_bom_version_id_code_key"
  ON "bom_operations"("bom_version_id", "code");
CREATE UNIQUE INDEX "bom_operations_bom_version_id_sequence_key"
  ON "bom_operations"("bom_version_id", "sequence");
CREATE INDEX "bom_operations_bom_version_id_kind_idx"
  ON "bom_operations"("bom_version_id", "kind");

ALTER TABLE "bom_operations"
  ADD CONSTRAINT "bom_operations_bom_version_id_fkey"
  FOREIGN KEY ("bom_version_id") REFERENCES "bom_versions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The four deterministic local datasets receive realistic starter routings
-- only when those historical rows already exist. On a clean install migrations
-- run before seed, so this block must remain a no-op until seed creates them.
WITH seed_operation ("id", "bom_version_id", "code", "name", "kind", "sequence", "work_center", "duration_minutes", "wait_minutes", "instructions") AS (VALUES
  ('41000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000001', 'OP10', '解冻清洗', 'wash', 10, '肉类前处理', 12, 0, '低温流水解冻，清洗后沥水。'),
  ('41000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000001', 'OP20', '切丁', 'cut', 20, '肉类切配间', 8, 0, '切为约 15 mm 均匀鸡丁。'),
  ('41000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000001', 'OP30', '腌制', 'marinate', 30, '腌制间', 5, 20, '拌匀后冷藏静置 20 分钟。'),
  ('41000000-0000-4000-8000-000000000104', '40000000-0000-4000-8000-000000000001', 'OP40', '炒制', 'cook', 40, '热厨烹调线', 10, 0, '按批次投放辅料与调味汁。'),
  ('41000000-0000-4000-8000-000000000105', '40000000-0000-4000-8000-000000000001', 'OP50', '装盒', 'pack', 50, '热链包装线', 6, 0, '称重校验后封装。'),
  ('41000000-0000-4000-8000-000000000201', '40000000-0000-4000-8000-000000000002', 'OP10', '称量混合', 'mix', 10, '调味品预制间', 8, 0, '按顺序称量并搅拌至白砂糖溶解。'),
  ('41000000-0000-4000-8000-000000000202', '40000000-0000-4000-8000-000000000002', 'OP20', '质量确认', 'quality', 20, '调味品预制间', 3, 0, '确认外观、重量和批次标签。'),
  ('41000000-0000-4000-8000-000000000301', '40000000-0000-4000-8000-000000000003', 'OP10', '清洗修整', 'wash', 10, '肉类前处理', 10, 0, '去除筋膜并沥水。'),
  ('41000000-0000-4000-8000-000000000302', '40000000-0000-4000-8000-000000000003', 'OP20', '切丝', 'cut', 20, '肉类切配间', 8, 0, '切为均匀肉丝。'),
  ('41000000-0000-4000-8000-000000000303', '40000000-0000-4000-8000-000000000003', 'OP30', '腌制', 'marinate', 30, '腌制间', 5, 15, '拌匀后冷藏静置。'),
  ('41000000-0000-4000-8000-000000000304', '40000000-0000-4000-8000-000000000003', 'OP40', '炒制', 'cook', 40, '热厨烹调线', 9, 0, '分批炒制并记录出锅批次。'),
  ('41000000-0000-4000-8000-000000000305', '40000000-0000-4000-8000-000000000003', 'OP50', '装盒', 'pack', 50, '热链包装线', 6, 0, '按标准份量装盒。'),
  ('41000000-0000-4000-8000-000000000401', '40000000-0000-4000-8000-000000000004', 'OP10', '清洗', 'wash', 10, '蔬菜前处理', 12, 0, '流动水清洗并沥干。'),
  ('41000000-0000-4000-8000-000000000402', '40000000-0000-4000-8000-000000000004', 'OP20', '切配', 'cut', 20, '蔬菜切配间', 8, 0, '按菜品规格切配。'),
  ('41000000-0000-4000-8000-000000000403', '40000000-0000-4000-8000-000000000004', 'OP30', '炒制', 'cook', 30, '热厨烹调线', 7, 0, '大火快炒，分批记录。'),
  ('41000000-0000-4000-8000-000000000404', '40000000-0000-4000-8000-000000000004', 'OP40', '装盒', 'pack', 40, '热链包装线', 5, 0, '称重后封装。')
)
INSERT INTO "bom_operations" ("id", "bom_version_id", "code", "name", "kind", "sequence", "work_center", "duration_minutes", "wait_minutes", "instructions")
SELECT seed."id"::uuid, seed."bom_version_id"::uuid, seed."code", seed."name", seed."kind"::"BomOperationKind", seed."sequence", seed."work_center", seed."duration_minutes", seed."wait_minutes", seed."instructions"
FROM seed_operation seed
JOIN "bom_versions" version ON version."id" = seed."bom_version_id"::uuid
ON CONFLICT DO NOTHING;

-- Unknown historical versions cannot be reconstructed safely. They receive an
-- explicit migration marker rather than invented wash/cut/cook details.
INSERT INTO "bom_operations" ("id", "bom_version_id", "code", "name", "kind", "sequence", "instructions")
SELECT gen_random_uuid(), version."id", 'LEGACY', '历史配料', 'mix', 10,
       '由 20260819113000 迁移建立；原版本未记录工艺步骤。'
FROM "bom_versions" version
WHERE NOT EXISTS (
  SELECT 1 FROM "bom_operations" operation
  WHERE operation."bom_version_id" = version."id"
);

UPDATE "bom_items" item
SET "operation_id" = operation."id"
FROM "bom_operations" operation
WHERE operation."bom_version_id" = item."bom_version_id"
  AND operation."code" = 'LEGACY';

UPDATE "bom_items" SET "operation_id" = CASE
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000004' THEN '41000000-0000-4000-8000-000000000101'::uuid
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000006' THEN '41000000-0000-4000-8000-000000000105'::uuid
  ELSE '41000000-0000-4000-8000-000000000104'::uuid
END WHERE "bom_version_id" = '40000000-0000-4000-8000-000000000001';

UPDATE "bom_items" SET "operation_id" = '41000000-0000-4000-8000-000000000201'
WHERE "bom_version_id" = '40000000-0000-4000-8000-000000000002';

UPDATE "bom_items" SET "operation_id" = CASE
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000005' THEN '41000000-0000-4000-8000-000000000301'::uuid
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000006' THEN '41000000-0000-4000-8000-000000000305'::uuid
  ELSE '41000000-0000-4000-8000-000000000304'::uuid
END WHERE "bom_version_id" = '40000000-0000-4000-8000-000000000003';

UPDATE "bom_items" SET "operation_id" = CASE
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000014' THEN '41000000-0000-4000-8000-000000000401'::uuid
  WHEN "component_product_id" = '20000000-0000-4000-8000-000000000006' THEN '41000000-0000-4000-8000-000000000404'::uuid
  ELSE '41000000-0000-4000-8000-000000000403'::uuid
END WHERE "bom_version_id" = '40000000-0000-4000-8000-000000000004';

ALTER TABLE "bom_items" ALTER COLUMN "operation_id" SET NOT NULL;

DROP INDEX "bom_items_bom_version_id_component_product_id_key";
CREATE INDEX "bom_items_bom_version_id_operation_id_component_product_id_idx"
  ON "bom_items"("bom_version_id", "operation_id", "component_product_id");

ALTER TABLE "bom_items"
  ADD CONSTRAINT "bom_items_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "bom_operations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
