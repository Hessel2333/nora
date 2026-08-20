import { describe, expect, it } from "vitest";
import type { InventoryStockBalance } from "@/lib/types";
import { filterInventoryStock, inventoryExpirySignal, inventoryStockMetrics } from "./inventory-view";

const row: InventoryStockBalance = {
  id: "balance-1",
  location: { id: "location-1", code: "RAW-COLD-01", name: "原料冷藏库", type: "cold_storage" },
  product: { id: "product-1", code: "RM01234", name: "冷冻鸡胸肉", category: "禽肉类" },
  lot: {
    id: "lot-1",
    code: "OPEN-20260820-001",
    supplierLotCode: "SUP-A",
    qualityStatus: "released",
    receivedAt: "2026-08-20 09:00",
    productionAt: null,
    expiresAt: "2026-08-25 09:00",
  },
  onHandQuantity: "120.000",
  availableQuantity: "120.000",
  unit: "kg",
  revision: 1,
  updatedAt: "2026-08-20 09:00",
};

describe("inventory view", () => {
  it("filters by business identifiers and location", () => {
    expect(filterInventoryStock([row], "SUP-A", "location-1")).toEqual([row]);
    expect(filterInventoryStock([row], "鸡胸", "other-location")).toEqual([]);
  });

  it("classifies near-expiry and derives unit-safe lot metrics", () => {
    const now = new Date("2026-08-20T01:00:00.000Z");
    expect(inventoryExpirySignal(row.lot.expiresAt, now)).toBe("near");
    expect(inventoryStockMetrics([row], now)).toEqual({
      lotCount: 1,
      availableLotCount: 1,
      heldLotCount: 0,
      expiringLotCount: 1,
    });
  });
});
