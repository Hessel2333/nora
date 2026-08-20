import { Injectable } from "@nestjs/common";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { presentWorkOrder, workOrderInclude } from "./work-orders.presenter.js";

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.workOrder.findMany({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      include: workOrderInclude,
      orderBy: [{ scheduledStartAt: "asc" }, { code: "desc" }],
      take: 100,
    });
    return { data: rows.map(presentWorkOrder) };
  }
}
