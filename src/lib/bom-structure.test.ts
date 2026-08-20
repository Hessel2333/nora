import { describe, expect, it } from "vitest";
import type { Bom, SalesOrder } from "./types";
import {
  aggregateExplodedMaterials,
  buildBomStructure,
  calculateRecipeUsageTrial,
  explodeDraftOrder,
  getOrderBomCoverage,
} from "./bom-structure";

const boms: Bom[] = [
  {
    id: "finished-bom",
    code: "BOM-FG",
    productId: "finished",
    productName: "成品",
    versionId: "v1",
    version: "V1",
    previousVersion: "",
    outputQuantity: 1,
    outputUnit: "份",
    status: "effective",
    effectiveAt: "2026-01-01T00:00:00.000Z",
    operations: [{ id: "op-finished", code: "OP10", name: "配料", kind: "mix", sequence: 10, durationMinutes: 1, waitMinutes: 0 }],
    items: [
      { id: "semi-item", componentId: "semi", componentCode: "SF01", operationCode: "OP10", name: "半成品", type: "semi", unit: "kg", netQuantity: 0.5, yieldRate: 1, unitCost: 10, level: 1 },
      { id: "raw-a", componentId: "raw-a", componentCode: "RM01", operationCode: "OP10", name: "原料 A", type: "raw", unit: "kg", netQuantity: 0.2, yieldRate: 0.8, unitCost: 8, level: 1 },
    ],
  },
  {
    id: "semi-bom",
    code: "BOM-SF",
    productId: "semi",
    productName: "半成品",
    versionId: "v2",
    version: "V2",
    previousVersion: "",
    outputQuantity: 1,
    outputUnit: "kg",
    status: "effective",
    effectiveAt: "2026-01-01T00:00:00.000Z",
    operations: [{ id: "op-semi", code: "OP10", name: "配料", kind: "mix", sequence: 10, durationMinutes: 1, waitMinutes: 0 }],
    items: [
      { id: "raw-b", componentId: "raw-b", componentCode: "RM02", operationCode: "OP10", name: "原料 B", type: "raw", unit: "kg", netQuantity: 0.6, yieldRate: 0.75, unitCost: 5, level: 1 },
    ],
  },
];

const order: SalesOrder = {
  id: "order",
  code: "SO1",
  customerId: "customer",
  customerName: "客户",
  deliveryAt: "2026-08-20 11:00",
  status: "pending",
  source: "手工录入",
  createdAt: "2026-08-19 08:00",
  contact: "联系人",
  phone: "1",
  address: "地址",
  lines: [{ id: "line", productId: "finished", productName: "成品", quantity: 2, unit: "份", unitPrice: 20 }],
};

describe("BOM structure", () => {
  it("recursively scales nested semi-finished recipes", () => {
    const root = buildBomStructure(boms[0], boms, 2, new Date("2026-08-19T00:00:00Z"));
    expect(root.children[0].grossQuantity).toBe(1);
    expect(root.children[0].operationName).toBe("配料");
    expect(root.children[0].children[0].grossQuantity).toBe(0.8);
    expect(root.children[0].children[0].operationCode).toBe("OP10");
    expect(root.children[1].grossQuantity).toBe(0.5);
  });

  it("aggregates only leaf materials without double-counting semi-finished cost", () => {
    const items = aggregateExplodedMaterials(buildBomStructure(boms[0], boms, 1, new Date("2026-08-19T00:00:00Z")));
    expect(items.map((item) => item.code).sort()).toEqual(["RM01", "RM02"]);
    expect(items.reduce((sum, item) => sum + item.estimatedCost, 0)).toBe(4);
  });

  it("reports order coverage and creates a pre-approval trial explosion", () => {
    expect(getOrderBomCoverage(order, boms, new Date("2026-08-19T00:00:00Z")).ready).toBe(true);
    const explosion = explodeDraftOrder(order, boms, new Date("2026-08-19T00:00:00Z"));
    expect(explosion.missing).toEqual([]);
    expect(explosion.items).toHaveLength(2);
  });

  it("keeps recipe usage trials scoped to the selected recipe", () => {
    const unrelatedBom: Bom = {
      ...boms[0],
      id: "unrelated-bom",
      code: "BOM-OTHER",
      productId: "other-finished",
      productName: "其他配菜包",
      versionId: "other-v1",
      items: [
        {
          id: "other-raw",
          componentId: "other-raw",
          componentCode: "RM-OTHER",
          operationCode: "OP10",
          name: "其他原料",
          type: "raw",
          unit: "kg",
          netQuantity: 1,
          yieldRate: 1,
          unitCost: 9,
          level: 1,
        },
      ],
    };

    const trial = calculateRecipeUsageTrial(
      boms[0],
      [...boms, unrelatedBom],
      10,
      new Date("2026-08-19T00:00:00Z"),
    );

    expect(trial.bomId).toBe("finished-bom");
    expect(trial.scaleFactor).toBe(10);
    expect(trial.items.map((item) => item.code).sort()).toEqual(["RM01", "RM02"]);
    expect(trial.items.some((item) => item.code === "RM-OTHER")).toBe(false);
  });
});
