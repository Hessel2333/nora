ALTER TYPE "WorkOrderStatus" ADD VALUE 'awaiting_quality' BEFORE 'completed';

ALTER TYPE "WorkOrderEventType" ADD VALUE 'output_reported' AFTER 'resumed';
ALTER TYPE "WorkOrderEventType" ADD VALUE 'quality_rejected' AFTER 'completed';

CREATE TYPE "WorkOrderOutputStatus" AS ENUM (
  'pending_quality',
  'released',
  'rejected'
);

CREATE TYPE "QualityDecision" AS ENUM ('released', 'rejected');

CREATE TABLE "work_order_outputs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "production_batch_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "lot_id" UUID NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" VARCHAR(24) NOT NULL,
  "status" "WorkOrderOutputStatus" NOT NULL DEFAULT 'pending_quality',
  "variance_reason" VARCHAR(500),
  "temperature_min" DECIMAL(6,2),
  "temperature_max" DECIMAL(6,2),
  "revision" INTEGER NOT NULL DEFAULT 1,
  "actor" VARCHAR(80) NOT NULL,
  "workstation_code" VARCHAR(80) NOT NULL,
  "device_id" VARCHAR(120) NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
  "reported_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_outputs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_outputs_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "work_order_outputs_unit_not_blank_check" CHECK (length(btrim("unit")) > 0),
  CONSTRAINT "work_order_outputs_actor_not_blank_check" CHECK (length(btrim("actor")) > 0),
  CONSTRAINT "work_order_outputs_workstation_not_blank_check" CHECK (length(btrim("workstation_code")) > 0),
  CONSTRAINT "work_order_outputs_device_not_blank_check" CHECK (length(btrim("device_id")) > 0),
  CONSTRAINT "work_order_outputs_revision_positive_check" CHECK ("revision" > 0),
  CONSTRAINT "work_order_outputs_temperature_range_check" CHECK (
    "temperature_min" IS NULL OR "temperature_max" IS NULL OR "temperature_min" <= "temperature_max"
  )
);

CREATE TABLE "quality_inspections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "work_order_output_id" UUID NOT NULL,
  "decision" "QualityDecision" NOT NULL,
  "standard_version" VARCHAR(80) NOT NULL,
  "sample_quantity" INTEGER NOT NULL,
  "measured_temperature" DECIMAL(6,2) NOT NULL,
  "appearance_passed" BOOLEAN NOT NULL,
  "package_seal_passed" BOOLEAN NOT NULL,
  "label_passed" BOOLEAN NOT NULL,
  "note" VARCHAR(500),
  "actor" VARCHAR(80) NOT NULL,
  "workstation_code" VARCHAR(80) NOT NULL,
  "device_id" VARCHAR(120) NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quality_inspections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quality_inspections_standard_not_blank_check" CHECK (length(btrim("standard_version")) > 0),
  CONSTRAINT "quality_inspections_sample_positive_check" CHECK ("sample_quantity" > 0),
  CONSTRAINT "quality_inspections_actor_not_blank_check" CHECK (length(btrim("actor")) > 0),
  CONSTRAINT "quality_inspections_workstation_not_blank_check" CHECK (length(btrim("workstation_code")) > 0),
  CONSTRAINT "quality_inspections_device_not_blank_check" CHECK (length(btrim("device_id")) > 0),
  CONSTRAINT "quality_inspections_release_checks_passed_check" CHECK (
    "decision" <> 'released'
    OR ("appearance_passed" AND "package_seal_passed" AND "label_passed")
  ),
  CONSTRAINT "quality_inspections_rejection_note_check" CHECK (
    "decision" <> 'rejected' OR length(btrim(COALESCE("note", ''))) > 0
  )
);

CREATE UNIQUE INDEX "work_order_outputs_lot_id_key"
  ON "work_order_outputs"("lot_id");
CREATE UNIQUE INDEX "work_order_outputs_organization_id_idempotency_key_key"
  ON "work_order_outputs"("organization_id", "idempotency_key");
CREATE INDEX "work_order_outputs_organization_id_work_order_id_reported_at_idx"
  ON "work_order_outputs"("organization_id", "work_order_id", "reported_at");
CREATE INDEX "work_order_outputs_organization_id_status_reported_at_idx"
  ON "work_order_outputs"("organization_id", "status", "reported_at");
CREATE UNIQUE INDEX "work_order_outputs_one_pending_per_work_order_key"
  ON "work_order_outputs"("organization_id", "work_order_id")
  WHERE "status" = 'pending_quality';
CREATE UNIQUE INDEX "work_order_outputs_one_released_per_work_order_key"
  ON "work_order_outputs"("organization_id", "work_order_id")
  WHERE "status" = 'released';

CREATE UNIQUE INDEX "quality_inspections_organization_id_idempotency_key_key"
  ON "quality_inspections"("organization_id", "idempotency_key");
CREATE INDEX "quality_inspections_organization_id_work_order_output_id_created_at_idx"
  ON "quality_inspections"("organization_id", "work_order_output_id", "created_at");

ALTER TABLE "work_order_outputs"
  ADD CONSTRAINT "work_order_outputs_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_outputs_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_outputs_production_batch_id_fkey"
  FOREIGN KEY ("production_batch_id") REFERENCES "production_batches"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_outputs_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_outputs_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "quality_inspections"
  ADD CONSTRAINT "quality_inspections_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "quality_inspections_work_order_output_id_fkey"
  FOREIGN KEY ("work_order_output_id") REFERENCES "work_order_outputs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions"
  ADD COLUMN "work_order_output_id" UUID;

CREATE UNIQUE INDEX "inventory_transactions_work_order_output_id_key"
  ON "inventory_transactions"("work_order_output_id");

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_work_order_output_id_fkey"
  FOREIGN KEY ("work_order_output_id") REFERENCES "work_order_outputs"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_transactions_production_output_context_check"
  CHECK (
    ("source_type" = 'production_output') = ("work_order_output_id" IS NOT NULL)
    AND (
      "source_type" <> 'production_output'
      OR (
        "work_order_id" IS NOT NULL
        AND "source_id" = "work_order_output_id"::text
        AND "type" = 'produce'
        AND "direction" = 'inbound'
        AND "workstation_code" IS NOT NULL
        AND "device_id" IS NOT NULL
        AND length(btrim("workstation_code")) > 0
        AND length(btrim("device_id")) > 0
      )
    )
  );

CREATE FUNCTION prevent_quality_inspection_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'quality inspections are immutable; append a new decision instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "quality_inspections_immutable"
BEFORE UPDATE OR DELETE ON "quality_inspections"
FOR EACH ROW EXECUTE FUNCTION prevent_quality_inspection_mutation();
