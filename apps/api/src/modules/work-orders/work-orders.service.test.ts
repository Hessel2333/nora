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
  },
  events: [],
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
