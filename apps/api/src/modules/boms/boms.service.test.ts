import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { BomsService } from "./boms.service.js";

function createPublishService(
  previousEffectiveAt = new Date("2026-08-01T00:00:00Z"),
  previousEffectiveTo: Date | null = null,
) {
  const draft = {
    id: "version-new",
    bomId: "bom-1",
    status: "draft",
    revision: 1,
    operations: [{ id: "operation-1", kind: "mix" }],
    items: [{ id: "item-1", operationId: "operation-1" }],
  };
  const previous = {
    id: "version-current",
    bomId: "bom-1",
    status: "effective",
    effectiveAt: previousEffectiveAt,
    effectiveTo: previousEffectiveTo,
    createdAt: previousEffectiveAt,
  };
  const tx = {
    bomVersion: {
      findFirst: vi.fn()
        .mockResolvedValueOnce(draft)
        .mockResolvedValueOnce(previous),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    bomVersionEvent: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    bom: { findFirst: vi.fn().mockResolvedValue({
      id: "bom-1",
      code: "BOM-1",
      productId: "product-1",
      product: { id: "product-1", name: "成品" },
      versions: [{
        id: "version-new",
        version: "V2",
        status: "effective",
        effectiveAt: new Date("2026-09-01T00:00:00Z"),
        effectiveTo: null,
        publishedAt: new Date("2026-08-18T00:00:00Z"),
        revision: 2,
        outputQuantity: 1,
        outputUnit: "份",
        previousVersion: null,
        events: [],
        operations: [],
        items: [],
      }],
    }) },
  };
  return { service: new BomsService(prisma as never), prisma, tx };
}

describe("BomsService.publish", () => {
  it("closes the previous validity window without retiring it before a future version starts", async () => {
    const { service, tx } = createPublishService();
    await service.publish("version-new", { revision: 1, effectiveAt: "2026-09-01T00:00:00Z" });

    expect(tx.bomVersion.update).toHaveBeenNthCalledWith(1, {
      where: { id: "version-current" },
      data: { effectiveTo: new Date("2026-09-01T00:00:00Z"), revision: { increment: 1 } },
    });
  });

  it("rejects back-dated publication that would rewrite a published timeline", async () => {
    const { service } = createPublishService(new Date("2026-09-10T00:00:00Z"));
    await expect(
      service.publish("version-new", { revision: 1, effectiveAt: "2026-09-01T00:00:00Z" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("does not extend a closed historical version across an intentional validity gap", async () => {
    const { service, tx } = createPublishService(
      new Date("2026-08-01T00:00:00Z"),
      new Date("2026-08-20T00:00:00Z"),
    );

    await service.publish("version-new", { revision: 1, effectiveAt: "2026-09-01T00:00:00Z" });

    expect(tx.bomVersion.update).not.toHaveBeenCalled();
    expect(tx.bomVersion.updateMany).toHaveBeenCalledWith({
      where: { id: "version-new", status: "draft", revision: 1 },
      data: expect.objectContaining({ effectiveAt: new Date("2026-09-01T00:00:00Z") }),
    });
  });

  it("rejects a stale draft revision before changing the timeline", async () => {
    const { service, tx } = createPublishService();
    await expect(
      service.publish("version-new", { revision: 2, effectiveAt: "2026-09-01T00:00:00Z" }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.bomVersion.update).not.toHaveBeenCalled();
    expect(tx.bomVersion.updateMany).not.toHaveBeenCalled();
  });

  it("maps the named database exclusion race to a stable conflict response", async () => {
    const { service, prisma } = createPublishService();
    prisma.$transaction.mockRejectedValueOnce({
      code: "P2004",
      meta: { database_error: { message: "violates exclusion constraint bom_versions_no_overlapping_validity" } },
    });
    await expect(
      service.publish("version-new", { revision: 1, effectiveAt: "2026-09-01T00:00:00Z" }),
    ).rejects.toThrow("配方版本时间线已被其他发布操作更新");
  });

  it("fails closed before mutation when production identity is unavailable", async () => {
    const previousMode = process.env.NORA_MODE;
    process.env.NORA_MODE = "production";
    const { service, tx } = createPublishService();
    try {
      await expect(service.publish("version-new", { revision: 1 })).rejects.toThrow("缺少受信任身份");
      expect(tx.bomVersion.update).not.toHaveBeenCalled();
    } finally {
      if (previousMode === undefined) delete process.env.NORA_MODE;
      else process.env.NORA_MODE = previousMode;
    }
  });

});

describe("BomsService.updateDraft", () => {
  it("keeps repeated material rows when they are assigned to different process steps", async () => {
    const now = new Date("2026-08-19T00:00:00Z");
    const operations = [
      { id: "operation-wash", code: "OP10", name: "清洗", kind: "wash", sequence: 10, workCenter: null, durationMinutes: 5, waitMinutes: 0, temperatureMin: null, temperatureMax: null, instructions: null, createdAt: now, updatedAt: now },
      { id: "operation-mix", code: "OP20", name: "称重组配", kind: "mix", sequence: 20, workCenter: null, durationMinutes: 8, waitMinutes: 0, temperatureMin: null, temperatureMax: null, instructions: null, createdAt: now, updatedAt: now },
    ] as const;
    const tx = {
      bomVersion: {
        findFirst: vi.fn().mockResolvedValue({ id: "version-1", bomId: "bom-1", status: "draft", revision: 1, bom: { id: "bom-1", productId: "finished-1" } }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      product: {
        findMany: vi.fn().mockResolvedValue([{ id: "raw-1", organizationId: "00000000-0000-4000-8000-000000000001", status: "active", cost: 6 }]),
      },
      bomItem: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }), createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      bomOperation: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }), createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      bomVersionEvent: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
      bom: { findFirst: vi.fn().mockResolvedValue({
        id: "bom-1",
        code: "BOM-1",
        productId: "finished-1",
        product: { id: "finished-1", name: "成品" },
        versions: [{
          id: "version-1",
          version: "V2",
          status: "draft",
          effectiveAt: null,
          effectiveTo: null,
          publishedAt: null,
          revision: 2,
          outputQuantity: 1,
          outputUnit: "份",
          previousVersion: null,
          events: [],
          operations,
          items: [],
        }],
      }) },
    };
    const service = new BomsService(prisma as never);

    await service.updateDraft("version-1", {
      revision: 1,
      outputQuantity: 1,
      outputUnit: "份",
      operations: operations.map((operation) => ({
        code: operation.code,
        name: operation.name,
        kind: operation.kind,
        sequence: operation.sequence,
        durationMinutes: operation.durationMinutes,
        waitMinutes: operation.waitMinutes,
      })),
      items: [
        { componentProductId: "raw-1", operationCode: "OP10", netQuantity: 0.1, yieldRate: 0.9, unit: "kg" },
        { componentProductId: "raw-1", operationCode: "OP20", netQuantity: 0.02, yieldRate: 1, unit: "kg" },
      ],
    });

    const itemRows = tx.bomItem.createMany.mock.calls[0]![0].data;
    expect(itemRows).toHaveLength(2);
    expect(itemRows[0].componentProductId).toBe(itemRows[1].componentProductId);
    expect(itemRows[0].operationId).not.toBe(itemRows[1].operationId);
  });

});
