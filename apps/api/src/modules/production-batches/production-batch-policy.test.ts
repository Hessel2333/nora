import { describe, expect, it } from "vitest";
import {
  getBatchCompatibilityIssue,
  getBatchTransitionIssue,
  type BatchCandidate,
} from "./production-batch-policy.js";

const candidate: BatchCandidate = {
  factoryCode: "SZ-CENTRAL",
  productId: "product-1",
  unit: "份",
  selectedBomVersionId: "version-1",
  snapshotComplete: true,
};

describe("production batch compatibility", () => {
  it("accepts demands with the same frozen production basis", () => {
    expect(getBatchCompatibilityIssue([candidate, { ...candidate }])).toBeUndefined();
  });

  it.each([
    [{ snapshotComplete: false }, "snapshot_incomplete"],
    [{ factoryCode: "OTHER" }, "factory_mismatch"],
    [{ productId: "product-2" }, "product_mismatch"],
    [{ unit: "kg" }, "unit_mismatch"],
    [{ selectedBomVersionId: "version-2" }, "bom_version_mismatch"],
  ] as const)("rejects incompatible candidate %s", (change, issue) => {
    expect(getBatchCompatibilityIssue([candidate, { ...candidate, ...change }])).toBe(issue);
  });
});

describe("production batch transitions", () => {
  it("allows draft confirmation and confirmed release at the expected revision", () => {
    expect(getBatchTransitionIssue("draft", 1, 1, "confirm")).toBeUndefined();
    expect(getBatchTransitionIssue("confirmed", 2, 2, "release")).toBeUndefined();
  });

  it("rejects skipped states and stale revisions", () => {
    expect(getBatchTransitionIssue("draft", 1, 1, "release")).toBe("invalid_status");
    expect(getBatchTransitionIssue("confirmed", 2, 1, "release")).toBe("revision_conflict");
  });
});
