import type { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";

export const productionDemandInclude = {
  lines: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.ProductionDemandInclude;

export type ProductionDemandRecord = Prisma.ProductionDemandGetPayload<{
  include: typeof productionDemandInclude;
}>;

export function presentProductionDemand(demand: ProductionDemandRecord) {
  const lines = demand.lines.map((line) => ({
    id: line.id,
    salesOrderLineId: line.salesOrderLineId,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    requiredQuantity: Number(line.requiredQuantity),
    unit: line.unit,
    bomReady: Boolean(line.selectedBomVersionId),
    selectedBomVersionId: line.selectedBomVersionId ?? undefined,
    selectedBomVersion: line.bomVersionSnapshot ?? undefined,
  }));

  return {
    id: demand.id,
    code: demand.code,
    salesOrderId: demand.salesOrderId,
    factoryCode: demand.factoryCode,
    factoryName: demand.factoryName,
    requiredAt: formatLocalDateTime(demand.requiredAt),
    status: demand.status,
    approvedAt: formatLocalDateTime(demand.approvedAt),
    createdAt: formatLocalDateTime(demand.createdAt),
    lines,
    lineCount: lines.length,
    readyLineCount: lines.filter((line) => line.bomReady).length,
    missingBomCount: lines.filter((line) => !line.bomReady).length,
  };
}
