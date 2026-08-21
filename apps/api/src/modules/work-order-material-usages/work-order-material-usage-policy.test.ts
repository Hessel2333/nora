import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it } from "vitest";
import {
  getMaterialReconciliationIssue,
  isMaterialUsageAllowed,
  remainingIssuedQuantity,
} from "./work-order-material-usage-policy.js";

const decimal = (value: string) => new Prisma.Decimal(value);

describe("work order material usage policy", () => {
  it("only permits usage records while the work order is running", () => {
    expect(isMaterialUsageAllowed("running")).toBe(true);
    expect(isMaterialUsageAllowed("paused")).toBe(false);
    expect(isMaterialUsageAllowed("exception")).toBe(false);
  });

  it("calculates the remaining issued quantity without going below zero", () => {
    expect(remainingIssuedQuantity(decimal("5"), decimal("3.5"), decimal("0.5")).toFixed(3)).toBe("1.000");
    expect(remainingIssuedQuantity(decimal("5"), decimal("5"), decimal("1")).toFixed(3)).toBe("0.000");
  });

  it("distinguishes missing issues from issued quantities without a disposition", () => {
    expect(getMaterialReconciliationIssue([{ planned: decimal("5"), netIssued: decimal("4"), consumed: decimal("4"), scrapped: decimal("0") }])).toBe("not_fully_issued");
    expect(getMaterialReconciliationIssue([{ planned: decimal("5"), netIssued: decimal("5"), consumed: decimal("4"), scrapped: decimal("0") }])).toBe("unreconciled");
    expect(getMaterialReconciliationIssue([{ planned: decimal("5"), netIssued: decimal("5"), consumed: decimal("4"), scrapped: decimal("1") }])).toBeUndefined();
  });
});
