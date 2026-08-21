import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
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
const materialWorkOrder = {
  id: "90000000-0000-4000-8000-000000000001",
  code: "WO202608200001",
  productName: "宫保鸡丁净菜包",
  plannedQuantity: new Prisma.Decimal("10"),
  unit: "份",
  status: "pending" as const,
  revision: 1,
  workCenter: "肉类前处理",
  recipeSnapshot: {
    schemaVersion: 2,
    capturedAt: now.toISOString(),
    asAt: now.toISOString(),
    product: { id: "finished-1", code: "CP0001", name: "宫保鸡丁净菜包", type: "finished", unit: "份", unitCost: 20 },
    bomVersion: {
      id: "version-1",
      bomId: "bom-1",
      bomCode: "BOM-CP0001",
      version: "V1",
      effectiveAt: now.toISOString(),
      effectiveTo: null,
      outputQuantity: 1,
      outputUnit: "份",
    },
    operations: [{
      code: "OP10",
      name: "切配",
      kind: "cut",
      sequence: 10,
      workCenter: "肉类前处理",
      durationMinutes: 10,
      waitMinutes: 0,
      temperatureMin: null,
      temperatureMax: null,
      instructions: null,
    }],
    components: [{
      product: { id: product.id, code: product.code, name: product.name, type: "raw", unit: "kg", unitCost: 20.7 },
      netQuantity: 0.1,
      yieldRate: 1,
      unit: "kg",
      unitCostSnapshot: 20.7,
      sortOrder: 0,
      notes: null,
      operationCode: "OP10",
      recipe: {
        schemaVersion: 2,
        capturedAt: now.toISOString(),
        asAt: now.toISOString(),
        product: { id: product.id, code: product.code, name: product.name, type: "raw", unit: "kg", unitCost: 20.7 },
        bomVersion: null,
        operations: [],
        components: [],
      },
    }],
  },
};
const materialTransaction = {
  ...transaction,
  id: "40000000-0000-4000-8000-000000000009",
  type: "issue" as const,
  direction: "outbound" as const,
  quantity: new Prisma.Decimal("0.5"),
  sourceType: "work_order",
  sourceId: materialWorkOrder.id,
  referenceCode: materialWorkOrder.code,
  workOrderId: materialWorkOrder.id,
  workOrder: {
    id: materialWorkOrder.id,
    code: materialWorkOrder.code,
    productName: materialWorkOrder.productName,
  },
  workstationCode: "肉类前处理",
  deviceId: "WEB-DEVELOPMENT",
  idempotencyKey: "work-order-issue:key-1",
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

  it("rejects a zero opening quantity before starting a transaction", async () => {
    const { service, prisma } = createService();
    await expect(service.createOpeningBalance(
      { ...input, quantity: "0.000" },
      "inventory-opening:key-zero",
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("InventoryService.listStock", () => {
  it("always scopes the stock projection query to the current organization", async () => {
    const prisma = {
      stockBalanceProjection: { findMany: vi.fn().mockResolvedValue([balance]) },
    };
    const service = new InventoryService(prisma as never);
    const result = await service.listStock({ productId: product.id, lotId: lot.id });

    expect(prisma.stockBalanceProjection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: DEFAULT_ORGANIZATION_ID,
        productId: product.id,
        lotId: lot.id,
      }),
    }));
    expect(result.data[0]).toEqual(expect.objectContaining({ unit: "kg", onHandQuantity: "120.000" }));
  });
});

describe("InventoryService work order material movements", () => {
  function createMaterialService(options: {
    repeated?: boolean;
    previousMovements?: Array<Pick<typeof materialTransaction, "type" | "quantity" | "locationId" | "lotId">>;
    previousUsages?: Array<{ disposition: "consumed" | "scrapped"; quantity: Prisma.Decimal }>;
    status?: typeof materialWorkOrder.status | "exception";
  } = {}) {
    const currentWorkOrder = { ...materialWorkOrder, status: options.status ?? materialWorkOrder.status };
    const balanceAfter = {
      ...balance,
      onHandQuantity: new Prisma.Decimal("119.5"),
      revision: 2,
    };
    const tx = {
      $queryRaw: vi.fn(),
      workOrder: { findFirst: vi.fn().mockResolvedValue(currentWorkOrder) },
      inventoryTransaction: {
        findFirst: vi.fn().mockResolvedValue(options.repeated ? materialTransaction : null),
        findMany: vi.fn()
          .mockResolvedValueOnce(options.previousMovements ?? [])
          .mockResolvedValue([materialTransaction]),
        create: vi.fn().mockResolvedValue(materialTransaction),
      },
      workOrderMaterialUsage: {
        findMany: vi.fn().mockResolvedValue(options.previousUsages ?? []),
      },
      stockBalanceProjection: {
        findFirst: vi.fn().mockResolvedValue(balance),
        findFirstOrThrow: vi.fn().mockResolvedValue(balanceAfter),
        findMany: vi.fn().mockResolvedValue([balanceAfter]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      inventoryTransaction: { findFirst: vi.fn() },
      stockBalanceProjection: { findFirstOrThrow: vi.fn() },
      workOrder: { findFirst: vi.fn() },
    };
    return { service: new InventoryService(prisma as never), prisma, tx };
  }

  const movementInput = {
    stockBalanceId: balance.id,
    expectedBalanceRevision: 1,
    quantity: "0.500",
    unit: "kg",
    workstationCode: "肉类前处理",
    deviceId: "WEB-DEVELOPMENT",
    actor: "仓储人员",
  };

  it("atomically appends an issue and decrements the locked lot balance", async () => {
    const { service, tx } = createMaterialService();
    const result = await service.issueWorkOrderMaterial(
      materialWorkOrder.id,
      movementInput,
      "work-order-issue:key-1",
    );

    expect(tx.stockBalanceProjection.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: balance.id, revision: 1, onHandQuantity: { gte: new Prisma.Decimal("0.5") } }),
      data: {
        onHandQuantity: { decrement: new Prisma.Decimal("0.5") },
        revision: { increment: 1 },
      },
    }));
    expect(tx.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        workOrderId: materialWorkOrder.id,
        type: "issue",
        direction: "outbound",
        sourceType: "work_order",
      }),
    }));
    expect(result.transaction).toEqual(expect.objectContaining({ type: "issue", quantity: "0.500" }));
  });

  it("returns the repeated movement without a second balance update", async () => {
    const { service, tx } = createMaterialService({ repeated: true });
    const result = await service.issueWorkOrderMaterial(
      materialWorkOrder.id,
      movementInput,
      "work-order-issue:key-1",
    );
    expect(tx.stockBalanceProjection.updateMany).not.toHaveBeenCalled();
    expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(result.transaction.id).toBe(materialTransaction.id);
  });

  it("rejects issue above the remaining frozen requirement", async () => {
    const { service, tx } = createMaterialService();
    await expect(service.issueWorkOrderMaterial(
      materialWorkOrder.id,
      { ...movementInput, quantity: "1.001" },
      "work-order-issue:key-2",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockBalanceProjection.updateMany).not.toHaveBeenCalled();
  });

  it("rejects a return above the exact lot net issued quantity", async () => {
    const { service, tx } = createMaterialService();
    await expect(service.returnWorkOrderMaterial(
      materialWorkOrder.id,
      movementInput,
      "work-order-return:key-1",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockBalanceProjection.updateMany).not.toHaveBeenCalled();
  });

  it("does not allow already consumed material to be returned to inventory", async () => {
    const { service, tx } = createMaterialService({
      previousMovements: [{
        type: "issue",
        quantity: new Prisma.Decimal("0.500"),
        locationId: location.id,
        lotId: lot.id,
      }],
      previousUsages: [{ disposition: "consumed", quantity: new Prisma.Decimal("0.250") }],
    });
    await expect(service.returnWorkOrderMaterial(
      materialWorkOrder.id,
      movementInput,
      "work-order-return:key-consumed",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockBalanceProjection.updateMany).not.toHaveBeenCalled();
  });

  it("rejects new issues while the work order is in exception", async () => {
    const { service, tx } = createMaterialService({ status: "exception" });
    await expect(service.issueWorkOrderMaterial(
      materialWorkOrder.id,
      movementInput,
      "work-order-issue:key-3",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockBalanceProjection.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a zero movement quantity before starting a transaction", async () => {
    const { service, prisma } = createMaterialService();
    await expect(service.issueWorkOrderMaterial(
      materialWorkOrder.id,
      { ...movementInput, quantity: "0.000" },
      "work-order-issue:key-zero",
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
