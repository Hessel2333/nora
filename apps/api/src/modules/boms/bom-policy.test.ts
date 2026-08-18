import { describe, expect, it } from "vitest";
import { calculateGrossQuantity } from "./bom-policy.js";

describe("BOM quantity policy", () => {
  it("accounts for yield and order factor", () => {
    expect(calculateGrossQuantity(0.57, 0.95, 100)).toBeCloseTo(60, 6);
  });

  it("rejects invalid yield", () => {
    expect(() => calculateGrossQuantity(1, 0)).toThrow("出成率");
    expect(() => calculateGrossQuantity(1, 1.01)).toThrow("出成率");
  });
});
