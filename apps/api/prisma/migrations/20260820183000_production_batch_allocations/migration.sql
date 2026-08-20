CREATE TYPE "ProductionDemandEventType" AS ENUM ('allocation_changed');

CREATE TYPE "ProductionBatchStatus" AS ENUM (
  'draft',
  'confirmed',
  'released',
  'running',
  'paused',
  'awaiting_quality',
  'completed',
  'exception',
  'cancelled'
);

CREATE TYPE "ProductionBatchEventType" AS ENUM (
  'created',
  'confirmed',
  'released',
  'cancelled',
  'status_changed'
);

CREATE TABLE "production_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
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
  "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
  "status" "ProductionBatchStatus" NOT NULL DEFAULT 'draft',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_by" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "demand_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "production_batch_id" UUID NOT NULL,
  "production_demand_line_id" UUID NOT NULL,
  "allocated_quantity" DECIMAL(14,3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demand_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "demand_allocations_positive_quantity_check" CHECK ("allocated_quantity" > 0)
);

CREATE TABLE "production_batch_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "production_batch_id" UUID NOT NULL,
  "type" "ProductionBatchEventType" NOT NULL,
  "actor" VARCHAR(80) NOT NULL,
  "revision" INTEGER NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_batch_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_demand_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "production_demand_id" UUID NOT NULL,
  "type" "ProductionDemandEventType" NOT NULL,
  "actor" VARCHAR(80) NOT NULL,
  "status" "ProductionDemandStatus" NOT NULL,
  "details" JSONB,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "production_demand_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "production_batches_organization_id_code_key"
  ON "production_batches"("organization_id", "code");
CREATE UNIQUE INDEX "production_batches_organization_id_idempotency_key_key"
  ON "production_batches"("organization_id", "idempotency_key");
CREATE INDEX "production_batches_organization_id_status_scheduled_for_idx"
  ON "production_batches"("organization_id", "status", "scheduled_for");
CREATE INDEX "production_batches_product_id_selected_bom_version_id_idx"
  ON "production_batches"("product_id", "selected_bom_version_id");

CREATE UNIQUE INDEX "demand_allocations_production_batch_id_production_demand_line_id_key"
  ON "demand_allocations"("production_batch_id", "production_demand_line_id");
CREATE INDEX "demand_allocations_production_demand_line_id_idx"
  ON "demand_allocations"("production_demand_line_id");

CREATE INDEX "production_batch_events_organization_id_created_at_idx"
  ON "production_batch_events"("organization_id", "created_at");
CREATE INDEX "production_batch_events_production_batch_id_created_at_idx"
  ON "production_batch_events"("production_batch_id", "created_at");
CREATE INDEX "production_demand_events_organization_id_created_at_idx"
  ON "production_demand_events"("organization_id", "created_at");
CREATE INDEX "production_demand_events_production_demand_id_created_at_idx"
  ON "production_demand_events"("production_demand_id", "created_at");

ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batches"
  ADD CONSTRAINT "production_batches_selected_bom_version_id_fkey"
  FOREIGN KEY ("selected_bom_version_id") REFERENCES "bom_versions"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "demand_allocations"
  ADD CONSTRAINT "demand_allocations_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "demand_allocations"
  ADD CONSTRAINT "demand_allocations_production_demand_line_id_fkey"
  FOREIGN KEY ("production_demand_line_id") REFERENCES "production_demand_lines"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_batch_events"
  ADD CONSTRAINT "production_batch_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_batch_events"
  ADD CONSTRAINT "production_batch_events_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "production_demand_events"
  ADD CONSTRAINT "production_demand_events_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "production_demand_events"
  ADD CONSTRAINT "production_demand_events_production_demand_id_fkey"
  FOREIGN KEY ("production_demand_id") REFERENCES "production_demands"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
