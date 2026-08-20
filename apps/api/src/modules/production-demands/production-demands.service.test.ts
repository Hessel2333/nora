import { Prisma } from "../../generated/prisma/client.js";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { ProductionDemandsService } from "./production-demands.service.js";

const now = new Date("2026-08-20T02:00:00.000Z");

const demand = {
  id: "70000000-0000-4000-8000-000000000001",
  organizationId: DEFAULT_ORGANIZATION_ID,
  code: "PD202608200001",
  salesOrderId: "50000000-0000-4000-8000-000000000001",
  factoryCode: "SZ-CENTRAL",
  factoryName: "深圳中央工厂",
  requiredAt: new Date("2026-08-21T03:30:00.000Z"),
  status: "pending_planning" as const,
  approvedAt: now,
  createdAt: now,
  updatedAt: now,
  salesOrder: {
    id: "50000000-0000-4000-8000-000000000001",
    code: "SO202608200001",
    customerName: "南山门店",
    deliveryAt: new Date("2026-08-21T03:30:00.000Z"),
  },
  lines: [{
    id: "71000000-0000-4000-8000-000000000001",
    productionDemandId: "70000000-0000-4000-8000-000000000001",
    salesOrderLineId: "60000000-0000-4000-8000-000000000001",
    productId: "20000000-0000-4000-8000-000000000001",
    productCode: "CP0001",
    productName: "宫保鸡丁净菜包",
    requiredQuantity: new Prisma.Decimal(120),
    unit: "份",
    selectedBomVersionId: null,
    bomVersionSnapshot: null,
    recipeSnapshot: null,
    sortOrder: 0,
    createdAt: now,
    allocations: [],
  }],
};

function createService() {
  const prisma = {
    productionDemand: {
      findMany: vi.fn().mockResolvedValue([demand]),
      count: vi.fn().mockResolvedValue(1),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };
  return { service: new ProductionDemandsService(prisma as never), prisma };
}

describe("ProductionDemandsService.list", () => {
  it("keeps the organization boundary and returns the source order projection", async () => {
    const { service, prisma } = createService();

    const result = await service.list({ page: 1, pageSize: 50 });

    expect(prisma.productionDemand.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    }));
    expect(prisma.productionDemand.count).toHaveBeenCalledWith({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
    });
    expect(result.data[0]).toEqual(expect.objectContaining({
      code: demand.code,
      missingBomCount: 1,
      salesOrder: expect.objectContaining({ code: "SO202608200001", customerName: "南山门店" }),
    }));
  });

  it("applies status and keyword filters without dropping the organization boundary", async () => {
    const { service, prisma } = createService();

    await service.list({ page: 2, pageSize: 20, status: "pending_planning", query: "净菜" });

    expect(prisma.productionDemand.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: "pending_planning",
        OR: expect.arrayContaining([
          { lines: { some: { productName: { contains: "净菜", mode: "insensitive" } } } },
        ]),
      }),
      skip: 20,
      take: 20,
    }));
  });
});
