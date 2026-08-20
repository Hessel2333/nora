-- A phase input must reference an operation owned by the same recipe version.
-- The previous single-column foreign key only proved that the operation existed.
CREATE UNIQUE INDEX "bom_operations_id_bom_version_id_key"
  ON "bom_operations"("id", "bom_version_id");

ALTER TABLE "bom_items"
  DROP CONSTRAINT "bom_items_operation_id_fkey";

ALTER TABLE "bom_items"
  ADD CONSTRAINT "bom_items_operation_version_scope_fkey"
  FOREIGN KEY ("operation_id", "bom_version_id")
  REFERENCES "bom_operations"("id", "bom_version_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
