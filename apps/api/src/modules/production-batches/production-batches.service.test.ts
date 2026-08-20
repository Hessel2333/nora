import { ConflictException, UnprocessableEntityException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { ProductionBatchesService } from "./production-batches.service.js";

const now = new Date("2026-08-20T02:00:00.000Z");
const scheduledFor = "2026-08-21T02:00:00.000Z";
const demandId = "70000000-0000-4000-8000-000000000001";
const lineId = "71000000-0000-4000-8000-000000000001";
const productId = "20000000-0000-4000-8000-000000000001";
const versionId = "40000000-0000-4000-8000-000000000001";

const recipeSnapshot = {
  schemaVersion: 2,
  capturedAt: now.toISOString(),
  asAt: now.toISOString(),
  product: {
    id: productId,
    code: "CP0001",
    name: "宫保鸡丁净菜包",
    type: "processed",
    unit: "份",
    unitCost: 12.5,
  },
  bomVersion: {
    id: versionId,
    bomId: "30000000-0000-4000-8000-000000000001",
    bomCode: "BOM-CP0001",
    version: "V1.0",
    effectiveAt: now.toISOString(),
    effectiveTo: null,
    outputQuantity: 1,
    outputUnit: "份",
  },
  operations: [{
    id: "operation-1",
    code: "OP10",
    name: "分装",
    kind: "pack",
    sequence: 10,
    workCenter: "PACK-01",
    durationMinutes: 10,
    waitMinutes: 0,
    temperatureMin: null,
    temperatureMax: null,
    instructions: "按订单规格分装",
  }],
  components: [],
};

function demandLine(existingAllocation = "0") {
  return {
    id: lineId,
    productionDemandId: demandId,
    salesOrderLineId: "60000000-0000-4000-8000-000000000001",
    productId,
    productCode: "CP0001",
    productName: "宫保鸡丁净菜包",
    requiredQuantity: new Prisma.Decimal("10"),
    unit: "份",
    selectedBomVersionId: versionId,
    bomVersionSnapshot: "BOM-CP0001 / V1.0",
    recipeSnapshot,
    sortOrder: 0,
    createdAt: now,
    productionDemand: {
      id: demandId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      code: "PD202608200001",
      factoryCode: "SZ-CENTRAL",
      factoryName: "深圳中央工厂",
      salesOrder: {
        id: "50000000-0000-4000-8000-000000000001",
        code: "SO202608200001",
        customerName: "南山门店",
      },
    },
    allocations: existingAllocation === "0" ? [] : [{ allocatedQuantity: new Prisma.Decimal(existingAllocation) }],
  };
}

function batchRecord() {
  const line = demandLine();
  return {
    id: "80000000-0000-4000-8000-000000000001",
    organizationId: DEFAULT_ORGANIZATION_ID,
    code: "PB202608200001",
    idempotencyKey: "batch-key-1",
    factoryCode: "SZ-CENTRAL",
    factoryName: "深圳中央工厂",
    productId,
    productCode: "CP0001",
    productName: "宫保鸡丁净菜包",
    plannedQuantity: new Prisma.Decimal("10"),
    unit: "份",
    selectedBomVersionId: versionId,
    bomVersionSnapshot: "BOM-CP0001 / V1.0",
    recipeSnapshot,
    scheduledFor: new Date(scheduledFor),
    status: "draft" as const,
    revision: 1,
    createdBy: "计划员",
    createdAt: now,
    updatedAt: now,
    workOrder: null,
    allocations: [{
      id: "81000000-0000-4000-8000-000000000001",
      productionBatchId: "80000000-0000-4000-8000-000000000001",
      productionDemandLineId: lineId,
      allocatedQuantity: new Prisma.Decimal("10"),
      createdAt: now,
      productionDemandLine: line,
    }],
    events: [{
      id: "82000000-0000-4000-8000-000000000001",
      organizationId: DEFAULT_ORGANIZATION_ID,
      productionBatchId: "80000000-0000-4000-8000-000000000001",
      type: "created" as const,
      actor: "计划员",
      revision: 1,
      details: null,
      createdAt: now,
    }],
  };
}

function createTransitionService(
  initialStatus: "draft" | "confirmed" | "released" = "draft",
  initialRevision = initialStatus === "draft" ? 1 : 2,
  snapshot: unknown = recipeSnapshot,
) {
  type TransitionBatch = Omit<
    ReturnType<typeof batchRecord>,
    "status" | "revision" | "recipeSnapshot" | "workOrder"
  > & {
    status: "draft" | "confirmed" | "released";
    revision: number;
    recipeSnapshot: unknown;
    workOrder: null | Record<string, unknown>;
  };
  let current: TransitionBatch = {
    ...batchRecord(),
    status: initialStatus,
    revision: initialRevision,
    recipeSnapshot: snapshot,
  } as ReturnType<typeof batchRecord> & { workOrder: null | Record<string, unknown> };
  const workOrder = {
    id: "90000000-0000-4000-8000-000000000001",
    organizationId: DEFAULT_ORGANIZATION_ID,
    productionBatchId: current.id,
    code: "WO202608200001",
    factoryCode: current.factoryCode,
    factoryName: current.factoryName,
    productId,
    productCode: current.productCode,
    productName: current.productName,
    plannedQuantity: new Prisma.Decimal("10"),
    unit: current.unit,
    selectedBomVersionId: versionId,
    bomVersionSnapshot: current.bomVersionSnapshot,
    recipeSnapshot: snapshot,
    scheduledStartAt: new Date(scheduledFor),
    workCenter: "PACK-01",
    status: "pending" as const,
    revision: 1,
    createdBy: "生产主管",
    createdAt: now,
    updatedAt: now,
    productionBatch: { id: current.id, code: current.code, status: "released" as const },
    events: [],
  };
  const tx = {
    productionBatch: {
      findFirst: vi.fn(async () => current),
      updateMany: vi.fn(async ({ data }: { data: { status: "confirmed" | "released"; revision: number } }) => {
        current = { ...current, ...data };
        return { count: 1 };
      }),
    },
    productionBatchEvent: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = {
          ...current,
          events: [{
            id: `event-${String(data.type)}`,
            organizationId: DEFAULT_ORGANIZATION_ID,
            productionBatchId: current.id,
            type: data.type,
            actor: data.actor,
            revision: data.revision,
            idempotencyKey: data.idempotencyKey,
            details: data.details,
            createdAt: now,
          }, ...current.events] as never,
        };
        return {};
      }),
    },
    workOrder: {
      create: vi.fn(async () => {
        current = { ...current, workOrder };
        return workOrder;
      }),
    },
    documentNumber: { upsert: vi.fn().mockResolvedValue({ currentValue: 1 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: current.id }]),
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { service: new ProductionBatchesService(prisma as never), prisma, tx, getCurrent: () => current };
}

