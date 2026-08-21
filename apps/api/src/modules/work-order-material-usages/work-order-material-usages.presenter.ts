import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";

export const workOrderMaterialUsageInclude = {
  location: true,
  product: true,
  lot: true,
} satisfies Prisma.WorkOrderMaterialUsageInclude;

export type WorkOrderMaterialUsageRecord = Prisma.WorkOrderMaterialUsageGetPayload<{
  include: typeof workOrderMaterialUsageInclude;
}>;

export function presentWorkOrderMaterialUsage(usage: WorkOrderMaterialUsageRecord) {
  return {
    id: usage.id,
    location: {
      id: usage.location.id,
      code: usage.location.code,
      name: usage.location.name,
    },
    product: {
      id: usage.product.id,
      code: usage.product.code,
      name: usage.product.name,
    },
    lot: {
      id: usage.lot.id,
      code: usage.lot.code,
      qualityStatus: usage.lot.qualityStatus,
    },
    disposition: usage.disposition,
    quantity: usage.quantity.toFixed(3),
    unit: usage.unit,
    reason: usage.reason,
    actor: usage.actor,
    workstationCode: usage.workstationCode,
    deviceId: usage.deviceId,
    occurredAt: formatLocalDateTime(usage.occurredAt),
    createdAt: formatLocalDateTime(usage.createdAt),
  };
}
