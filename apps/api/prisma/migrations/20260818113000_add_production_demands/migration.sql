-- CreateEnum
CREATE TYPE "ProductionDemandStatus" AS ENUM (
  'pending_planning',
  'partially_planned',
  'planned',
  'completed',
  'cancelled'
);

-- CreateTable
CREATE TABLE "production_demands" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "sales_order_id" UUID NOT NULL,
  "factory_code" VARCHAR(32) NOT NULL DEFAULT 'SZ-CENTRAL',
  "factory_name" VARCHAR(120) NOT NULL DEFAULT '深圳中央工厂',
  "required_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "ProductionDemandStatus" NOT NULL DEFAULT 'pending_planning',
  "approved_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "production_demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "production_demand_lines" (
  "id" UUID NOT NULL,
  "production_demand_id" UUID NOT NULL,
  "sales_order_line_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "product_code" VARCHAR(32) NOT NULL,
  "product_name" VARCHAR(160) NOT NULL,
  "required_quantity" DECIMAL(14,3) NOT NULL,
  "unit" VARCHAR(24) NOT NULL,
  "selected_bom_version_id" UUID,
  "bom_version_snapshot" VARCHAR(24),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "production_demand_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "production_demands_sales_order_id_key" ON "production_demands"("sales_order_id");
CREATE UNIQUE INDEX "production_demands_organization_id_code_key" ON "production_demands"("organization_id", "code");
CREATE INDEX "production_demands_organization_id_status_required_at_idx" ON "production_demands"("organization_id", "status", "required_at");
CREATE UNIQUE INDEX "production_demand_lines_sales_order_line_id_key" ON "production_demand_lines"("sales_order_line_id");
CREATE INDEX "production_demand_lines_production_demand_id_sort_order_idx" ON "production_demand_lines"("production_demand_id", "sort_order");
CREATE INDEX "production_demand_lines_product_id_idx" ON "production_demand_lines"("product_id");

-- AddForeignKey
ALTER TABLE "production_demands"
  ADD CONSTRAINT "production_demands_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_demands"
  ADD CONSTRAINT "production_demands_sales_order_id_fkey"
  FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_demand_lines"
  ADD CONSTRAINT "production_demand_lines_production_demand_id_fkey"
  FOREIGN KEY ("production_demand_id") REFERENCES "production_demands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_demand_lines"
  ADD CONSTRAINT "production_demand_lines_sales_order_line_id_fkey"
  FOREIGN KEY ("sales_order_line_id") REFERENCES "sales_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_demand_lines"
  ADD CONSTRAINT "production_demand_lines_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_demand_lines"
  ADD CONSTRAINT "production_demand_lines_selected_bom_version_id_fkey"
  FOREIGN KEY ("selected_bom_version_id") REFERENCES "bom_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill persistent demands for local orders that were already approved before this migration.
WITH approved_orders AS (
  SELECT
    so.*,
    to_char(so.created_at AT TIME ZONE 'Asia/Shanghai', 'YYYYMMDD') AS date_key,
    row_number() OVER (
      PARTITION BY so.organization_id, to_char(so.created_at AT TIME ZONE 'Asia/Shanghai', 'YYYYMMDD')
      ORDER BY so.created_at, so.code
    ) AS sequence
  FROM "sales_orders" so
  WHERE so.status IN ('approved', 'in_production', 'delivering', 'completed', 'reconciled')
)
INSERT INTO "production_demands" (
  "id",
  "organization_id",
  "code",
  "sales_order_id",
  "required_at",
  "status",
  "approved_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  approved_orders.organization_id,
  'PD' || approved_orders.date_key || lpad(approved_orders.sequence::text, 4, '0'),
  approved_orders.id,
  approved_orders.delivery_at,
  'pending_planning',
  COALESCE(
    (
      SELECT soe.created_at
      FROM "sales_order_events" soe
      WHERE soe.sales_order_id = approved_orders.id AND soe.type = 'approved'
      ORDER BY soe.created_at
      LIMIT 1
    ),
    approved_orders.updated_at
  ),
  approved_orders.updated_at,
  approved_orders.updated_at
FROM approved_orders;

INSERT INTO "production_demand_lines" (
  "id",
  "production_demand_id",
  "sales_order_line_id",
  "product_id",
  "product_code",
  "product_name",
  "required_quantity",
  "unit",
  "selected_bom_version_id",
  "bom_version_snapshot",
  "sort_order",
  "created_at"
)
SELECT
  gen_random_uuid(),
  pd.id,
  sol.id,
  sol.product_id,
  sol.product_code,
  sol.product_name,
  sol.quantity,
  sol.unit,
  selected_version.id,
  selected_version.version,
  sol.sort_order,
  pd.created_at
FROM "production_demands" pd
JOIN "sales_order_lines" sol ON sol.sales_order_id = pd.sales_order_id
LEFT JOIN LATERAL (
  SELECT bv.id, bv.version
  FROM "boms" b
  JOIN "bom_versions" bv ON bv.bom_id = b.id
  WHERE b.organization_id = pd.organization_id
    AND b.product_id = sol.product_id
    AND bv.status = 'effective'
    AND bv.effective_at <= pd.required_at
  ORDER BY bv.effective_at DESC
  LIMIT 1
) selected_version ON TRUE;

INSERT INTO "document_numbers" (
  "id",
  "organization_id",
  "kind",
  "date_key",
  "current_value",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  pd.organization_id,
  'PD',
  substring(pd.code FROM 3 FOR 8),
  count(*)::integer,
  CURRENT_TIMESTAMP
FROM "production_demands" pd
GROUP BY pd.organization_id, substring(pd.code FROM 3 FOR 8)
ON CONFLICT ("organization_id", "kind", "date_key")
DO UPDATE SET "current_value" = GREATEST("document_numbers"."current_value", EXCLUDED."current_value");