function createService({ existingAllocation = "0", existingBatch = false } = {}) {
  const line = demandLine(existingAllocation);
  const batch = batchRecord();
  const tx = {
    productionBatch: {
      findFirst: vi.fn().mockResolvedValue(existingBatch ? batch : null),
      create: vi.fn().mockResolvedValue(batch),
    },
    productionDemandLine: { findMany: vi.fn().mockResolvedValue([line]) },
    productionDemand: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: demandId,
        lines: [{
          requiredQuantity: new Prisma.Decimal("10"),
          allocations: [{ allocatedQuantity: new Prisma.Decimal("10") }],
        }],
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    productionDemandEvent: { create: vi.fn().mockResolvedValue({}) },
    documentNumber: { upsert: vi.fn().mockResolvedValue({ currentValue: 1 }) },
    $queryRaw: vi.fn().mockResolvedValue([{ id: lineId }]),
  };
  const prisma = {
    productionBatch: { findFirst: vi.fn().mockResolvedValue(null) },
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
  };
  return { service: new ProductionBatchesService(prisma as never), prisma, tx, batch };
}

const input = {
  scheduledFor,
  allocations: [{ productionDemandLineId: lineId, quantity: "10.000" }],
  actor: "计划员",
};

describe("ProductionBatchesService.create", () => {
  it("creates a draft batch and atomically marks a fully allocated demand as planned", async () => {
    const { service, tx } = createService();

    const result = await service.create(input, "batch-key-1");

    expect(result).toEqual(expect.objectContaining({ code: "PB202608200001", plannedQuantity: "10.000", status: "draft" }));
    expect(tx.productionBatch.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: DEFAULT_ORGANIZATION_ID,
        idempotencyKey: "batch-key-1",
        allocations: { create: [expect.objectContaining({ productionDemandLineId: lineId })] },
      }),
    }));
    expect(tx.productionDemand.update).toHaveBeenCalledWith({ where: { id: demandId }, data: { status: "planned" } });
    expect(tx.productionDemandEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "allocation_changed", status: "planned", actor: "计划员" }),
    }));
  });

  it("returns the original batch for a repeated idempotency key", async () => {
    const { service, tx } = createService({ existingBatch: true });

    const result = await service.create(input, "batch-key-1");

    expect(result.code).toBe("PB202608200001");
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.productionBatch.create).not.toHaveBeenCalled();
  });

  it("rejects an allocation that exceeds the locked remaining quantity", async () => {
    const { service, tx } = createService({ existingAllocation: "8" });

    await expect(service.create({ ...input, allocations: [{ productionDemandLineId: lineId, quantity: "3" }] }, "batch-key-2"))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.productionBatch.create).not.toHaveBeenCalled();
  });

  it("does not report success when the transaction fails", async () => {
    const { service, prisma } = createService();
    prisma.$transaction.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(service.create(input, "batch-key-3")).rejects.toThrow("database unavailable");
    expect(prisma.productionBatch.findFirst).not.toHaveBeenCalled();
  });
});

