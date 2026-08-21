import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { WorkOrderOutputsService } from "./work-order-outputs.service.js";

const workOrderId = "90000000-0000-4000-8000-000000000001";
const outputId = "92000000-0000-4000-8000-000000000001";
const batchId = "80000000-0000-4000-8000-000000000001";
const productId = "20000000-0000-4000-8000-000000000001";
const rawProductId = "20000000-0000-4000-8000-000000000004";
const lotId = "93000000-0000-4000-8000-000000000001";
const locationId = "11000000-0000-4000-8000-000000000004";

const recipeSnapshot = {
  schemaVersion: 2,
  capturedAt: "2026-08-20T02:00:00.000Z",
  asAt: "2026-08-20T02:00:00.000Z",
  product: { id: productId, code: "CP0001", name: "宫保鸡丁净菜包", type: "finished", unit: "份", unitCost: 8 },
  bomVersion: {
    id: "v1",
    bomId: "b1",
    bomCode: "BOM-CP0001",
    version: "V2.1",
    effectiveAt: "2026-08-01T00:00:00.000Z",
    effectiveTo: null,
    outputQuantity: 1,
    outputUnit: "份",
  },
  operations: [{
    code: "OP50",
    name: "分装贴标",
    kind: "pack",
    sequence: 50,
    workCenter: "净菜包装间",
    durationMinutes: 6,
    waitMinutes: 0,
    temperatureMin: null,
    temperatureMax: 12,
    instructions: "复核净重、批次和标签后封装。",
  }],
  components: [{
    product: { id: rawProductId, code: "RM01234", name: "冷冻鸡胸肉", type: "raw", unit: "kg", unitCost: 20.7 },
    netQuantity: 0.1,
    yieldRate: 1,
    unit: "kg",
    unitCostSnapshot: 20.7,
    sortOrder: 0,
    notes: null,
    operationCode: "OP50",
    recipe: {
      schemaVersion: 2,
      capturedAt: "2026-08-20T02:00:00.000Z",
      asAt: "2026-08-20T02:00:00.000Z",
      product: { id: rawProductId, code: "RM01234", name: "冷冻鸡胸肉", type: "raw", unit: "kg", unitCost: 20.7 },
      bomVersion: null,
      operations: [],
      components: [],
    },
  }],
};

const runningWorkOrder = {
  id: workOrderId,
  organizationId: DEFAULT_ORGANIZATION_ID,
  productionBatchId: batchId,
  code: "WO202608210001",
  factoryCode: "SZ-CENTRAL",
  productId,
  productName: "宫保鸡丁净菜包",
  plannedQuantity: new Prisma.Decimal("120"),
  unit: "份",
  workCenter: "净菜包装间",
  status: "running" as const,
  revision: 2,
  recipeSnapshot,
  product: { unit: "份" },
  productionBatch: { status: "running" as const, revision: 4 },
};

const pendingOutput = {
  id: outputId,
  organizationId: DEFAULT_ORGANIZATION_ID,
  workOrderId,
  productionBatchId: batchId,
  productId,
  lotId,
  quantity: new Prisma.Decimal("118"),
  unit: "份",
  status: "pending_quality" as const,
  temperatureMin: null,
  temperatureMax: new Prisma.Decimal("12"),
  revision: 1,
  lot: { id: lotId, code: "FG-20260821-001", qualityStatus: "pending" as const },
  workOrder: {
    ...runningWorkOrder,
    status: "awaiting_quality" as const,
    revision: 3,
    productionBatch: { status: "awaiting_quality" as const, revision: 5 },
  },
};

function summary(status: "running" | "awaiting_quality" | "completed" | "exception", revision: number) {
  return {
    id: workOrderId,
    code: "WO202608210001",
    factoryCode: "SZ-CENTRAL",
    productName: "宫保鸡丁净菜包",
    plannedQuantity: new Prisma.Decimal("120"),
    unit: "份",
    workCenter: "净菜包装间",
    status,
    revision,
  };
}

