import { getOrderBomCoverage } from "../../lib/bom-structure";
import type {
  Bom,
  ProductionDemand,
  ProductionDemandStatus,
  SalesOrder,
  StatusTone,
} from "../../lib/types";

export type ProductionDemandFilter = "attention" | "all" | "ready" | "blocked" | ProductionDemandStatus;

export const productionDemandStatusMeta: Record<ProductionDemandStatus, { label: string; tone: StatusTone }> = {
  pending_planning: { label: "待计划", tone: "warning" },
  partially_planned: { label: "部分分配", tone: "info" },
  planned: { label: "已分配", tone: "purple" },
  completed: { label: "已完成", tone: "success" },
  cancelled: { label: "已取消", tone: "neutral" },
};

function parseLocalDateTime(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}:00+08:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function demandDeliverySignal(demand: ProductionDemand, now = new Date()) {
  if (demand.status === "completed") return { label: "已完成", tone: "success" as StatusTone };
  if (demand.status === "cancelled") return { label: "已取消", tone: "neutral" as StatusTone };
  const hours = (parseLocalDateTime(demand.requiredAt).getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return { label: "已超过需求时间", tone: "danger" as StatusTone };
  if (hours <= 12) return { label: `${Math.max(1, Math.ceil(hours))} 小时内`, tone: "warning" as StatusTone };
  if (hours <= 36) return { label: "明日需求", tone: "info" as StatusTone };
  return { label: demand.requiredAt, tone: "neutral" as StatusTone };
}

export function filterProductionDemands(
  demands: ProductionDemand[],
  filter: ProductionDemandFilter,
  query: string,
  now = new Date(),
) {
  const normalized = query.trim().toLowerCase();
  return [...demands]
    .sort((left, right) => parseLocalDateTime(left.requiredAt).getTime() - parseLocalDateTime(right.requiredAt).getTime())
    .filter((demand) => {
      const deliveryTone = demandDeliverySignal(demand, now).tone;
      const matchesFilter = filter === "all"
        ? true
        : filter === "attention"
          ? demand.missingBomCount > 0 || deliveryTone === "danger" || deliveryTone === "warning"
          : filter === "ready"
            ? demand.lineCount > 0 && demand.readyLineCount === demand.lineCount
            : filter === "blocked"
              ? demand.missingBomCount > 0
              : demand.status === filter;
      const order = demand.salesOrder;
      const searchText = [
        demand.code,
        order?.code,
        order?.customerName,
        ...demand.lines.flatMap((line) => [line.productCode, line.productName]),
      ].filter(Boolean).join("").toLowerCase();
      return matchesFilter && (!normalized || searchText.includes(normalized));
    });
}

export function productionDemandMetrics(demands: ProductionDemand[], now = new Date()) {
  return demands.reduce(
    (metrics, demand) => {
      if (demand.status === "pending_planning") metrics.pending += 1;
      if (demand.lineCount > 0 && demand.readyLineCount === demand.lineCount) metrics.ready += 1;
      if (demand.missingBomCount > 0) metrics.blocked += 1;
      const deliveryTone = demandDeliverySignal(demand, now).tone;
      if (deliveryTone === "danger" || deliveryTone === "warning") metrics.urgent += 1;
      return metrics;
    },
    { pending: 0, ready: 0, blocked: 0, urgent: 0 },
  );
}

export function buildDemoProductionDemands(orders: SalesOrder[], boms: Bom[]): ProductionDemand[] {
  return orders
    .filter((order) => !["draft", "pending"].includes(order.status))
    .map((order) => {
      const status: ProductionDemandStatus = order.status === "completed" || order.status === "reconciled"
        ? "completed"
        : order.status === "in_production" || order.status === "delivering"
          ? "planned"
          : "pending_planning";
      const allocationComplete = status === "planned" || status === "completed";
      const coverage = getOrderBomCoverage(order, boms);
      const lines = coverage.lines.map(({ line, bom }, index) => ({
        id: `demo-demand-line-${order.id}-${index}`,
        salesOrderLineId: line.id,
        productId: line.productId,
        productCode: line.productCode ?? line.productId,
        productName: line.productName,
        requiredQuantity: line.quantity,
        unit: line.unit,
        bomReady: Boolean(bom),
        snapshotComplete: Boolean(bom),
        snapshotSchemaVersion: bom ? 2 : undefined,
        processStepCount: bom?.operations.length ?? 0,
        allocatedQuantity: allocationComplete ? line.quantity.toFixed(3) : "0.000",
        remainingQuantity: allocationComplete ? "0.000" : line.quantity.toFixed(3),
        selectedBomVersionId: bom?.versionId ?? bom?.id,
        selectedBomVersion: bom?.version,
      }));
      return {
        id: `demo-demand-${order.id}`,
        code: `DEMO-PD-${order.code.replace(/^SO/, "")}`,
        salesOrderId: order.id,
        factoryCode: "DEMO-FACTORY",
        factoryName: "深圳中央工厂",
        requiredAt: order.deliveryAt,
        status,
        approvedAt: order.createdAt,
        createdAt: order.createdAt,
        salesOrder: {
          id: order.id,
          code: order.code,
          customerName: order.customerName,
          deliveryAt: order.deliveryAt,
        },
        lines,
        lineCount: lines.length,
        readyLineCount: lines.filter((line) => line.bomReady).length,
        missingBomCount: lines.filter((line) => !line.bomReady).length,
      };
    });
}

export function applyDemoDemandAllocations(
  demands: ProductionDemand[],
  addedQuantities: Record<string, number>,
): ProductionDemand[] {
  return demands.map((demand) => {
    if (!demand.lines.some((line) => addedQuantities[line.id] !== undefined)) return demand;
    const lines = demand.lines.map((line) => {
      const added = addedQuantities[line.id] ?? 0;
      const allocated = Math.min(line.requiredQuantity, Number(line.allocatedQuantity ?? 0) + added);
      return {
        ...line,
        allocatedQuantity: allocated.toFixed(3),
        remainingQuantity: Math.max(0, line.requiredQuantity - allocated).toFixed(3),
      };
    });
    const fullyAllocated = lines.every((line) => Number(line.remainingQuantity) === 0);
    const partiallyAllocated = lines.some((line) => Number(line.allocatedQuantity) > 0);
    return {
      ...demand,
      status: fullyAllocated ? "planned" : partiallyAllocated ? "partially_planned" : "pending_planning",
      lines,
    };
  });
}
