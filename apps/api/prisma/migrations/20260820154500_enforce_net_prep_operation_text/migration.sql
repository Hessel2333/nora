-- Remove the last obsolete demo classification and make the net-prep boundary
-- executable even for writes that bypass the application DTO.

UPDATE "products" product
SET
  "tags" = array_replace(product."tags", '热菜', '净菜包'),
  "updated_at" = CURRENT_TIMESTAMP
FROM "organizations" organization
WHERE product."organization_id" = organization."id"
  AND organization."code" = 'NORA-DEMO';

UPDATE "bom_operations" operation
SET
  "name" = CASE operation."kind"
    WHEN 'receive' THEN '来料确认'
    WHEN 'wash' THEN '清洗沥水'
    WHEN 'cut' THEN '修整切配'
    WHEN 'marinate' THEN '低温腌制'
    WHEN 'mix' THEN '称重组配'
    WHEN 'cool' THEN '冷链暂存'
    WHEN 'pack' THEN '分装贴标'
    WHEN 'quality' THEN '质量复核'
  END,
  "work_center" = CASE operation."kind"
    WHEN 'receive' THEN '原料验收区'
    WHEN 'wash' THEN '清洗前处理区'
    WHEN 'cut' THEN '切配区'
    WHEN 'marinate' THEN '低温腌制区'
    WHEN 'mix' THEN '称量组配区'
    WHEN 'cool' THEN '冷链暂存区'
    WHEN 'pack' THEN '净菜包装区'
    WHEN 'quality' THEN '质量复核区'
  END,
  "instructions" = CASE operation."kind"
    WHEN 'receive' THEN '核对批次、数量、温度和感官状态。'
    WHEN 'wash' THEN '按企业清洗流程处理并充分沥水。'
    WHEN 'cut' THEN '按产品规格完成修整和切配。'
    WHEN 'marinate' THEN '按标准比例拌匀并记录低温静置时间。'
    WHEN 'mix' THEN '按批次分项称量，并按包装定义分隔组配。'
    WHEN 'cool' THEN '按冷链要求暂存并记录温度。'
    WHEN 'pack' THEN '复核净重、批次和标签后完成封装。'
    WHEN 'quality' THEN '复核规格、净重、感官状态和可见异物。'
  END,
  "updated_at" = CURRENT_TIMESTAMP
FROM "bom_versions" version
JOIN "boms" bom ON bom."id" = version."bom_id"
JOIN "organizations" organization ON organization."id" = bom."organization_id"
WHERE operation."bom_version_id" = version."id"
  AND organization."code" = 'NORA-DEMO'
  AND concat_ws(' ', operation."name", operation."work_center", operation."instructions")
    ~ '(炒|蒸|煮|炸|煎|烤|热菜|热厨|灶台|烹调|烹饪|制熟)';

ALTER TABLE "bom_operations"
  ADD CONSTRAINT "bom_operations_net_prep_scope_check"
  CHECK (
    concat_ws(' ', "name", "work_center", "instructions")
      !~ '(炒|蒸|煮|炸|煎|烤|热菜|热厨|灶台|烹调|烹饪|制熟)'
  );
