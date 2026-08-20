import type { InventoryStockBalance } from "@/lib/types";

export function inventoryExpirySignal(expiresAt: string | null, now = new Date()) {
  if (!expiresAt) return "none" as const;
  const expires = new Date(expiresAt.replace(" ", "T") + ":00+08:00");
  const days = Math.ceil((expires.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return "expired" as const;
  if (days <= 7) return "near" as const;
  return "normal" as const;
}

export function filterInventoryStock(rows: InventoryStockBalance[], query: string, locationId: string) {
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  return rows.filter((row) => {
    if (locationId && row.location.id !== locationId) return false;
    if (!normalized) return true;
    return `${row.product.code}${row.product.name}${row.lot.code}${row.lot.supplierLotCode ?? ""}${row.location.name}`
      .toLocaleLowerCase("zh-CN")
      .includes(normalized);
  });
}

export function inventoryStockMetrics(rows: InventoryStockBalance[], now = new Date()) {
  return {
    lotCount: rows.length,
    availableLotCount: rows.filter((row) => Number(row.availableQuantity) > 0).length,
    heldLotCount: rows.filter((row) => row.lot.qualityStatus !== "released").length,
    expiringLotCount: rows.filter((row) => inventoryExpirySignal(row.lot.expiresAt, now) !== "normal" && inventoryExpirySignal(row.lot.expiresAt, now) !== "none").length,
  };
}