describe("ProductionBatchesService.confirm", () => {
  it("confirms a draft batch with an atomic revision and audit event", async () => {
    const { service, tx } = createTransitionService();

    const result = await service.confirm(batchRecord().id, { revision: 1, actor: "生产主管" }, "confirm-key-1");

    expect(result).toEqual(expect.objectContaining({ status: "confirmed", revision: 2 }));
    expect(tx.productionBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "draft", revision: 1 }),
      data: { status: "confirmed", revision: 2 },
    }));
    expect(tx.productionBatchEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "confirmed", idempotencyKey: "confirm-key-1", actor: "生产主管" }),
    }));
  });

  it("rejects a stale revision without changing the batch", async () => {
    const { service, tx } = createTransitionService();

    await expect(service.confirm(batchRecord().id, { revision: 2, actor: "生产主管" }, "confirm-key-2"))
      .rejects.toBeInstanceOf(ConflictException);
    expect(tx.productionBatch.updateMany).not.toHaveBeenCalled();
  });
});

describe("ProductionBatchesService.release", () => {
  it("creates exactly one work order from the frozen v2 recipe and releases the batch", async () => {
    const { service, tx } = createTransitionService("confirmed", 2);

    const result = await service.release(batchRecord().id, { revision: 2, actor: "生产主管" }, "release-key-1");

    expect(result).toEqual(expect.objectContaining({
      status: "released",
      revision: 3,
      workOrder: expect.objectContaining({ code: "WO202608200001", status: "pending", plannedQuantity: "10.000" }),
    }));
    expect(tx.workOrder.create).toHaveBeenCalledTimes(1);
    expect(tx.workOrder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productionBatchId: batchRecord().id,
        selectedBomVersionId: versionId,
        workCenter: "PACK-01",
      }),
    }));
  });

  it("rejects a historical v1 snapshot instead of reading current BOM operations", async () => {
    const v1Snapshot = { ...recipeSnapshot, schemaVersion: 1, operations: undefined };
    const { service, tx } = createTransitionService("confirmed", 2, v1Snapshot);

    await expect(service.release(batchRecord().id, { revision: 2, actor: "生产主管" }, "release-key-2"))
      .rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.workOrder.create).not.toHaveBeenCalled();
  });

  it("returns the existing work order for a repeated release idempotency key", async () => {
    const { service, tx } = createTransitionService("released", 3);
    await tx.workOrder.create();
    tx.productionBatchEvent.findFirst.mockResolvedValueOnce({
      productionBatchId: batchRecord().id,
      type: "released",
    });

    const result = await service.release(batchRecord().id, { revision: 2, actor: "生产主管" }, "release-key-repeat");

    expect(result).toEqual(expect.objectContaining({
      status: "released",
      workOrder: expect.objectContaining({ code: "WO202608200001" }),
    }));
    expect(tx.productionBatch.updateMany).not.toHaveBeenCalled();
    expect(tx.workOrder.create).toHaveBeenCalledTimes(1);
  });

  it("does not report success when the release transaction fails", async () => {
    const { service, prisma } = createTransitionService("confirmed", 2);
    prisma.$transaction.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(service.release(batchRecord().id, { revision: 2, actor: "生产主管" }, "release-key-failure"))
      .rejects.toThrow("database unavailable");
  });
});
