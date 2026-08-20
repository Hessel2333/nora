import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it } from "vitest";
import type { RecipeSnapshot } from "../boms/recipe-snapshot.js";
import {
  calculateWorkOrderMaterialRequirements,
  isMaterialMovementAllowed,
} from "./work-order-material-policy.js";

const capturedAt = "2026-08-20T01:00:00.000Z";
const leaf = (id: string, code: string): RecipeSnapshot => ({
  schemaVersion: 2,
  capturedAt,
  asAt: capturedAt,
  product: { id, code, name: code, type: "raw", unit: "kg", unitCost: 10 },
  bomVersion: null,
  operations: [],
  components: [],
});
const snapshot: RecipeSnapshot = {
  schemaVersion: 2,
  capturedAt,
  asAt: capturedAt,
  product: { id: "finished", code: "CP0001", name: "净菜包", type: "finished", unit: "份", unitCost: 20 },
  bomVersion: {
    id: "version", bomId: "bom", bomCode: "BOM-CP0001", version: "V1",
    effectiveAt: capturedAt, effectiveTo: null, outputQuantity: 10, outputUnit: "份",
  },
  operations: [{
    code: "OP10", name: "切配", kind: "cut", sequence: 10, workCenter: "切配间",
    durationMinutes: 10, waitMinutes: 0, temperatureMin: null, temperatureMax: null, instructions: null,
  }],
  components: [
    {
      product: leaf("raw-1", "RM001").product,
      netQuantity: 2,
      yieldRate: 0.8,
      unit: "kg",
      unitCostSnapshot: 10,
      sortOrder: 0,
      notes: null,
      operationCode: "OP10",
      recipe: leaf("raw-1", "RM001"),
    },
  ],
};

describe("work order material policy", () => {
  it("expands the frozen snapshot and rounds planned requirements upward to inventory precision", () => {
    const requirements = calculateWorkOrderMaterialRequirements(snapshot, new Prisma.Decimal("12.345"));
    expect(requirements).toHaveLength(1);
    expect(requirements[0]).toEqual(expect.objectContaining({ productCode: "RM001", unit: "kg" }));
    expect(requirements[0]?.plannedQuantity.toFixed(3)).toBe("3.087");
  });

  it("keeps issue and return guards explicit", () => {
    expect(isMaterialMovementAllowed("pending", "issue")).toBe(true);
    expect(isMaterialMovementAllowed("exception", "issue")).toBe(false);
    expect(isMaterialMovementAllowed("exception", "return")).toBe(true);
    expect(isMaterialMovementAllowed("completed", "return")).toBe(false);
  });
});
