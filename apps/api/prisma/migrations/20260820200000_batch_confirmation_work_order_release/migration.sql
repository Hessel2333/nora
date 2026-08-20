CREATE TYPE "WorkOrderStatus" AS ENUM (
  'pending',
  'running',
  'paused',
  'completed',
  'exception',
  'cancelled'
);

CREATE TYPE "WorkOrderEventType" AS ENUM (
  'created',
  'started',
  'paused',
  'resumed',
  'completed',
  'exception_reported',
  'cancelled',
  'status_changed'
);

ALTER TABLE "production_batch_events"
  ADD COLUMN "idempotency_key" VARCHAR(80);

CREATE UNIQUE INDEX "production_batch_events_organization_id_idempotency_key_key"
  ON "production_batch_events"("organization_id", "idempotency_key");

CREATE TABLE "work_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "production_batch_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "factory_code" VARCHAR(32) NOT NULL,
  "factory_name" VARCHAR(120) NOT NULL,
  "product_id" UUID NOT NULL,
  "product_code" VARCHAR(32) NOT NULL,
  "product_name" VARCHAR(160) NOT NULL,
  "planned_quantity" DECIMAL(14,3) NOT NULL,
  "unit" VARCHAR(24) NOT NULL,
  "selected_bom_version_id" UUID NOT NULL,
  "bom_version_snapshot" VARCHAR(24) NOT NULL,
  "recipe_snapshot" JSONB NOT NULL,
  "scheduled_start_at" TIMESTAMPTZ(3) NOT NULL,
  "work_center" VARCHAR(80) NOT NULL,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'pending',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_planned_quantity_positive_check" CHECK ("planned_quantity" > 0),
  CONSTRAINT "work_orders_revision_positive_check" CHECK ("revision" > 0),
  CONSTRAINT "work_orders_work_center_not_blank_check" CHECK (length(btrim("work_center")) > 0)
);

CREATE TABLE "work_order_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "type" "WorkOrderEventType" NOT NULL,
  "actor" VARCHAR(80) NOT NULL,
  "status" "WorkOrderStatus" NOT NULL,
  "revision" INTEGER NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_events_revision_positive_check" CHECK ("revision" > 0)
);

CREATE UNIQUE INDEX "work_orders_production_batch_id_key"
  ON "work_orders"("production_batch_id");
CREATE UNIQUE INDEX "work_orders_organization_id_code_key"
  ON "work_orders"("organization_id", "code");
CREATE INDEX "work_orders_organization_id_status_scheduled_start_at_idx"
  ON "work_orders"("organization_id", "status", "scheduled_start_at");
CREATE INDEX "work_orders_product_id_selected_bom_version_id_idx"
  ON "work_orders"("product_id", "selected_bom_version_id");
CREATE INDEX "work_order_events_organization_id_created_at_idx"
  ON "work_order_events"("organization_id", "created_at");
CREATE INDEX "work_order_events_work_order_id_created_at_idx"
  ON "work_order_events"("work_order_id", "created_at");

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_selected_bom_version_id_fkey"
  FOREIGN KEY ("selected_bom_version_id") REFERENCES "bom_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
