import { describe, expect, it } from "vitest";
import { calculateGrossQuantity, getBomVersionValidityState, isEffectiveAt } from "./bom-policy.js";

describe("BOM quantity policy", () => {
  it("accounts for yield and order factor", () => {
    expect(calculateGrossQuantity(0.57, 0.95, 100)).toBeCloseTo(60, 6);
  });

  it("rejects invalid yield", () => {
    expect(() => calculateGrossQuantity(1, 0)).toThrow("出成率");
    expect(() => calculateGrossQuantity(1, 1.01)).toThrow("出成率");
  });
});

describe("BOM temporal policy", () => {
  const current = {
    status: "effective" as const,
    effectiveAt: new Date("2026-08-01T00:00:00Z"),
    effectiveTo: new Date("2026-09-01T00:00:00Z"),
  };

  it("uses a published version only inside its half-open validity window", () => {
    expect(isEffectiveAt(current, new Date("2026-08-31T23:59:59Z"))).toBe(true);
    expect(isEffectiveAt(current, new Date("2026-09-01T00:00:00Z"))).toBe(false);
  });

  it("keeps retired versions queryable for their historical window", () => {
    expect(isEffectiveAt({ ...current, status: "retired" }, new Date("2026-08-15T00:00:00Z"))).toBe(true);
  });

  it("never treats drafts as effective", () => {
    expect(isEffectiveAt({ ...current, status: "draft" }, new Date("2026-08-15T00:00:00Z"))).toBe(false);
  });

  it("distinguishes a scheduled publication from the version that is current today", () => {
    const now = new Date("2026-08-15T00:00:00Z");
    expect(getBomVersionValidityState(current, now)).toBe("current");
    expect(getBomVersionValidityState({
      status: "effective",
      effectiveAt: new Date("2026-09-01T00:00:00Z"),
      effectiveTo: null,
    }, now)).toBe("scheduled");
  });

  it("labels closed windows as historical even when they remain queryable for audit", () => {
    expect(getBomVersionValidityState(current, new Date("2026-10-01T00:00:00Z"))).toBe("historical");
  });
});
