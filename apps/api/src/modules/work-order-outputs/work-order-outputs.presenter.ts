import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";

export const workOrderOutputInclude = {
  lot: true,
  inspections: { orderBy: { createdAt: "desc" as const } },
  inventoryTransaction: {
    include: { location: true },
  },
} satisfies Prisma.WorkOrderOutputInclude;

export type WorkOrderOutputRecord = Prisma.WorkOrderOutputGetPayload<{
  include: typeof workOrderOutputInclude;
}>;

export function presentWorkOrderOutput(output: WorkOrderOutputRecord) {
  return {
    id: output.id,
    workOrderId: output.workOrderId,
    productionBatchId: output.productionBatchId,
    productId: output.productId,
    lot: {
      id: output.lot.id,
      code: output.lot.code,
      qualityStatus: output.lot.qualityStatus,
      productionAt: output.lot.productionAt ? formatLocalDateTime(output.lot.productionAt) : null,
      expiresAt: output.lot.expiresAt ? formatLocalDateTime(output.lot.expiresAt) : null,
    },
    quantity: output.quantity.toFixed(3),
    unit: output.unit,
    status: output.status,
    varianceReason: output.varianceReason,
    temperatureMin: output.temperatureMin?.toFixed(2) ?? null,
    temperatureMax: output.temperatureMax?.toFixed(2) ?? null,
    revision: output.revision,
    actor: output.actor,
    workstationCode: output.workstationCode,
    deviceId: output.deviceId,
    reportedAt: formatLocalDateTime(output.reportedAt),
    inspections: output.inspections.map((inspection) => ({
      id: inspection.id,
      decision: inspection.decision,
      standardVersion: inspection.standardVersion,
      sampleQuantity: inspection.sampleQuantity,
      measuredTemperature: inspection.measuredTemperature.toFixed(2),
      appearancePassed: inspection.appearancePassed,
      packageSealPassed: inspection.packageSealPassed,
      labelPassed: inspection.labelPassed,
      note: inspection.note,
      actor: inspection.actor,
      workstationCode: inspection.workstationCode,
      deviceId: inspection.deviceId,
      createdAt: formatLocalDateTime(inspection.createdAt),
    })),
    inventoryPosting: output.inventoryTransaction ? {
      id: output.inventoryTransaction.id,
      location: {
        id: output.inventoryTransaction.location.id,
        code: output.inventoryTransaction.location.code,
        name: output.inventoryTransaction.location.name,
      },
      quantity: output.inventoryTransaction.quantity.toFixed(3),
      unit: output.inventoryTransaction.unit,
      occurredAt: formatLocalDateTime(output.inventoryTransaction.occurredAt),
    } : null,
  };
}
