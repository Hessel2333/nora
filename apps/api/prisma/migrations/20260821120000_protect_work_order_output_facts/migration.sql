CREATE FUNCTION protect_work_order_output_facts()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'work order outputs are immutable facts and cannot be deleted';
  END IF;

  IF OLD."organization_id" IS DISTINCT FROM NEW."organization_id"
    OR OLD."work_order_id" IS DISTINCT FROM NEW."work_order_id"
    OR OLD."production_batch_id" IS DISTINCT FROM NEW."production_batch_id"
    OR OLD."product_id" IS DISTINCT FROM NEW."product_id"
    OR OLD."lot_id" IS DISTINCT FROM NEW."lot_id"
    OR OLD."quantity" IS DISTINCT FROM NEW."quantity"
    OR OLD."unit" IS DISTINCT FROM NEW."unit"
    OR OLD."variance_reason" IS DISTINCT FROM NEW."variance_reason"
    OR OLD."temperature_min" IS DISTINCT FROM NEW."temperature_min"
    OR OLD."temperature_max" IS DISTINCT FROM NEW."temperature_max"
    OR OLD."actor" IS DISTINCT FROM NEW."actor"
    OR OLD."workstation_code" IS DISTINCT FROM NEW."workstation_code"
    OR OLD."device_id" IS DISTINCT FROM NEW."device_id"
    OR OLD."idempotency_key" IS DISTINCT FROM NEW."idempotency_key"
    OR OLD."reported_at" IS DISTINCT FROM NEW."reported_at"
    OR OLD."created_at" IS DISTINCT FROM NEW."created_at"
  THEN
    RAISE EXCEPTION 'work order output facts are immutable; only status projection may advance';
  END IF;

  IF OLD."status" <> 'pending_quality'
    OR NEW."status" NOT IN ('released', 'rejected')
    OR NEW."revision" <> OLD."revision" + 1
  THEN
    RAISE EXCEPTION 'invalid work order output status transition';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "work_order_outputs_protect_facts"
BEFORE UPDATE OR DELETE ON "work_order_outputs"
FOR EACH ROW EXECUTE FUNCTION protect_work_order_output_facts();
