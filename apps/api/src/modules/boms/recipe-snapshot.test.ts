import { describe, expect, it } from "vitest";
import { isCompleteRecipeSnapshot } from "./recipe-snapshot.js";

const leaf = {
  schemaVersion: 1,
  capturedAt: "2026-08-18T08:00:00.000Z",
  asAt: "2026-08-20T03:00:00.000Z",
  product: { id: "raw-1", code: "RM001", name: "土豆", type: "raw", unit: "kg", unitCost: 4.2 },
  bomVersion: null,
  components: [],
} as const;

describe("recipe snapshot validation", () => {
  it("accepts a complete recursive snapshot", () => {
    expect(isCompleteRecipeSnapshot({
      schemaVersion: 1,
      capturedAt: "2026-08-18T08:00:00.000Z",
      asAt: "2026-08-20T03:00:00.000Z",
      product: { id: "finished-1", code: "CP001", name: "土豆丝", type: "finished", unit: "kg", unitCost: 8 },
      bomVersion: {
        id: "version-1",
        bomId: "bom-1",
        bomCode: "BOM-CP001",
        version: "V1",
        effectiveAt: "2026-08-01T00:00:00.000Z",
        effectiveTo: null,
        outputQuantity: 1,
        outputUnit: "kg",
      },
      components: [{
        product: leaf.product,
        netQuantity: 1.2,
        yieldRate: 0.9,
        unit: "kg",
        unitCostSnapshot: 4.2,
        sortOrder: 0,
        notes: null,
        recipe: leaf,
      }],
    })).toBe(true);
  });

  it("fails closed for legacy or structurally incomplete snapshots", () => {
    expect(isCompleteRecipeSnapshot({ schemaVersion: 0, incomplete: true })).toBe(false);
    expect(isCompleteRecipeSnapshot({ ...leaf, components: [{}] })).toBe(false);
    expect(isCompleteRecipeSnapshot({ ...leaf, bomVersion: {}, components: [] })).toBe(false);
  });

  it("accepts v2 process steps and rejects phase inputs that reference another step", () => {
    const leafV2 = { ...leaf, schemaVersion: 2, operations: [] } as const;
    const snapshot = {
      schemaVersion: 2,
      capturedAt: "2026-08-18T08:00:00.000Z",
      asAt: "2026-08-20T03:00:00.000Z",
      product: { id: "finished-1", code: "CP001", name: "土豆丝", type: "finished", unit: "kg", unitCost: 8 },
      bomVersion: {
        id: "version-1",
        bomId: "bom-1",
        bomCode: "BOM-CP001",
        version: "V2",
        effectiveAt: "2026-08-01T00:00:00.000Z",
        effectiveTo: null,
        outputQuantity: 1,
        outputUnit: "kg",
      },
      operations: [{
        code: "OP10",
        name: "清洗",
        kind: "wash",
        sequence: 10,
        workCenter: "蔬菜前处理",
        durationMinutes: 5,
        waitMinutes: 0,
        temperatureMin: null,
        temperatureMax: null,
        instructions: null,
      }],
      components: [{
        product: leaf.product,
        operationCode: "OP10",
        netQuantity: 1.2,
        yieldRate: 0.9,
        unit: "kg",
        unitCostSnapshot: 4.2,
        sortOrder: 0,
        notes: null,
        recipe: leafV2,
      }],
    } as const;

    expect(isCompleteRecipeSnapshot(snapshot)).toBe(true);
    expect(isCompleteRecipeSnapshot({
      ...snapshot,
      operations: [{ ...snapshot.operations[0], kind: "unsupported_final_process" }],
    })).toBe(false);
    expect(isCompleteRecipeSnapshot({
      ...snapshot,
      components: [{ ...snapshot.components[0], operationCode: "OP99" }],
    })).toBe(false);
  });
});
