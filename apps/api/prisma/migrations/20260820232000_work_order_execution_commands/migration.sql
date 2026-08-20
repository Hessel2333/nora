ALTER TYPE "WorkOrderEventType" ADD VALUE IF NOT EXISTS 'recovered';

ALTER TABLE "work_order_events"
  ADD COLUMN "from_status" "WorkOrderStatus",
  ADD COLUMN "workstation_code" VARCHAR(80),
  ADD COLUMN "device_id" VARCHAR(120),
  ADD COLUMN "reason" VARCHAR(500),
  ADD COLUMN "idempotency_key" VARCHAR(80);

CREATE UNIQUE INDEX "work_order_events_organization_id_idempotency_key_key"
  ON "work_order_events"("organization_id", "idempotency_key");

ALTER TABLE "work_order_events"
  ADD CONSTRAINT "work_order_events_command_context_check"
    CHECK (
      "type" = 'created'
      OR (
        "from_status" IS NOT NULL
        AND length(btrim("workstation_code")) > 0
        AND length(btrim("device_id")) > 0
        AND length(btrim("idempotency_key")) > 0
      )
    ),
  ADD CONSTRAINT "work_order_events_reason_check"
    CHECK (
      "type" NOT IN ('paused', 'exception_reported', 'recovered')
      OR length(btrim("reason")) > 0
    );

CREATE OR REPLACE FUNCTION prevent_work_order_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'work order events are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER work_order_events_immutable
BEFORE UPDATE OR DELETE ON "work_order_events"
FOR EACH ROW EXECUTE FUNCTION prevent_work_order_event_mutation();
