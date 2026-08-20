CREATE TYPE "InventoryLocationType" AS ENUM (
  'ambient_storage',
  'cold_storage',
  'frozen_storage',
  'quarantine',
  'finished_goods'
);

CREATE TYPE "InventoryLotQualityStatus" AS ENUM (
  'pending',
  'released',
  'quarantined',
  'rejected'
);

CREATE TYPE "InventoryTransactionType" AS ENUM (
  'opening_balance',
  'receipt',
  'issue',
  'return',
  'produce',
  'transfer_in',
  'transfer_out',
  'adjust_in',
  'adjust_out',
  'scrap',
  'reversal'
);

CREATE TYPE "InventoryTransactionDirection" AS ENUM ('inbound', 'outbound');

CREATE TABLE "inventory_locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "factory_code" VARCHAR(32) NOT NULL,
  "code" VARCHAR(32) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "type" "InventoryLocationType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_locations_code_not_blank_check" CHECK (length(btrim("code")) > 0),
  CONSTRAINT "inventory_locations_name_not_blank_check" CHECK (length(btrim("name")) > 0)
);

CREATE TABLE "inventory_lots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "supplier_lot_code" VARCHAR(80),
  "quality_status" "InventoryLotQualityStatus" NOT NULL DEFAULT 'pending',
  "received_at" TIMESTAMPTZ(3) NOT NULL,
  "production_at" TIMESTAMPTZ(3),
  "expires_at" TIMESTAMPTZ(3),
  "created_by" VARCHAR(80) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_lots_code_not_blank_check" CHECK (length(btrim("code")) > 0),
  CONSTRAINT "inventory_lots_expiry_after_receipt_check" CHECK ("expires_at" IS NULL OR "expires_at" > "received_at")
);

CREATE TABLE "inventory_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "lot_id" UUID NOT NULL,
  "type" "InventoryTransactionType" NOT NULL,
  "direction" "InventoryTransactionDirection" NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "unit" VARCHAR(24) NOT NULL,
  "source_type" VARCHAR(40) NOT NULL,
  "source_id" VARCHAR(80),
  "reference_code" VARCHAR(80),
  "note" VARCHAR(500),
  "actor" VARCHAR(80) NOT NULL,
  "idempotency_key" VARCHAR(80) NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_transactions_quantity_positive_check" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_transactions_unit_not_blank_check" CHECK (length(btrim("unit")) > 0),
  CONSTRAINT "inventory_transactions_actor_not_blank_check" CHECK (length(btrim("actor")) > 0)
);

CREATE TABLE "stock_balance_projections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "location_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "lot_id" UUID NOT NULL,
  "on_hand_quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_balance_projections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_balance_projections_non_negative_check" CHECK ("on_hand_quantity" >= 0),
  CONSTRAINT "stock_balance_projections_revision_positive_check" CHECK ("revision" > 0)
);

CREATE UNIQUE INDEX "inventory_locations_organization_id_code_key"
  ON "inventory_locations"("organization_id", "code");
CREATE INDEX "inventory_locations_organization_id_factory_code_active_idx"
  ON "inventory_locations"("organization_id", "factory_code", "active");

CREATE UNIQUE INDEX "inventory_lots_organization_id_code_key"
  ON "inventory_lots"("organization_id", "code");
CREATE INDEX "inventory_lots_organization_id_product_id_quality_status_expires_at_idx"
  ON "inventory_lots"("organization_id", "product_id", "quality_status", "expires_at");

CREATE UNIQUE INDEX "inventory_transactions_organization_id_idempotency_key_key"
  ON "inventory_transactions"("organization_id", "idempotency_key");
CREATE INDEX "inventory_transactions_organization_id_occurred_at_idx"
  ON "inventory_transactions"("organization_id", "occurred_at");
CREATE INDEX "inventory_transactions_organization_id_product_id_lot_id_idx"
  ON "inventory_transactions"("organization_id", "product_id", "lot_id");
CREATE INDEX "inventory_transactions_organization_id_location_id_occurred_at_idx"
  ON "inventory_transactions"("organization_id", "location_id", "occurred_at");

CREATE UNIQUE INDEX "stock_balance_projections_organization_id_location_id_product_id_lot_id_key"
  ON "stock_balance_projections"("organization_id", "location_id", "product_id", "lot_id");
CREATE INDEX "stock_balance_projections_organization_id_product_id_on_hand_quantity_idx"
  ON "stock_balance_projections"("organization_id", "product_id", "on_hand_quantity");
CREATE INDEX "stock_balance_projections_organization_id_location_id_on_hand_quantity_idx"
  ON "stock_balance_projections"("organization_id", "location_id", "on_hand_quantity");

ALTER TABLE "inventory_locations"
  ADD CONSTRAINT "inventory_locations_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_lots"
  ADD CONSTRAINT "inventory_lots_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_lots"
  ADD CONSTRAINT "inventory_lots_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_balance_projections"
  ADD CONSTRAINT "stock_balance_projections_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balance_projections"
  ADD CONSTRAINT "stock_balance_projections_location_id_fkey"
  FOREIGN KEY ("location_id") REFERENCES "inventory_locations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balance_projections"
  ADD CONSTRAINT "stock_balance_projections_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_balance_projections"
  ADD CONSTRAINT "stock_balance_projections_lot_id_fkey"
  FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_inventory_transaction_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'inventory transactions are immutable; append a reversal instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "inventory_transactions_immutable"
BEFORE UPDATE OR DELETE ON "inventory_transactions"
FOR EACH ROW EXECUTE FUNCTION prevent_inventory_transaction_mutation();