describe("WorkOrderOutputsService.report", () => {
  function reportService(options: { issued?: string; consumed?: string; scrapped?: string } = {}) {
    const issued = options.issued ?? "12.000";
    const consumed = options.consumed ?? "12.000";
    const scrapped = options.scrapped ?? "0.000";
    const tx = {
      $queryRaw: vi.fn(),
      workOrder: {
        findFirst: vi.fn().mockResolvedValueOnce(runningWorkOrder).mockResolvedValueOnce(summary("awaiting_quality", 3)),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      workOrderOutput: {
        findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: outputId }),
      },
      inventoryLot: { create: vi.fn().mockResolvedValue({ id: lotId }) },
      productionBatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workOrderEvent: { create: vi.fn().mockResolvedValue({ id: "event-1" }) },
      productionBatchEvent: { create: vi.fn().mockResolvedValue({ id: "batch-event-1" }) },
      inventoryLocation: { findMany: vi.fn().mockResolvedValue([]) },
      inventoryTransaction: {
        findMany: vi.fn().mockResolvedValue([{
          productId: rawProductId,
          unit: "kg",
          type: "issue" as const,
          quantity: new Prisma.Decimal(issued),
        }]),
      },
      workOrderMaterialUsage: {
        findMany: vi.fn().mockResolvedValue([
          ...(new Prisma.Decimal(consumed).gt(0) ? [{
            productId: rawProductId,
            unit: "kg",
            disposition: "consumed" as const,
            quantity: new Prisma.Decimal(consumed),
          }] : []),
          ...(new Prisma.Decimal(scrapped).gt(0) ? [{
            productId: rawProductId,
            unit: "kg",
            disposition: "scrapped" as const,
            quantity: new Prisma.Decimal(scrapped),
          }] : []),
        ]),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      workOrderOutput: { findFirst: vi.fn() },
    };
    const service = new WorkOrderOutputsService(prisma as never);
    return { service, tx };
  }

  const reportInput = {
    revision: 2,
    quantity: "118.000",
    unit: "份",
    lotCode: "FG-20260821-001",
    expiresAt: "2030-08-23T15:59:00.000Z",
    varianceReason: "修整损耗",
    workstationCode: "净菜包装间",
    deviceId: "WEB-DEVELOPMENT",
    actor: "开发环境用户",
  };

  it("creates a pending lot/output after every issued material is reconciled", async () => {
    const { service, tx } = reportService();

    const result = await service.report(workOrderId, reportInput, "work-order-output:key-1");

    expect(tx.inventoryLot.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ qualityStatus: "pending", code: "FG-20260821-001" }),
    }));
    expect(tx.workOrderOutput.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ quantity: new Prisma.Decimal("118"), temperatureMax: 12 }),
    }));
    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "awaiting_quality", revision: 3 },
    }));
    expect(tx.productionBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "awaiting_quality", revision: 5 },
    }));
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "output_reported", idempotencyKey: "work-order-output:key-1" }),
    }));
    expect(result.workOrder.status).toBe("awaiting_quality");
  });

  it("blocks reporting output until every frozen requirement is fully issued", async () => {
    const { service, tx } = reportService({ issued: "11.999", consumed: "11.999" });
    await expect(service.report(
      workOrderId,
      reportInput,
      "work-order-output:key-not-issued",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventoryLot.create).not.toHaveBeenCalled();
  });

  it("blocks reporting output while issued materials still have no disposition", async () => {
    const { service, tx } = reportService({ consumed: "11.500" });
    await expect(service.report(
      workOrderId,
      reportInput,
      "work-order-output:key-unreconciled",
    )).rejects.toBeInstanceOf(ConflictException);
    expect(tx.inventoryLot.create).not.toHaveBeenCalled();
  });

  it("rejects production writes before opening a transaction without trusted identity", async () => {
    vi.stubEnv("NORA_MODE", "production");
    try {
      const prisma = { $transaction: vi.fn() };
      const service = new WorkOrderOutputsService(prisma as never);
      await expect(service.report(workOrderId, {
        revision: 2,
        quantity: "120",
        unit: "份",
        lotCode: "FG-20260821-001",
        expiresAt: "2030-08-23T15:59:00.000Z",
        workstationCode: "净菜包装间",
        deviceId: "WEB-DEVELOPMENT",
        actor: "伪造用户",
      }, "work-order-output:key-production")).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe("WorkOrderOutputsService.inspect", () => {
  function inspectionService(decision: "released" | "rejected") {
    const nextStatus = decision === "released" ? "completed" as const : "exception" as const;
    const tx = {
      $queryRaw: vi.fn(),
      qualityInspection: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "inspection-1" }),
      },
      workOrderOutput: {
        findFirst: vi.fn().mockResolvedValue(pendingOutput),
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      workOrder: {
        findFirst: vi.fn().mockResolvedValue(summary(nextStatus, 4)),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryLot: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      inventoryLocation: {
        findFirst: vi.fn().mockResolvedValue({ id: locationId, code: "FG-COLD-01", name: "成品冷藏库" }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      inventoryTransaction: { create: vi.fn().mockResolvedValue({ id: "inventory-transaction-1" }) },
      stockBalanceProjection: { create: vi.fn().mockResolvedValue({ id: "balance-1" }) },
      productionBatch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      workOrderEvent: { create: vi.fn().mockResolvedValue({ id: "work-order-event-1" }) },
      productionBatchEvent: { create: vi.fn().mockResolvedValue({ id: "batch-event-1" }) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      qualityInspection: { findFirst: vi.fn() },
    };
    return { service: new WorkOrderOutputsService(prisma as never), tx };
  }

  const common = {
    workOrderRevision: 3,
    outputRevision: 1,
    standardVersion: "Q-NET-PREP-V1.2",
    sampleQuantity: 5,
    measuredTemperature: "8.50",
    appearancePassed: true,
    packageSealPassed: true,
    labelPassed: true,
    workstationCode: "质量检验台",
    deviceId: "WEB-DEVELOPMENT",
    actor: "质量人员",
  };

  it("atomically releases quality, posts finished goods and completes the work order", async () => {
    const { service, tx } = inspectionService("released");
    const result = await service.inspect(workOrderId, outputId, {
      ...common,
      decision: "released",
      locationId,
    }, "quality-inspection:key-1");

    expect(tx.qualityInspection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ decision: "released", standardVersion: "Q-NET-PREP-V1.2" }),
    }));
    expect(tx.inventoryTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "produce",
        direction: "inbound",
        sourceType: "production_output",
        workOrderOutputId: outputId,
      }),
    }));
    expect(tx.stockBalanceProjection.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ onHandQuantity: new Prisma.Decimal("118") }),
    }));
    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "completed", revision: 4 },
    }));
    expect(result.workOrder.status).toBe("completed");
  });

  it("records rejection and exception without creating inventory", async () => {
    const { service, tx } = inspectionService("rejected");
    const result = await service.inspect(workOrderId, outputId, {
      ...common,
      decision: "rejected",
      appearancePassed: false,
      note: "外观破损，批次隔离",
    }, "quality-inspection:key-2");

    expect(tx.inventoryLot.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { qualityStatus: "rejected" },
    }));
    expect(tx.inventoryTransaction.create).not.toHaveBeenCalled();
    expect(tx.stockBalanceProjection.create).not.toHaveBeenCalled();
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: "quality_rejected", status: "exception" }),
    }));
    expect(result.workOrder.status).toBe("exception");
  });
});
