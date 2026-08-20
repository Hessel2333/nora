import { describe, expect, it } from "vitest";
import type { ProductionDemand } from "../../lib/types";
import { applyDemoDemandAllocations, filterProductionDemands, productionDemandMetrics } from "./production-demand-view";

function demand(input: Partial<ProductionDemand> & Pick<ProductionDemand, "id" | "code">): ProductionDemand {
  return {
    salesOrderId: `order-${input.id}`,
    factoryCode: "SZ-CENTRAL",
    factoryName: "深圳中央工厂",
    requiredAt: "2026-08-22 10:00",
    status: "pending_planning",
    approvedAt: "2026-08-20 09:00",
    createdAt: "2026-08-20 09:00",
    lines: [],
    lineCount: 1,
    readyLineCount: 1,
    missingBomCount: 0,
    ...input,
  };
}

describe("production demand view", () => {
  const now = new Date("2026-08-20T02:00:00.000Z");
  const rows = [
    demand({
      id: "blocked",
      code: "PD-BLOCKED",
      requiredAt: "2026-08-20 18:00",
      readyLineCount: 0,
      missingBomCount: 1,
      salesOrder: { id: "order-1", code: "SO-001", customerName: "南山门店", deliveryAt: "2026-08-20 18:00" },
    }),
    demand({ id: "ready", code: "PD-READY", requiredAt: "2026-08-23 10:00" }),
  ];

  it("filters blocked and searchable source-order fields", () => {
    expect(filterProductionDemands(rows, "blocked", "", now).map((item) => item.id)).toEqual(["blocked"]);
    expect(filterProductionDemands(rows, "all", "南山", now).map((item) => item.id)).toEqual(["blocked"]);
  });

  it("reports demand counts without summing quantities across units", () => {
    expect(productionDemandMetrics(rows, now)).toEqual({ pending: 2, ready: 1, blocked: 1, urgent: 1 });
  });

  it("projects demo allocations into remaining quantities and demand status", () => {
    const source = demand({
      id: "demo",
      code: "DEMO-PD-001",
      lines: [{
        id: "line-1",
        salesOrderLineId: "order-line-1",
        productId: "product-1",
        productCode: "CP0001",
        productName: "宫保鸡丁净菜包",
        requiredQuantity: 100,
        unit: "份",
        bomReady: true,
        snapshotComplete: true,
        processStepCount: 5,
        allocatedQuantity: "0.000",
        remainingQuantity: "100.000",
      }],
    });

    const [partial] = applyDemoDemandAllocations([source], { "line-1": 30 });
    const [planned] = applyDemoDemandAllocations([partial], { "line-1": 70 });

    expect(partial).toEqual(expect.objectContaining({ status: "partially_planned" }));
    expect(partial.lines[0]).toEqual(expect.objectContaining({ allocatedQuantity: "30.000", remainingQuantity: "70.000" }));
    expect(planned).toEqual(expect.objectContaining({ status: "planned" }));
    expect(planned.lines[0].remainingQuantity).toBe("0.000");
  });
});
