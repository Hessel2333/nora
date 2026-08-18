import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ProductType } from "../../generated/prisma/enums.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { OrderRecord } from "../orders/orders.presenter.js";
import { calculateGrossQuantity } from "./bom-policy.js";
import type { BomItemDto, CopyBomVersionDto, CreateBomDto, PublishBomVersionDto, UpdateBomVersionDto } from "./dto/bom.dto.js";
import { bomInclude, presentBom } from "./boms.presenter.js";

type TransactionClient = Prisma.TransactionClient;

type Requirement = {
  productId: string;
  productCode: string;
  productName: string;
  productType: ProductType;
  unit: string;
  grossQuantity: number;
  unitCost: number;
  estimatedCost: number;
  sources: string[];
};

@Injectable()
export class BomsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.bom.findMany({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      include: bomInclude,
      orderBy: { code: "asc" },
    });
    return { data: rows.map((row) => presentBom(row)), total: rows.length };
  }

  async get(id: string) {
    return presentBom(await this.findBom(id));
  }

  async create(input: CreateBomDto) {
    this.assertUniqueComponents(input.items);
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, organizationId: DEFAULT_ORGANIZATION_ID } });
      if (!product) throw new BadRequestException("产出商品不存在");
      await this.loadComponents(tx, input.productId, input.items);
      const bom = await tx.bom.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          productId: input.productId,
          code: input.code,
          versions: {
            create: {
              version: input.version,
              outputQuantity: input.outputQuantity,
              outputUnit: input.outputUnit,
              items: { create: await this.buildItems(tx, input.items) },
            },
          },
        },
        include: bomInclude,
      });
      return bom;
    });
    return presentBom(result);
  }

  async copyVersion(id: string, input: CopyBomVersionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const bom = await tx.bom.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID }, include: { versions: { include: { items: true }, orderBy: { createdAt: "desc" } } } });
      if (!bom) throw new NotFoundException("BOM 不存在");
      const source = bom.versions.find((version) => version.id === input.sourceVersionId) ?? bom.versions.find((version) => version.status === "effective") ?? bom.versions[0];
      if (!source) throw new ConflictException("BOM 没有可复制的版本");
      const created = await tx.bomVersion.create({
        data: {
          bomId: bom.id,
          version: input.version,
          previousVersionId: source.id,
          outputQuantity: source.outputQuantity,
          outputUnit: source.outputUnit,
          items: {
            create: source.items.map((item) => ({
              componentProductId: item.componentProductId,
              netQuantity: item.netQuantity,
              yieldRate: item.yieldRate,
              unit: item.unit,
              unitCostSnapshot: item.unitCostSnapshot,
              sortOrder: item.sortOrder,
              notes: item.notes,
            })),
          },
        },
      });
      return { bomId: bom.id, versionId: created.id };
    });
    const bom = await this.findBom(result.bomId);
    return presentBom(bom, result.versionId);
  }

  async updateDraft(versionId: string, input: UpdateBomVersionDto) {
    this.assertUniqueComponents(input.items);
    const result = await this.prisma.$transaction(async (tx) => {
      const version = await tx.bomVersion.findFirst({
        where: { id: versionId, bom: { organizationId: DEFAULT_ORGANIZATION_ID } },
        include: { bom: true },
      });
      if (!version) throw new NotFoundException("BOM 版本不存在");
      if (version.status !== "draft") throw new ConflictException("已发布或停用的 BOM 版本不可修改");
      if (version.revision !== input.revision) throw new ConflictException("BOM 版本已被其他操作更新，请刷新后重试");
      await this.loadComponents(tx, version.bom.productId, input.items);
      const changed = await tx.bomVersion.updateMany({
        where: { id: version.id, status: "draft", revision: input.revision },
        data: { outputQuantity: input.outputQuantity, outputUnit: input.outputUnit, revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new ConflictException("BOM 版本已被其他操作更新，请刷新后重试");
      await tx.bomItem.deleteMany({ where: { bomVersionId: version.id } });
      await tx.bomItem.createMany({ data: (await this.buildItems(tx, input.items)).map((item) => ({ ...item, bomVersionId: version.id })) });
      return version.bomId;
    });
    return presentBom(await this.findBom(result), versionId);
  }

  async publish(versionId: string, input: PublishBomVersionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const version = await tx.bomVersion.findFirst({
        where: { id: versionId, bom: { organizationId: DEFAULT_ORGANIZATION_ID } },
        include: { items: true },
      });
      if (!version) throw new NotFoundException("BOM 版本不存在");
      if (version.status !== "draft") throw new ConflictException("只有草稿版本可以发布");
      if (version.items.length === 0) throw new BadRequestException("BOM 至少需要一项物料");
      const effectiveAt = input.effectiveAt ? new Date(input.effectiveAt) : new Date();
      await tx.bomVersion.updateMany({
        where: { bomId: version.bomId, status: "effective" },
        data: { status: "retired" },
      });
      await tx.bomVersion.update({
        where: { id: version.id },
        data: { status: "effective", effectiveAt, publishedAt: new Date(), revision: { increment: 1 } },
      });
      return version.bomId;
    });
    return presentBom(await this.findBom(result), versionId);
  }

  async retire(versionId: string) {
    const version = await this.prisma.bomVersion.findFirst({ where: { id: versionId, bom: { organizationId: DEFAULT_ORGANIZATION_ID } } });
    if (!version) throw new NotFoundException("BOM 版本不存在");
    if (version.status !== "effective") throw new ConflictException("只有已生效版本可以停用");
    await this.prisma.bomVersion.update({ where: { id: version.id }, data: { status: "retired", revision: { increment: 1 } } });
    return presentBom(await this.findBom(version.bomId), versionId);
  }

  async explodeOrder(order: OrderRecord) {
    const totals = new Map<string, Requirement>();
    const missingBoms = new Map<string, { productId: string; productCode: string; productName: string }>();
    for (const line of order.lines) {
      await this.explodeProduct({
        productId: line.productId,
        quantity: Number(line.quantity),
        asAt: order.deliveryAt,
        path: [],
        source: `${order.code} · ${line.productName}`,
        totals,
        missingBoms,
      });
    }
    const items = [...totals.values()]
      .map((item) => ({ ...item, grossQuantity: this.round(item.grossQuantity, 6), estimatedCost: this.round(item.estimatedCost, 2) }))
      .sort((a, b) => a.productCode.localeCompare(b.productCode));
    return {
      orderId: order.id,
      orderCode: order.code,
      deliveryAt: order.deliveryAt.toISOString(),
      generatedAt: new Date().toISOString(),
      items,
      missingBoms: [...missingBoms.values()],
      totalEstimatedCost: this.round(items.reduce((sum, item) => sum + item.estimatedCost, 0), 2),
    };
  }

  private async explodeProduct(input: {
    productId: string;
    quantity: number;
    asAt: Date;
    path: string[];
    source: string;
    totals: Map<string, Requirement>;
    missingBoms: Map<string, { productId: string; productCode: string; productName: string }>;
  }): Promise<void> {
    if (input.path.includes(input.productId)) throw new ConflictException("BOM 存在循环引用，无法展开");
    const product = await this.prisma.product.findFirst({ where: { id: input.productId, organizationId: DEFAULT_ORGANIZATION_ID } });
    if (!product) throw new BadRequestException("BOM 包含不存在的商品");
    const bom = await this.prisma.bom.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, productId: input.productId },
      include: {
        versions: {
          where: { status: "effective", effectiveAt: { lte: input.asAt } },
          include: { items: { include: { componentProduct: true }, orderBy: { sortOrder: "asc" } } },
          orderBy: { effectiveAt: "desc" },
          take: 1,
        },
      },
    });
    const version = bom?.versions[0];
    if (!version) {
      if (product.type === "finished" || product.type === "combo") {
        input.missingBoms.set(product.id, { productId: product.id, productCode: product.code, productName: product.name });
        return;
      }
      this.addRequirement(input.totals, {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        productType: product.type,
        unit: product.unit,
        grossQuantity: input.quantity,
        unitCost: Number(product.cost),
        estimatedCost: input.quantity * Number(product.cost),
        sources: [input.source],
      });
      return;
    }
    const factor = input.quantity / Number(version.outputQuantity);
    for (const item of version.items) {
      const gross = calculateGrossQuantity(Number(item.netQuantity), Number(item.yieldRate), factor);
      await this.explodeProduct({
        ...input,
        productId: item.componentProductId,
        quantity: gross,
        path: [...input.path, input.productId],
      });
    }
  }

  private addRequirement(totals: Map<string, Requirement>, next: Requirement) {
    const current = totals.get(next.productId);
    if (!current) {
      totals.set(next.productId, next);
      return;
    }
    current.grossQuantity += next.grossQuantity;
    current.estimatedCost += next.estimatedCost;
    current.sources = [...new Set([...current.sources, ...next.sources])];
  }

  private async findBom(id: string) {
    const bom = await this.prisma.bom.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID }, include: bomInclude });
    if (!bom) throw new NotFoundException("BOM 不存在");
    return bom;
  }

  private assertUniqueComponents(items: BomItemDto[]) {
    if (new Set(items.map((item) => item.componentProductId)).size !== items.length) {
      throw new BadRequestException("同一物料不能在一个 BOM 版本中重复添加");
    }
  }

  private async loadComponents(tx: TransactionClient, outputProductId: string, items: BomItemDto[]) {
    if (items.some((item) => item.componentProductId === outputProductId)) throw new BadRequestException("产出商品不能直接作为自身物料");
    const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.componentProductId) }, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" } });
    if (products.length !== items.length) throw new BadRequestException("BOM 包含不存在或已停用的物料");
    return products;
  }

  private async buildItems(tx: TransactionClient, items: BomItemDto[]) {
    const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.componentProductId) }, organizationId: DEFAULT_ORGANIZATION_ID } });
    const productMap = new Map(products.map((product) => [product.id, product]));
    return items.map((item, index) => ({
      componentProductId: item.componentProductId,
      netQuantity: item.netQuantity,
      yieldRate: item.yieldRate,
      unit: item.unit,
      unitCostSnapshot: productMap.get(item.componentProductId)!.cost,
      sortOrder: index,
      notes: item.notes || null,
    }));
  }

  private round(value: number, digits: number) {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
