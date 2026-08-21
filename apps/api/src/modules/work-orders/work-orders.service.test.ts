import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { WorkOrdersService } from "./work-orders.service.js";

const now = new Date("2026-08-20T02:00:00.000Z");

const workOrder = {
  id: "90000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  productionBatchId: "80000000-0000-4000-8000-000000000001",
  code: "WO202608200001",
  factoryCode: "SZ-CENTRAL",
  factoryName: "深圳中央工厂",
  productId: "20000000-0000-4000-8000-000000000001",
  productCode: "CP0001",
  productName: "宫保鸡丁净菜包",
  plannedQuantity: new Prisma.Decimal("120"),
  unit: "份",
  selectedBomVersionId: "40000000-0000-4000-8000-000000000001",
  bomVersionSnapshot: "BOM-CP0001 / V2.1",
  recipeSnapshot: {
    schemaVersion: 2,
    capturedAt: now.toISOString(),
    asAt: now.toISOString(),
    product: { id: "p1", code: "CP0001", name: "宫保鸡丁净菜包", type: "finished", unit: "份", unitCost: 8 },
    bomVersion: {
      id: "v1",
      bomId: "b1",
      bomCode: "BOM-CP0001",
      version: "V2.1",
      effectiveAt: now.toISOString(),
      effectiveTo: null,
      outputQuantity: 1,
      outputUnit: "份",
    },
    operations: [{
      code: "OP10",
      name: "分装贴标",
      kind: "pack",
      sequence: 10,
      workCenter: "净菜包装间",
      durationMinutes: 10,
      waitMinutes: 0,
      temperatureMin: null,
      temperatureMax: 12,
      instructions: "复核后分装",
    }],
    components: [],
  },
  scheduledStartAt: new Date("2026-08-21T02:00:00.000Z"),
  workCenter: "净菜包装间",
  status: "pending" as const,
  revision: 1,
  createdBy: "生产主管",
  createdAt: now,
  updatedAt: now,
  productionBatch: {
    id: "80000000-0000-4000-8000-000000000001",
    code: "PB202608200001",
    status: "released" as const,
    revision: 3,
  },
  events: [],
};

const startedEvent = {
  id: "91000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  workOrderId: workOrder.id,
  type: "started" as const,
  actor: "开发环境用户",
  fromStatus: "pending" as const,
  status: "running" as const,
  revision: 2,
  workstationCode: "净菜包装间",
  deviceId: "WEB-DEVELOPMENT",
  reason: null,
  idempotencyKey: "work-order:start:key-1",
  details: { command: "start" },
  createdAt: now,
};

describe("WorkOrdersService.list", () => {
  it("keeps the organization boundary and presents Decimal quantities and frozen operations", async () => {
    const prisma = {
      workOrder: { findMany: vi.fn().mockResolvedValue([workOrder]) },
    };
    const service = new WorkOrdersService(prisma as never);

    const result = await service.list();

    expect(prisma.workOrder.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    }));
    expect(result.data[0]).toEqual(expect.objectContaining({
      code: "WO202608200001",
      productionBatchCode: "PB202608200001",
      plannedQuantity: "120.000",
      operations: [expect.objectContaining({ code: "OP10", name: "分装贴标" })],
    }));
  });
});

describe("WorkOrdersService execution commands", () => {
  function createTransitionService(options: { repeated?: boolean; missing?: boolean; batchConflict?: boolean } = {}) {
    const runningWorkOrder = {
      ...workOrder,
      status: "running" as const,
      revision: 2,
      productionBatch: { ...workOrder.productionBatch, status: "running" as const, revision: 4 },
      events: [startedEvent],
    };
    const tx = {
      $queryRaw: vi.fn(),
      workOrderEvent: {
        findFirst: vi.fn().mockResolvedValue(options.repeated ? startedEvent : null),
        create: vi.fn().mockResolvedValue(startedEvent),
      },
      workOrder: {
        findFirst: vi.fn()
          .mockResolvedValueOnce(options.missing ? null : workOrder)
          .mockResolvedValue(runningWorkOrder),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      productionBatch: { updateMany: vi.fn().mockResolvedValue({ count: options.batchConflict ? 0 : 1 }) },
      productionBatchEvent: { create: vi.fn().mockResolvedValue({ id: "batch-event-1" }) },
    };
    if (options.repeated) {
      tx.workOrder.findFirst = vi.fn().mockResolvedValue(runningWorkOrder);
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      workOrderEvent: { findFirst: vi.fn() },
      workOrder: { findFirst: vi.fn() },
    };
    return { service: new WorkOrdersService(prisma as never), prisma, tx };
  }

  const command = {
    revision: 1,
    workstationCode: "净菜包装间",
    deviceId: "WEB-DEVELOPMENT",
    actor: "开发环境用户",
  };

  it("atomically starts the work order, updates its batch projection and appends both audit events", async () => {
    const { service, tx } = createTransitionService();
    const result = await service.start(workOrder.id, command, "work-order:start:key-1");

    expect(tx.workOrder.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "pending", revision: 1 }),
      data: { status: "running", revision: 2 },
    }));
    expect(tx.productionBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "released", revision: 3 }),
      data: { status: "running", revision: 4 },
    }));
    expect(tx.workOrderEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: "started",
        fromStatus: "pending",
        status: "running",
        idempotencyKey: "work-order:start:key-1",
      }),
    }));
    expect(tx.productionBatchEvent.create).toHaveBeenCalledOnce();
    expect(result).toEqual(expect.objectContaining({ status: "running", revision: 2 }));
  });

  it("returns the same work order for a repeated command without adding events", async () => {
    const { service, tx } = createTransitionService({ repeated: true });
    const result = await service.start(workOrder.id, command, "work-order:start:key-1");

    expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
    expect(tx.workOrderEvent.create).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ status: "running" }));
  });

  it("does not update a missing or cross-organization work order", async () => {
    const { service, tx } = createTransitionService({ missing: true });
    await expect(service.start(workOrder.id, command, "work-order:start:key-2")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tx.workOrder.updateMany).not.toHaveBeenCalled();
    expect(tx.productionBatch.updateMany).not.toHaveBeenCalled();
  });

  it("fails the whole command when the batch projection changed concurrently", async () => {
    const { service, tx } = createTransitionService({ batchConflict: true });
    await expect(service.start(workOrder.id, command, "work-order:start:key-3")).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(tx.workOrderEvent.create).not.toHaveBeenCalled();
    expect(tx.productionBatchEvent.create).not.toHaveBeenCalled();
  });

  it("rejects production writes before opening a database transaction without trusted identity", async () => {
    vi.stubEnv("NORA_MODE", "production");
    try {
      const { service, prisma } = createTransitionService();
      await expect(service.start(workOrder.id, command, "work-order:start:key-4")).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
