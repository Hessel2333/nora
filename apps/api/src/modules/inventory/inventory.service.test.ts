import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { InventoryService } from "./inventory.service.js";

const now = new Date("2026-08-20T01:00:00.000Z");
const location = {
  id: "10000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  factoryCode: "SZ-CENTRAL",
  code: "RAW-COLD-01",
  name: "原料冷藏库",
  type: "cold_storage" as const,
  active: true,
  createdBy: "seed:demo-data",
  createdAt: now,
  updatedAt: now,
};
const product = {
  id: "20000000-0000-4000-8000-000000000004",
  organizationId: DEFAULT_ORGANIZATION_ID,
  code: "RM01234",
  name: "冷冻鸡胸肉",
  type: "raw" as const,
  category: "禽肉类",
  unit: "kg",
  cost: new Prisma.Decimal("20.7"),
  price: new Prisma.Decimal("0"),
  stock: new Prisma.Decimal("0"),
  safetyStock: new Prisma.Decimal("200"),
  taxRate: new Prisma.Decimal("9"),
  tags: [],
  status: "active" as const,
  createdAt: now,
  updatedAt: now,
};
const lot = {
  id: "30000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  productId: product.id,
  code: "OPEN-20260820-001",
  supplierLotCode: null,
  qualityStatus: "released" as const,
  receivedAt: now,
  productionAt: null,
  expiresAt: new Date("2026-09-20T01:00:00.000Z"),
  createdBy: "仓储主管",
  createdAt: now,
};
const transaction = {
  id: "40000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  locationId: location.id,
  productId: product.id,
  lotId: lot.id,
  type: "opening_balance" as const,
  direction: "inbound" as const,
  quantity: new Prisma.Decimal("120"),
  unit: "kg",
  sourceType: "opening_balance",
  sourceId: null,
  referenceCode: lot.code,
  note: "上线盘点",
  actor: "仓储主管",
  idempotencyKey: "inventory-opening:key-1",
  occurredAt: now,
  createdAt: now,
  location,
  product,
  lot,
};
const balance = {
  id: "50000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  locationId: location.id,
  productId: product.id,
  lotId: lot.id,
  onHandQuantity: new Prisma.Decimal("120"),
  revision: 1,
  updatedAt: now,
  location,
  product,
  lot,
};
const input = {
  locationId: location.id,
  productId: product.id,
  lotCode: lot.code,
  quantity: "120.000",
  unit: "kg",
  qualityStatus: "released" as const,
  receivedAt: now.toISOString(),
  expiresAt: lot.expiresAt.toISOString(),
  note: "上线盘点",
  actor: "仓储主管",
};

function createService(options: { repeated?: boolean; productUnit?: string; missingLocation?: boolean } = {}) {
  const productRecord = { ...product, unit: options.productUnit ?? product.unit };
  const tx = {
    inventoryTransaction: {
      findFirst: vi.fn().mockResolvedValue(options.repeated ? transaction : null),
      create: vi.fn().mockResolvedValue(transaction),
    },
    inventoryLocation: {
      findFirst: vi.fn().mockResolvedValue(options.missingLocation ? null : location),
    },
    product: { findFirst: vi.fn().mockResolvedValue(productRecord) },
    inventoryLot: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(lot),
    },
    stockBalanceProjection: {
      create: vi.fn().mockResolvedValue(balance),
      findFirstOrThrow: vi.fn().mockResolvedValue(balance),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    inventoryTransaction: { findFirst: vi.fn() },
    stockBalanceProjection: { findFirstOrThrow: vi.fn() },
  };
  return { service: new InventoryService(prisma as never), prisma, tx };
}

describe("InventoryService.createOpeningBalance", () => {
  it("atomically creates a lot, an immutable transaction and the matching balance", async () => {
    const { service, prisma, tx } = createService();
    const result = await service.createOpeningBalance(input, "inventory-opening:key-1");

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.inventoryLot.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: DEFAULT_ORGANIZATION_ID, code: lot.code }),
    }));
    expect(tx.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: new Prisma.Decimal("120"), type: "opening_balance" }),
    }));
    expect(tx.stockBalanceProjection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ onHandQuantity: new Prisma.Decimal("120") }),
    }));
    expect(result.balance).toEqual(expect.objectContaining({ onHandQuantity: "120.000", availableQuantity: "120.000" }));
  });

  it("returns the same transaction and balance for a repeated idempotency key", async () => {
    const { service, tx } = createService({ repeated: true });
    const result = await service.createOpeningBalance(input, "inventory-opening:key-1");

    expect(tx.inventoryLot.create).not.toHaveBeenCalled();
    expect(tx.stockBalanceProjection.findFirstOrThrow).toHaveBeenCalled();
    expect(result.transaction.id).toBe(transaction.id);
  });

  it("rejects resources outside the organization boundary", async () => {
    const { service, tx } = createService({ missingLocation: true });
    await expect(service.createOpeningBalance(input, "inventory-opening:key-2")).rejects.toBeInstanceOf(NotFoundException);
    expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
  });

  it("rejects a unit that differs from the product inventory unit", async () => {
    const { service, tx } = createService({ productUnit: "份" });
    await expect(service.createOpeningBalance(input, "inventory-opening:key-3")).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventoryLot.create).not.toHaveBeenCalled();
  });
});

describe("InventoryService.listStock", () => {
  it("always scopes the stock projection query to the current organization", async () => {
    const prisma = {
      stockBalanceProjection: { findMany: vi.fn().mockResolvedValue([balance]) },
    };
    const service = new InventoryService(prisma as never);
    const result = await service.listStock({ productId: product.id });

    expect(prisma.stockBalanceProjection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: DEFAULT_ORGANIZATION_ID, productId: product.id }),
    }));
    expect(result.data[0]).toEqual(expect.objectContaining({ unit: "kg", onHandQuantity: "120.000" }));
  });
});
