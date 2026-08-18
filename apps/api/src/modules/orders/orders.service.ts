import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type { OrderEventType, SalesOrderSource, SalesOrderStatus } from "../../generated/prisma/enums.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { BomsService } from "../boms/boms.service.js";
import type { CreateOrderDto, ListOrdersQueryDto, OrderActionDto, UpdateOrderDto } from "./dto/order.dto.js";
import { canTransitionOrder } from "./order-policy.js";
import { orderInclude, presentOrder } from "./orders.presenter.js";
import { presentProductionDemand, productionDemandInclude } from "./production-demand.presenter.js";

type TransactionClient = Prisma.TransactionClient;

const sourceValues: Record<CreateOrderDto["source"], SalesOrderSource> = {
  客户下单: "customer",
  手工录入: "manual",
  AI预测: "ai_forecast",
  Excel导入: "excel_import",
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boms: BomsService,
  ) {}

  async list(query: ListOrdersQueryDto) {
    const where = {
      organizationId: DEFAULT_ORGANIZATION_ID,
      ...(query.status ? { status: query.status } : {}),
      ...(query.query
        ? {
            OR: [
              { code: { contains: query.query, mode: "insensitive" as const } },
              { customerName: { contains: query.query, mode: "insensitive" as const } },
              { lines: { some: { productName: { contains: query.query, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        include: orderInclude,
        orderBy: [{ deliveryAt: "asc" }, { code: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return { data: rows.map(presentOrder), page: query.page, pageSize: query.pageSize, total };
  }

  async get(id: string) {
    const order = await this.findOrder(id);
    return presentOrder(order);
  }

  async create(input: CreateOrderDto) {
    this.assertUniqueProducts(input.lines.map((line) => line.productId));
    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" },
      });
      if (!customer) throw new BadRequestException("客户不存在或已停用");
      const products = await tx.product.findMany({
        where: { id: { in: input.lines.map((line) => line.productId) }, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" },
      });
      if (products.length !== input.lines.length) throw new BadRequestException("订单包含不存在或已停用的商品");
      const productMap = new Map(products.map((product) => [product.id, product]));
      const code = await this.nextOrderCode(tx);
      return tx.salesOrder.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          code,
          customerId: customer.id,
          customerName: customer.name,
          deliveryAt: new Date(input.deliveryAt),
          status: input.status,
          source: sourceValues[input.source],
          contact: customer.contact,
          phone: customer.phone,
          address: customer.address,
          notes: input.notes || null,
          lines: {
            create: input.lines.map((line, index) => {
              const product = productMap.get(line.productId)!;
              return {
                productId: product.id,
                productCode: product.code,
                productName: product.name,
                quantity: line.quantity,
                unit: product.unit,
                unitPrice: product.price,
                sortOrder: index,
              };
            }),
          },
          events: {
            create: [
              { type: "created", label: "创建订单", actor: "演示用户" },
              ...(input.status === "pending"
                ? [{ type: "submitted" as const, label: "提交审核", actor: "演示用户" }]
                : []),
            ],
          },
        },
        include: orderInclude,
      });
    });
    return presentOrder(order);
  }

  async approve(id: string, input: OrderActionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.salesOrder.findFirst({
        where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
        include: { lines: { orderBy: { sortOrder: "asc" } } },
      });
      if (!existing) throw new NotFoundException("订单不存在");
      if (!canTransitionOrder(existing.status, "approved")) {
        throw new ConflictException(`订单不能从 ${existing.status} 变更为 approved`);
      }

      const changed = await tx.salesOrder.updateMany({
        where: { id, status: existing.status, revision: existing.revision },
        data: { status: "approved", revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new ConflictException("订单已被其他操作更新，请刷新后重试");

      const approvedAt = new Date();
      await tx.salesOrderEvent.create({
        data: {
          salesOrderId: id,
          type: "approved",
          label: "审核通过并创建生产需求",
          actor: input.actor ?? "演示用户",
          comment: input.comment || null,
        },
      });

      const demandLines = await this.resolveDemandLines(tx, existing);
      const demandCode = await this.nextDocumentCode(tx, "PD", "PD");
      await tx.productionDemand.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          code: demandCode,
          salesOrderId: id,
          factoryCode: "SZ-CENTRAL",
          factoryName: "深圳中央工厂",
          requiredAt: existing.deliveryAt,
          status: "pending_planning",
          approvedAt,
          lines: { create: demandLines },
        },
      });

      return tx.salesOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    return presentOrder(result);
  }

  async update(id: string, input: UpdateOrderDto) {
    this.assertUniqueProducts(input.lines.map((line) => line.productId));
    const order = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.salesOrder.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID } });
      if (!existing) throw new NotFoundException("订单不存在");
      if (existing.status !== "draft") throw new ConflictException("只有草稿订单可以修改");
      if (existing.revision !== input.revision) throw new ConflictException("订单已被其他操作更新，请刷新后重试");
      const customer = await tx.customer.findFirst({ where: { id: input.customerId, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" } });
      if (!customer) throw new BadRequestException("客户不存在或已停用");
      const products = await tx.product.findMany({ where: { id: { in: input.lines.map((line) => line.productId) }, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" } });
      if (products.length !== input.lines.length) throw new BadRequestException("订单包含不存在或已停用的商品");
      const productMap = new Map(products.map((product) => [product.id, product]));
      const changed = await tx.salesOrder.updateMany({
        where: { id, revision: input.revision, status: "draft" },
        data: {
          customerId: customer.id,
          customerName: customer.name,
          deliveryAt: new Date(input.deliveryAt),
          status: input.status,
          source: sourceValues[input.source],
          contact: customer.contact,
          phone: customer.phone,
          address: customer.address,
          notes: input.notes || null,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new ConflictException("订单已被其他操作更新，请刷新后重试");
      await tx.salesOrderLine.deleteMany({ where: { salesOrderId: id } });
      await tx.salesOrderLine.createMany({
        data: input.lines.map((line, index) => {
          const product = productMap.get(line.productId)!;
          return {
            salesOrderId: id,
            productId: product.id,
            productCode: product.code,
            productName: product.name,
            quantity: line.quantity,
            unit: product.unit,
            unitPrice: product.price,
            sortOrder: index,
          };
        }),
      });
      await tx.salesOrderEvent.create({
        data: {
          salesOrderId: id,
          type: input.status === "pending" ? "submitted" : "status_changed",
          label: input.status === "pending" ? "修改并重新提交" : "更新草稿",
          actor: "演示用户",
        },
      });
      return tx.salesOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    return presentOrder(order);
  }

  async transition(
    id: string,
    target: SalesOrderStatus,
    eventType: OrderEventType,
    label: string,
    input: OrderActionDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.salesOrder.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID } });
      if (!existing) throw new NotFoundException("订单不存在");
      if (!canTransitionOrder(existing.status, target)) {
        throw new ConflictException(`订单不能从 ${existing.status} 变更为 ${target}`);
      }
      const updated = await tx.salesOrder.updateMany({
        where: { id, status: existing.status, revision: existing.revision },
        data: { status: target, revision: { increment: 1 } },
      });
      if (updated.count !== 1) throw new ConflictException("订单已被其他操作更新，请刷新后重试");
      await tx.salesOrderEvent.create({
        data: {
          salesOrderId: id,
          type: eventType,
          label,
          actor: input.actor ?? "演示用户",
          comment: input.comment || null,
        },
      });
      return tx.salesOrder.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });
    return presentOrder(result);
  }

  async materialRequirements(id: string) {
    const order = await this.findOrder(id);
    if (!["approved", "in_production", "delivering", "completed", "reconciled"].includes(order.status)) {
      throw new ConflictException("订单审核通过后才能展开物料需求");
    }
    return this.boms.explodeOrder(order);
  }

  async productionReadiness(id: string) {
    const order = await this.findOrder(id);
    const lines = await this.prisma.$transaction((tx) => this.resolveDemandLines(tx, order));
    const presentedLines = lines.map((line) => ({
      salesOrderLineId: line.salesOrderLineId,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      requiredQuantity: Number(line.requiredQuantity),
      unit: line.unit,
      bomReady: Boolean(line.selectedBomVersionId),
      selectedBomVersionId: line.selectedBomVersionId ?? undefined,
      selectedBomVersion: line.bomVersionSnapshot ?? undefined,
    }));
    return {
      orderId: order.id,
      deliveryAt: order.deliveryAt.toISOString(),
      ready: presentedLines.every((line) => line.bomReady),
      readyLineCount: presentedLines.filter((line) => line.bomReady).length,
      missingBomCount: presentedLines.filter((line) => !line.bomReady).length,
      lines: presentedLines,
    };
  }

  async productionDemand(id: string) {
    const demand = await this.prisma.productionDemand.findFirst({
      where: { salesOrderId: id, organizationId: DEFAULT_ORGANIZATION_ID },
      include: productionDemandInclude,
    });
    if (!demand) throw new NotFoundException("订单尚未生成生产需求");
    return presentProductionDemand(demand);
  }

  private async findOrder(id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
      include: orderInclude,
    });
    if (!order) throw new NotFoundException("订单不存在");
    return order;
  }

  private assertUniqueProducts(productIds: string[]) {
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException("同一商品不能重复添加，请合并数量");
    }
  }

  private async resolveDemandLines(
    tx: TransactionClient,
    order: Pick<OrderRecordForDemand, "deliveryAt" | "lines">,
  ) {
    const boms = await tx.bom.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        productId: { in: order.lines.map((line) => line.productId) },
      },
      select: {
        productId: true,
        versions: {
          where: { status: "effective", effectiveAt: { lte: order.deliveryAt } },
          orderBy: { effectiveAt: "desc" },
          take: 1,
          select: { id: true, version: true },
        },
      },
    });
    const versionByProductId = new Map(
      boms.map((bom) => [bom.productId, bom.versions[0]]),
    );

    return order.lines.map((line, index) => {
      const selectedVersion = versionByProductId.get(line.productId);
      return {
        salesOrderLineId: line.id,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        requiredQuantity: line.quantity,
        unit: line.unit,
        selectedBomVersionId: selectedVersion?.id,
        bomVersionSnapshot: selectedVersion?.version,
        sortOrder: index,
      };
    });
  }

  private async nextOrderCode(tx: TransactionClient) {
    return this.nextDocumentCode(tx, "SO", "SO");
  }

  private async nextDocumentCode(tx: TransactionClient, kind: string, prefix: string) {
    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replaceAll("-", "");
    const sequence = await tx.documentNumber.upsert({
      where: { organizationId_kind_dateKey: { organizationId: DEFAULT_ORGANIZATION_ID, kind, dateKey } },
      create: { organizationId: DEFAULT_ORGANIZATION_ID, kind, dateKey, currentValue: 1 },
      update: { currentValue: { increment: 1 } },
    });
    return `${prefix}${dateKey}${String(sequence.currentValue).padStart(4, "0")}`;
  }
}

type OrderRecordForDemand = {
  deliveryAt: Date;
  lines: Array<{
    id: string;
    productId: string;
    productCode: string;
    productName: string;
    quantity: Prisma.Decimal;
    unit: string;
  }>;
};
