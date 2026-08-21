import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { WorkOrderMaterialUsagesService } from "./work-order-material-usages.service.js";

const now = new Date("2026-08-21T01:00:00.000Z");
const workOrderId = "90000000-0000-4000-8000-000000000001";
const product = {
  id: "20000000-0000-4000-8000-000000000004",
  organizationId: DEFAULT_ORGANIZATION_ID,
  code: "RM01234",
  name: "冷冻鸡胸肉",
  type: "raw" as const,
  category: "禽肉类",
  unit: "kg",
  cost: new Prisma.Decimal("20.7"),
  price: new Prisma.Decimal(0),
  stock: new Prisma.Decimal(0),
  safetyStock: new Prisma.Decimal(0),
  taxRate: new Prisma.Decimal(0),
  tags: [],
  status: "active" as const,
  createdAt: now,
  updatedAt: now,
};
const location = {
  id: "10000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  factoryCode: "SZ-CENTRAL",
  code: "RAW-COLD-01",
  name: "原料冷藏库",
  type: "cold_storage" as const,
  active: true,
  createdBy: "仓储主管",
  createdAt: now,
  updatedAt: now,
};
const lot = {
  id: "30000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  productId: product.id,
  code: "OPEN-20260820-001",
  supplierLotCode: "SUP-001",
  qualityStatus: "released" as const,
  receivedAt: now,
  productionAt: null,
  expiresAt: new Date("2026-09-20T01:00:00.000Z"),
  createdBy: "仓储主管",
  createdAt: now,
};
const balance = {
  id: "50000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  locationId: location.id,
  productId: product.id,
  lotId: lot.id,
  onHandQuantity: new Prisma.Decimal("119.5"),
  revision: 2,
  updatedAt: now,
  location,
  product,
  lot,
};
const recipeSnapshot = {
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
};
const usage = {
  id: "94000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  workOrderId,
  locationId: location.id,
  productId: product.id,
  lotId: lot.id,
  disposition: "consumed" as const,
  quantity: new Prisma.Decimal("0.250"),
  unit: "kg",
  reason: "首批投入",
  actor: "现场操作员",
  workstationCode: "肉类前处理",
  deviceId: "WEB-DEVELOPMENT",
  idempotencyKey: "work-order-material-usage:key-1",
  occurredAt: now,
  createdAt: now,
  location,
  product,
  lot,
};

const input = {
  stockBalanceId: balance.id,
  disposition: "consumed" as const,
  quantity: "0.250",
  unit: "kg",
  reason: "首批投入",
  workstationCode: "肉类前处理",
  deviceId: "WEB-DEVELOPMENT",
  actor: "现场操作员",
};

function createService(options: {
  repeated?: boolean;
  status?: "running" | "paused";
  netIssued?: string;
  previouslyConsumed?: string;
} = {}) {
  const tx = {
    $queryRaw: vi.fn(),
    workOrder: {
      findFirst: vi.fn().mockResolvedValue({
        id: workOrderId,
        code: "WO202608210001",
        status: options.status ?? "running",
        recipeSnapshot,
        plannedQuantity: new Prisma.Decimal("10"),
      }),
    },
    stockBalanceProjection: { findFirst: vi.fn().mockResolvedValue(balance) },
    inventoryTransaction: {
      findMany: vi.fn().mockResolvedValue([{
        type: "issue" as const,
        quantity: new Prisma.Decimal(options.netIssued ?? "0.500"),
      }]),
    },
    workOrderMaterialUsage: {
      findFirst: vi.fn().mockResolvedValue(options.repeated ? usage : null),
      findMany: vi.fn().mockResolvedValue(options.previouslyConsumed ? [{
        disposition: "consumed" as const,
        quantity: new Prisma.Decimal(options.previouslyConsumed),
      }] : []),
      create: vi.fn().mockResolvedValue(usage),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    workOrderMaterialUsage: { findFirst: vi.fn() },
  };
  const inventory = {
    getWorkOrderMaterials: vi.fn().mockResolvedValue({ workOrder: { id: workOrderId } }),
  };
  return {
    service: new WorkOrderMaterialUsagesService(prisma as never, inventory as never),
    prisma,
    inventory,
    tx,
  };
}

describe("WorkOrderMaterialUsagesService.record", () => {
  it("appends an immutable consumption fact without changing inventory balance", async () => {
    const { service, tx, inventory } = createService();
    const result = await service.record(workOrderId, input, "work-order-material-usage:key-1");

    expect(tx.workOrderMaterialUsage.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: DEFAULT_ORGANIZATION_ID,
        disposition: "consumed",
        quantity: new Prisma.Decimal("0.250"),
        lotId: lot.id,
      }),
    }));
    expect(tx.stockBalanceProjection).not.toHaveProperty("updateMany");
    expect(inventory.getWorkOrderMaterials).toHaveBeenCalledWith(workOrderId);
    expect(result.usage).toEqual(expect.objectContaining({ disposition: "consumed", quantity: "0.250" }));
  });

  it("returns the same fact for a repeated idempotency key", async () => {
    const { service, tx } = createService({ repeated: true });
    const result = await service.record(workOrderId, input, "work-order-material-usage:key-1");
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.workOrderMaterialUsage.create).not.toHaveBeenCalled();
    expect(result.usage.id).toBe(usage.id);
  });

  it("rejects a quantity above the exact lot unaccounted balance", async () => {
    const { service, tx } = createService({ previouslyConsumed: "0.400" });
    await expect(service.record(
      workOrderId,
      input,
      "work-order-material-usage:key-over",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.workOrderMaterialUsage.create).not.toHaveBeenCalled();
  });

  it("rejects material usage while a work order is paused", async () => {
    const { service, tx } = createService({ status: "paused" });
    await expect(service.record(
      workOrderId,
      input,
      "work-order-material-usage:key-paused",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.stockBalanceProjection.findFirst).not.toHaveBeenCalled();
  });

  it("requires a reason for scrap before opening a transaction", async () => {
    const { service, prisma } = createService();
    await expect(service.record(workOrderId, {
      ...input,
      disposition: "scrapped",
      reason: undefined,
    }, "work-order-material-usage:key-scrap")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
