import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";
import { isCompleteRecipeSnapshot, isExecutableRecipeSnapshot } from "../boms/recipe-snapshot.js";
import { presentWorkOrder, workOrderInclude } from "../work-orders/work-orders.presenter.js";

export const productionBatchInclude = {
  allocations: {
    orderBy: { createdAt: "asc" as const },
    include: {
      productionDemandLine: {
        include: {
          productionDemand: {
            include: {
              salesOrder: {
                select: { id: true, code: true, customerName: true },
              },
            },
          },
        },
      },
    },
  },
  events: { orderBy: { createdAt: "desc" as const } },
  workOrder: { include: workOrderInclude },
} satisfies Prisma.ProductionBatchInclude;

export type ProductionBatchRecord = Prisma.ProductionBatchGetPayload<{
  include: typeof productionBatchInclude;
}>;

export function presentProductionBatch(batch: ProductionBatchRecord) {
  const snapshot = isCompleteRecipeSnapshot(batch.recipeSnapshot) ? batch.recipeSnapshot : undefined;
  const executableSnapshot = isExecutableRecipeSnapshot(batch.recipeSnapshot) ? batch.recipeSnapshot : undefined;
  return {
    id: batch.id,
    code: batch.code,
    factoryCode: batch.factoryCode,
    factoryName: batch.factoryName,
    productId: batch.productId,
    productCode: batch.productCode,
    productName: batch.productName,
    plannedQuantity: batch.plannedQuantity.toFixed(3),
    unit: batch.unit,
    selectedBomVersionId: batch.selectedBomVersionId,
    bomVersionSnapshot: batch.bomVersionSnapshot,
    snapshotSchemaVersion: snapshot?.schemaVersion,
    processStepCount: executableSnapshot?.operations.length ?? 0,
    releaseReady: Boolean(executableSnapshot?.operations.some((operation) => operation.workCenter?.trim())),
    scheduledFor: formatLocalDateTime(batch.scheduledFor),
    status: batch.status,
    revision: batch.revision,
    createdBy: batch.createdBy,
    createdAt: formatLocalDateTime(batch.createdAt),
    workOrder: batch.workOrder ? presentWorkOrder(batch.workOrder) : null,
    allocations: batch.allocations.map((allocation) => ({
      id: allocation.id,
      productionDemandLineId: allocation.productionDemandLineId,
      productionDemandId: allocation.productionDemandLine.productionDemand.id,
      productionDemandCode: allocation.productionDemandLine.productionDemand.code,
      salesOrderId: allocation.productionDemandLine.productionDemand.salesOrder.id,
      salesOrderCode: allocation.productionDemandLine.productionDemand.salesOrder.code,
      customerName: allocation.productionDemandLine.productionDemand.salesOrder.customerName,
      allocatedQuantity: allocation.allocatedQuantity.toFixed(3),
    })),
    events: batch.events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      revision: event.revision,
      createdAt: formatLocalDateTime(event.createdAt),
    })),
  };
}
