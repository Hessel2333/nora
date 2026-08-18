import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { OrdersService } from "./orders.service.js";

const pendingOrder = {
  id: "50000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000001",
  code: "SO202608170002",
  customerId: "10000000-0000-4000-8000-000000000002",
  customerName: "盒马鲜生南山店",
  deliveryAt: new Date("2026-08-18T14:30:00+08:00"),
  status: "pending",
  source: "manual",
  contact: "李经理",
  phone: "137 1020 6688",
  address: "深圳市南山区科苑路15号",
  notes: null,
  revision: 1,
  createdAt: new Date("2026-08-17T08:00:00Z"),
  updatedAt: new Date("2026-08-17T08:00:00Z"),
  lines: [
    {
      id: "60000000-0000-4000-8000-000000000001",
      salesOrderId: "50000000-0000-4000-8000-000000000002",
      productId: "20000000-0000-4000-8000-000000000002",
      productCode: "CP0002",
      productName: "鱼香肉丝",
      quantity: 600,
      unit: "份",
      unitPrice: 29.8,
      sortOrder: 0,
      createdAt: new Date("2026-08-17T08:00:00Z"),
    },
  ],
  events: [],
} as const;

function createService(updateCount = 1) {
  const transactionClient = {
    salesOrder: {
      findFirst: vi.fn().mockResolvedValue(pendingOrder),
      updateMany: vi.fn().mockResolvedValue({ count: updateCount }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ ...pendingOrder, status: "approved" }),
    },
    salesOrderEvent: { create: vi.fn().mockResolvedValue({}) },
    bom: {
      findMany: vi.fn().mockResolvedValue([
        {
          productId: pendingOrder.lines[0].productId,
          versions: [{ id: "40000000-0000-4000-8000-000000000003", version: "V1.0" }],
        },
      ]),
    },
    documentNumber: { upsert: vi.fn().mockResolvedValue({ currentValue: 1 }) },
    productionDemand: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient)),
  };
  const service = new OrdersService(prisma as never, {} as never);
  return { service, transactionClient };
}

describe("OrdersService.approve", () => {
  it("approves the order and creates one persistent demand in the same transaction", async () => {
    const { service, transactionClient } = createService();

    const result = await service.approve(pendingOrder.id, {
      actor: "审核员",
      comment: "交期确认",
    });

    expect(result.status).toBe("approved");
    expect(transactionClient.salesOrderEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        salesOrderId: pendingOrder.id,
        type: "approved",
        label: "审核通过并创建生产需求",
        actor: "审核员",
      }),
    });
    expect(transactionClient.productionDemand.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: expect.stringMatching(/^PD\d{8}0001$/),
        salesOrderId: pendingOrder.id,
        status: "pending_planning",
        lines: {
          create: [
            expect.objectContaining({
              salesOrderLineId: pendingOrder.lines[0].id,
              productId: pendingOrder.lines[0].productId,
              requiredQuantity: pendingOrder.lines[0].quantity,
              selectedBomVersionId: "40000000-0000-4000-8000-000000000003",
              bomVersionSnapshot: "V1.0",
            }),
          ],
        },
      }),
    });
  });

  it("does not create a demand when optimistic locking loses the update", async () => {
    const { service, transactionClient } = createService(0);

    await expect(service.approve(pendingOrder.id, {})).rejects.toBeInstanceOf(ConflictException);
    expect(transactionClient.productionDemand.create).not.toHaveBeenCalled();
  });
});
