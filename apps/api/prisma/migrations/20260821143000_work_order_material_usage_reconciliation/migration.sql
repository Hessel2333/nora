CREATE TYPE "WorkOrderMaterialDisposition" AS ENUM ('consumed', 'scrapped');

CREATE TABLE "work_order_material_usages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "work_order_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "lot_id" UUID NOT NULL,
  "disposition" "WorkOrderMaterialDisposition" NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" VARCHAR(24) NOT NULL,
  "reason" VARCHAR(500),
  "actor" VARCHAR(80) NOT NULL,
  "workstation_code" VARCHAR(80) NOT NULL,
  "device_id" VARCHAR(120) NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_material_usages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_material_usages_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "work_order_material_usages_unit_not_blank_check" CHECK (length(btrim("unit")) > 0),
  CONSTRAINT "work_order_material_usages_actor_not_blank_check" CHECK (length(btrim("actor")) > 0),
  CONSTRAINT "work_order_material_usages_workstation_not_blank_check" CHECK (length(btrim("workstation_code")) > 0),
  CONSTRAINT "work_order_material_usages_device_not_blank_check" CHECK (length(btrim("device_id")) > 0),
  CONSTRAINT "work_order_material_usages_scrap_reason_check" CHECK (
    "disposition" <> 'scrapped' OR length(btrim(COALESCE("reason", ''))) > 0
  )
);

CREATE UNIQUE INDEX "work_order_material_usages_organization_id_idempotency_key_key"
  ON "work_order_material_usages"("organization_id", "idempotency_key");
CREATE INDEX "work_order_material_usages_organization_id_work_order_id_occurred_at_idx"
  ON "work_order_material_usages"("organization_id", "work_order_id", "occurred_at");
CREATE INDEX "work_order_material_usages_organization_id_product_id_lot_id_occurred_at_idx"
  ON "work_order_material_usages"("organization_id", "product_id", "lot_id", "occurred_at");

ALTER TABLE "work_order_material_usages"
  ADD CONSTRAINT "work_order_material_usages_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_material_usages_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_material_usages_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_material_usages_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "work_order_material_usages_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_work_order_material_usage_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'work order material usages are immutable; append a correction instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "work_order_material_usages_immutable"
BEFORE UPDATE OR DELETE ON "work_order_material_usages"
FOR EACH ROW EXECUTE FUNCTION prevent_work_order_material_usage_mutation();
