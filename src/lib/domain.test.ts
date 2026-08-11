import { describe, expect, it } from "vitest";
import { aggregateApprovedDemand, calculateBomCost, calculateGrossRequirement, canTransitionWorkOrder, formatSequence } from "./domain";
import { boms, orders } from "./mock-data";

describe("Nora 核心业务规则", () => {
  it("按净用量和出成率计算毛料需求", () => {
    expect(calculateGrossRequirement(0.57, 0.95)).toBeCloseTo(0.6, 6);
    expect(() => calculateGrossRequirement(1, 0)).toThrow("出成率");
  });

  it("按毛料需求汇总 BOM 成本", () => {
    expect(calculateBomCost(boms[0])).toBeGreaterThan(16);
    expect(calculateBomCost(boms[0])).toBeLessThan(20);
  });

  it("只聚合已审核或生产中的订单需求", () => {
    const demand = aggregateApprovedDemand(orders);
    expect(demand.find((item) => item.productId === "p-001")?.quantity).toBe(1200);
    expect(demand.some((item) => item.orderIds.includes("o-047"))).toBe(false);
  });

  it("限制工单状态机的非法跳转", () => {
    expect(canTransitionWorkOrder("released", "in_progress")).toBe(true);
    expect(canTransitionWorkOrder("released", "completed")).toBe(false);
    expect(canTransitionWorkOrder("completed", "closed")).toBe(true);
  });

  it("按编号规则生成展示单号", () => {
    expect(formatSequence("SO", "2026-07-14", 48)).toBe("SO202607140048");
  });
});
