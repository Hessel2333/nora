import { describe, expect, it } from "vitest";
import {
  createDemandWorkspace,
  createOrderWorkspace,
  flattenVisibleRows,
  materialCoverage,
  materialShortage,
} from "./mrp-data";

describe("MRP visualization data", () => {
  it("keeps order graph and hierarchy rows on the same scaled scenario", () => {
    const full = createOrderWorkspace("o-018");
    const scaled = createOrderWorkspace("o-021");

    expect(full.summary.portions).toBe(2000);
    expect(scaled.summary.portions).toBe(1300);
    expect(scaled.summary.grossKg).toBeCloseTo(full.summary.grossKg * 0.65, 0);
    expect(full.rows.find((row) => row.entityId === "raw-chicken")?.gross).toBe(204.5);
  });

  it("collapses descendants while keeping the root visible", () => {
    const workspace = createOrderWorkspace("o-018");
    const rootOnly = flattenVisibleRows(workspace.rows, new Set());
    const dishes = flattenVisibleRows(workspace.rows, new Set(["row-order"]));

    expect(rootOnly.map((row) => row.id)).toEqual(["row-order"]);
    expect(dishes.some((row) => row.id === "row-gongbao")).toBe(true);
    expect(dishes.some((row) => row.id === "row-semi-chicken")).toBe(false);
  });

  it("calculates stock coverage and shortages from available stock", () => {
    const workspace = createDemandWorkspace("2026-08-06");
    const chicken = workspace.materials.find((item) => item.id === "raw-chicken");
    const pork = workspace.materials.find((item) => item.id === "raw-pork");

    expect(chicken).toBeDefined();
    expect(materialShortage(chicken!)).toBe(158);
    expect(materialCoverage(chicken!)).toBe(67);
    expect(materialShortage(pork!)).toBe(0);
    expect(workspace.summary.shortageKinds).toBeGreaterThan(0);
  });

  it("updates Sankey source and values for another production date", () => {
    const workspace = createDemandWorkspace("2026-08-08");
    const packaging = workspace.materials.find((item) => item.id === "packaging");
    const chicken = workspace.materials.find((item) => item.id === "raw-chicken");

    expect(workspace.sankeyNodes.some((node) => node.name === "8月8日订单")).toBe(true);
    expect(workspace.sankeyLinks[0].source).toBe("8月8日订单");
    expect(workspace.sankeyLinks[0].value).toBe(737.5);
    expect(workspace.scenario.portions).toBe(6608);
    expect(packaging?.demand).toBe(workspace.scenario.portions);
    expect(chicken?.contributions[0].formula).toContain("2,478份");
  });
});
