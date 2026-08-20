ALTER TABLE "inventory_transactions"
  ADD COLUMN "work_order_id" UUID,
  ADD COLUMN "workstation_code" VARCHAR(80),
  ADD COLUMN "device_id" VARCHAR(120);

CREATE INDEX "inventory_transactions_organization_id_work_order_id_occurred_at_idx"
  ON "inventory_transactions"("organization_id", "work_order_id", "occurred_at");

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_work_order_id_fkey"
  FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "inventory_transactions_work_order_context_check"
  CHECK (
    "source_type" <> 'work_order'
    OR (
      "work_order_id" IS NOT NULL
      AND "source_id" = "work_order_id"::text
      AND length(btrim("workstation_code")) > 0
      AND length(btrim("device_id")) > 0
      AND "type" IN ('issue', 'return')
    )
  );
