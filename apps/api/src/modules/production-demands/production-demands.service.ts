import { Injectable } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { formatLocalDateTime } from "../../common/date.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  presentProductionDemand,
  productionDemandInclude,
} from "../orders/production-demand.presenter.js";
import type { ListProductionDemandsQueryDto } from "./dto/production-demand.dto.js";

const productionDemandListInclude = {
  ...productionDemandInclude,
  lines: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      allocations: {
        where: {
          productionBatch: {
            status: { not: "cancelled" as const },
          },
        },
      },
    },
  },
  salesOrder: {
    select: {
      id: true,
      code: true,
      customerName: true,
      deliveryAt: true,
    },
  },
} satisfies Prisma.ProductionDemandInclude;

type ProductionDemandListRecord = Prisma.ProductionDemandGetPayload<{
  include: typeof productionDemandListInclude;
}>;

@Injectable()
export class ProductionDemandsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListProductionDemandsQueryDto) {
    const keyword = query.query?.trim();
    const where: Prisma.ProductionDemandWhereInput = {
      organizationId: DEFAULT_ORGANIZATION_ID,
      ...(query.status ? { status: query.status } : {}),
      ...(keyword
        ? {
            OR: [
              { code: { contains: keyword, mode: "insensitive" } },
              { salesOrder: { code: { contains: keyword, mode: "insensitive" } } },
              { salesOrder: { customerName: { contains: keyword, mode: "insensitive" } } },
              { lines: { some: { productName: { contains: keyword, mode: "insensitive" } } } },
              { lines: { some: { productCode: { contains: keyword, mode: "insensitive" } } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.productionDemand.findMany({
        where,
        include: productionDemandListInclude,
        orderBy: [{ requiredAt: "asc" }, { code: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.productionDemand.count({ where }),
    ]);

    return {
      data: rows.map(presentProductionDemandListItem),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }
}

function presentProductionDemandListItem(demand: ProductionDemandListRecord) {
  const presented = presentProductionDemand(demand);
  return {
    ...presented,
    lines: presented.lines.map((line, index) => {
      const record = demand.lines[index];
      const allocated = record.allocations.reduce(
        (sum, allocation) => sum.add(allocation.allocatedQuantity),
        new Prisma.Decimal(0),
      );
      return {
        ...line,
        allocatedQuantity: allocated.toFixed(3),
        remainingQuantity: record.requiredQuantity.sub(allocated).toFixed(3),
      };
    }),
    salesOrder: {
      id: demand.salesOrder.id,
      code: demand.salesOrder.code,
      customerName: demand.salesOrder.customerName,
      deliveryAt: formatLocalDateTime(demand.salesOrder.deliveryAt),
    },
  };
}
