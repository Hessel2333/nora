import { Injectable } from "@nestjs/common";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listCustomers(query?: string) {
    const rows = await this.prisma.customer.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: "active",
        ...(query
          ? { OR: [{ code: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { code: "asc" },
    });
    return rows.map((row) => ({ ...row, orderCount: 0, revenue: 0 }));
  }

  async listProducts(query?: string) {
    const rows = await this.prisma.product.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        status: "active",
        ...(query
          ? { OR: [{ code: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] }
          : {}),
      },
      orderBy: { code: "asc" },
    });
    return rows.map((row) => ({
      ...row,
      cost: Number(row.cost),
      price: Number(row.price),
      stock: Number(row.stock),
      safetyStock: Number(row.safetyStock),
      taxRate: Number(row.taxRate),
    }));
  }
}
