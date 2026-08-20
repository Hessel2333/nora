import { describe, expect, it } from "vitest";
import { presentProductionDemand } from "./production-demand.presenter.js";

const now = new Date("2026-08-19T04:00:00.000Z");

function demandWithSnapshot(recipeSnapshot: unknown) {
  return {
    id: "demand-1",
    organizationId: "00000000-0000-4000-8000-000000000001",
    code: "PD202608190001",
    salesOrderId: "order-1",
    factoryCode: "SZ-CENTRAL",
    factoryName: "深圳中央工厂",
    requiredAt: now,
    status: "pending_planning" as const,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
    lines: [{
      id: "line-1",
      productionDemandId: "demand-1",
      salesOrderLineId: "order-line-1",
      productId: "product-1",
      productCode: "CP0001",
      productName: "宫保鸡丁",
      requiredQuantity: 10,
      unit: "份",
      selectedBomVersionId: "version-1",
      bomVersionSnapshot: "V2",
      recipeSnapshot,
      sortOrder: 0,
      createdAt: now,
    }],
  };
}

const v2Snapshot = {
  schemaVersion: 2,
  capturedAt: now.toISOString(),
  asAt: now.toISOString(),
  product: { id: "product-1", code: "CP0001", name: "宫保鸡丁", type: "finished", unit: "份", unitCost: 12 },
  bomVersion: {
    id: "version-1",
    bomId: "bom-1",
    bomCode: "BOM-CP0001",
    version: "V2",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    effectiveTo: null,
    outputQuantity: 1,
    outputUnit: "份",
  },
  operations: [{
    code: "OP10",
    name: "清洗",
    kind: "wash",
    sequence: 10,
    workCenter: "前处理",
    durationMinutes: 5,
    waitMinutes: 0,
    temperatureMin: null,
    temperatureMax: null,
    instructions: null,
  }],
  components: [],
};

describe("presentProductionDemand", () => {
  it("reports a complete v2 process snapshot as production ready", () => {
    const presented = presentProductionDemand(demandWithSnapshot(v2Snapshot) as never);

    expect(presented.lines[0]).toEqual(expect.objectContaining({
      bomReady: true,
      snapshotComplete: true,
      snapshotSchemaVersion: 2,
      processStepCount: 1,
    }));
    expect(presented.readyLineCount).toBe(1);
  });

  it("does not report a legacy placeholder as production ready", () => {
    const presented = presentProductionDemand(demandWithSnapshot({
      schemaVersion: 0,
      incomplete: true,
      reason: "legacy-demand-without-recursive-recipe-snapshot",
    }) as never);

    expect(presented.lines[0]).toEqual(expect.objectContaining({
      bomReady: false,
      snapshotComplete: false,
      processStepCount: 0,
    }));
    expect(presented.missingBomCount).toBe(1);
  });
});
