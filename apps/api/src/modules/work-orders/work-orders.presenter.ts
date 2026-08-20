import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";
import { isExecutableRecipeSnapshot } from "../boms/recipe-snapshot.js";

export const workOrderInclude = {
  productionBatch: {
    select: { id: true, code: true, status: true, revision: true },
  },
  events: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.WorkOrderInclude;

export type WorkOrderRecord = Prisma.WorkOrderGetPayload<{
  include: typeof workOrderInclude;
}>;

export function presentWorkOrder(workOrder: WorkOrderRecord) {
  const snapshot = isExecutableRecipeSnapshot(workOrder.recipeSnapshot)
    ? workOrder.recipeSnapshot
    : undefined;
  const operations = [...(snapshot?.operations ?? [])]
    .sort((left, right) => left.sequence - right.sequence)
    .map((operation) => ({
      code: operation.code,
      name: operation.name,
      kind: operation.kind,
      sequence: operation.sequence,
      workCenter: operation.workCenter,
      durationMinutes: operation.durationMinutes,
      waitMinutes: operation.waitMinutes,
      temperatureMin: operation.temperatureMin,
      temperatureMax: operation.temperatureMax,
      instructions: operation.instructions,
    }));

  return {
    id: workOrder.id,
    code: workOrder.code,
    productionBatchId: workOrder.productionBatchId,
    productionBatchCode: workOrder.productionBatch.code,
    factoryCode: workOrder.factoryCode,
    factoryName: workOrder.factoryName,
    productId: workOrder.productId,
    productCode: workOrder.productCode,
    productName: workOrder.productName,
    plannedQuantity: workOrder.plannedQuantity.toFixed(3),
    unit: workOrder.unit,
    selectedBomVersionId: workOrder.selectedBomVersionId,
    bomVersionSnapshot: workOrder.bomVersionSnapshot,
    snapshotSchemaVersion: snapshot?.schemaVersion,
    scheduledStartAt: formatLocalDateTime(workOrder.scheduledStartAt),
    workCenter: workOrder.workCenter,
    status: workOrder.status,
    revision: workOrder.revision,
    createdBy: workOrder.createdBy,
    createdAt: formatLocalDateTime(workOrder.createdAt),
    operations,
    events: workOrder.events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      fromStatus: event.fromStatus,
      status: event.status,
      revision: event.revision,
      workstationCode: event.workstationCode,
      deviceId: event.deviceId,
      reason: event.reason,
      createdAt: formatLocalDateTime(event.createdAt),
    })),
  };
}
