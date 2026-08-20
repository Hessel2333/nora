ALTER TABLE "inventory_transactions"
  DROP CONSTRAINT "inventory_transactions_work_order_context_check";

ALTER TABLE "inventory_transactions"
  ADD CONSTRAINT "inventory_transactions_work_order_context_check"
  CHECK (
    "source_type" <> 'work_order'
    OR (
      "work_order_id" IS NOT NULL
      AND "source_id" = "work_order_id"::text
      AND "workstation_code" IS NOT NULL
      AND "device_id" IS NOT NULL
      AND length(btrim("workstation_code")) > 0
      AND length(btrim("device_id")) > 0
      AND "type" IN ('issue', 'return')
    )
  );
