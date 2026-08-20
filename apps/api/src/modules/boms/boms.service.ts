import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Prisma } from "../../generated/prisma/client.js";
import type { ProductType } from "../../generated/prisma/enums.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { resolveAuditActor } from "../../common/runtime-mode.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { OrderRecord } from "../orders/orders.presenter.js";
import { isBomValidityConstraintConflict } from "./bom-errors.js";
import { calculateGrossQuantity } from "./bom-policy.js";
import type { BomItemDto, BomOperationDto, CopyBomVersionDto, CreateBomDto, PublishBomVersionDto, UpdateBomVersionDto } from "./dto/bom.dto.js";
import { bomInclude, presentBom } from "./boms.presenter.js";
import type { RecipeSnapshot } from "./recipe-snapshot.js";

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
    const actor = resolveAuditActor();
    this.assertDefinition(input.operations, input.items);
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: input.productId, organizationId: DEFAULT_ORGANIZATION_ID } });
      if (!product) throw new BadRequestException("产出商品不存在");
      await this.loadComponents(tx, input.productId, input.items);
      const operationRecords = this.buildOperations(input.operations);
      const operationIds = new Map(operationRecords.map((operation) => [operation.code, operation.id]));
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
              operations: { create: operationRecords },
              items: { create: await this.buildItems(tx, input.items, operationIds) },
            },
          },
        },
        include: bomInclude,
      });
      const version = bom.versions[0];
      if (!version) throw new ConflictException("BOM 初始版本创建失败");
      await tx.bomVersionEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          bomVersionId: version.id,
          type: "created",
          actor,
          revision: version.revision,
        },
      });
      return { bomId: bom.id, versionId: version.id };
    });
    return presentBom(await this.findBom(result.bomId), result.versionId);
  }

  async copyVersion(id: string, input: CopyBomVersionDto) {
    const actor = resolveAuditActor();
    const result = await this.prisma.$transaction(async (tx) => {
      const bom = await tx.bom.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID }, include: { versions: { include: { items: true, operations: { orderBy: { sequence: "asc" } } }, orderBy: { createdAt: "desc" } } } });
      if (!bom) throw new NotFoundException("BOM 不存在");
      const source = bom.versions.find((version) => version.id === input.sourceVersionId) ?? bom.versions.find((version) => version.status === "effective") ?? bom.versions[0];
      if (!source) throw new ConflictException("BOM 没有可复制的版本");
      const operationRecords = source.operations.map((operation) => ({
        id: randomUUID(),
        code: operation.code,
        name: operation.name,
        kind: operation.kind,
        sequence: operation.sequence,
        workCenter: operation.workCenter,
        durationMinutes: operation.durationMinutes,
        waitMinutes: operation.waitMinutes,
        temperatureMin: operation.temperatureMin,
        temperatureMax: operation.temperatureMax,
        instructions: operation.instructions,
      }));
      const operationIds = new Map(source.operations.map((operation, index) => [operation.id, operationRecords[index]!.id]));
      const created = await tx.bomVersion.create({
        data: {
          bomId: bom.id,
          version: input.version,
          previousVersionId: source.id,
          outputQuantity: source.outputQuantity,
          outputUnit: source.outputUnit,
          operations: { create: operationRecords },
          items: {
            create: source.items.map((item) => ({
              operationId: operationIds.get(item.operationId)!,
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
      await tx.bomVersionEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          bomVersionId: created.id,
          type: "created",
          actor,
          revision: created.revision,
          details: { copiedFromVersionId: source.id },
        },
      });
      return { bomId: bom.id, versionId: created.id };
    });
    const bom = await this.findBom(result.bomId);
    return presentBom(bom, result.versionId);
  }

  async updateDraft(versionId: string, input: UpdateBomVersionDto) {
    const actor = resolveAuditActor();
    this.assertDefinition(input.operations, input.items);
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
      await tx.bomOperation.deleteMany({ where: { bomVersionId: version.id } });
      const operationRecords = this.buildOperations(input.operations);
      await tx.bomOperation.createMany({ data: operationRecords.map((operation) => ({ ...operation, bomVersionId: version.id })) });
      const operationIds = new Map(operationRecords.map((operation) => [operation.code, operation.id]));
      await tx.bomItem.createMany({ data: (await this.buildItems(tx, input.items, operationIds)).map((item) => ({ ...item, bomVersionId: version.id })) });
      await tx.bomVersionEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          bomVersionId: version.id,
          type: "updated",
          actor,
          revision: input.revision + 1,
        },
      });
      return version.bomId;
    });
    return presentBom(await this.findBom(result), versionId);
  }

  async publish(versionId: string, input: PublishBomVersionDto) {
    const actor = resolveAuditActor();
    let result: string;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const version = await tx.bomVersion.findFirst({
          where: { id: versionId, bom: { organizationId: DEFAULT_ORGANIZATION_ID } },
          include: { items: true, operations: true },
        });
        if (!version) throw new NotFoundException("BOM 版本不存在");
        if (version.status !== "draft") throw new ConflictException("只有草稿版本可以发布");
        if (version.revision !== input.revision) throw new ConflictException("BOM 版本已被其他操作更新，请刷新后重试");
        if (version.items.length === 0) throw new BadRequestException("BOM 至少需要一项物料");
        if (version.operations.length === 0) throw new BadRequestException("配方版本至少需要一道工序");
        if (version.items.some((item) => !version.operations.some((operation) => operation.id === item.operationId))) {
          throw new BadRequestException("所有物料必须分配到当前版本的投料工序");
        }
        const now = new Date();
        const effectiveAt = input.effectiveAt ? new Date(input.effectiveAt) : now;
        if (Number.isNaN(effectiveAt.getTime())) throw new BadRequestException("BOM 生效时间无效");
        const previous = await tx.bomVersion.findFirst({
          where: { bomId: version.bomId, status: { not: "draft" }, effectiveAt: { not: null } },
          orderBy: [{ effectiveAt: "desc" }, { createdAt: "desc" }],
        });
        if (previous?.effectiveAt && previous.effectiveAt >= effectiveAt) {
          throw new ConflictException("新版本生效时间必须晚于已发布版本；如需修正历史版本，请先创建迁移方案");
        }
        if (previous?.effectiveTo && previous.effectiveTo > effectiveAt) {
          throw new ConflictException("新版本生效时间与已发布版本有效期重叠");
        }
        if (previous && !previous.effectiveTo) {
          await tx.bomVersion.update({
            where: { id: previous.id },
            data: {
              effectiveTo: effectiveAt,
              ...(effectiveAt <= now ? { status: "retired" as const } : {}),
              revision: { increment: 1 },
            },
          });
          await tx.bomVersionEvent.create({
            data: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              bomVersionId: previous.id,
              type: "superseded",
              actor,
              revision: previous.revision + 1,
              effectiveAt,
              details: { supersededByVersionId: version.id },
            },
          });
        }
        const changed = await tx.bomVersion.updateMany({
          where: { id: version.id, status: "draft", revision: input.revision },
          data: {
            status: "effective",
            effectiveAt,
            effectiveTo: null,
            publishedAt: new Date(),
            revision: { increment: 1 },
          },
        });
        if (changed.count !== 1) throw new ConflictException("BOM 版本已被其他操作发布，请刷新后重试");
        await tx.bomVersionEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            bomVersionId: version.id,
            type: "published",
            actor,
            revision: input.revision + 1,
            effectiveAt,
            details: { activation: effectiveAt > now ? "scheduled" : "immediate" },
          },
        });
        return version.bomId;
      });
    } catch (error) {
      if (isBomValidityConstraintConflict(error)) {
        throw new ConflictException("配方版本时间线已被其他发布操作更新，请刷新后重新选择生效时间");
      }
      throw error;
    }
    return presentBom(await this.findBom(result), versionId);
  }

  async retire(versionId: string) {
    const actor = resolveAuditActor();
    const result = await this.prisma.$transaction(async (tx) => {
      const version = await tx.bomVersion.findFirst({ where: { id: versionId, bom: { organizationId: DEFAULT_ORGANIZATION_ID } } });
      if (!version) throw new NotFoundException("BOM 版本不存在");
      if (version.status !== "effective") throw new ConflictException("只有已生效版本可以停用");
      const retiredAt = new Date();
      if (version.effectiveAt && version.effectiveAt > retiredAt) {
        throw new ConflictException("未来生效的 BOM 版本不能直接停用；请创建新的计划版本或走受控计划变更");
      }
      const changed = await tx.bomVersion.updateMany({
        where: { id: version.id, status: "effective", revision: version.revision },
        data: {
          status: "retired",
          ...(!version.effectiveTo || version.effectiveTo > retiredAt ? { effectiveTo: retiredAt } : {}),
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new ConflictException("BOM 版本已被其他操作更新，请刷新后重试");
      await tx.bomVersionEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          bomVersionId: version.id,
          type: "retired",
          actor,
          revision: version.revision + 1,
          effectiveAt: retiredAt,
        },
      });
      return version.bomId;
    });
    return presentBom(await this.findBom(result), versionId);
  }

  async captureRecipeSnapshot(
    tx: TransactionClient,
    productId: string,
    asAt: Date,
    path: string[] = [],
    capturedAt = new Date(),
  ): Promise<RecipeSnapshot> {
    if (path.includes(productId)) throw new ConflictException("BOM 存在循环引用，无法生成审批快照");
    const product = await tx.product.findFirst({
      where: { id: productId, organizationId: DEFAULT_ORGANIZATION_ID },
    });
    if (!product) throw new BadRequestException("BOM 包含不存在的商品");
    const bom = await tx.bom.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, productId },
      include: {
        versions: {
          where: {
            status: { not: "draft" },
            effectiveAt: { lte: asAt },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: asAt } }],
          },
          include: {
            operations: { orderBy: { sequence: "asc" } },
            items: {
              include: { componentProduct: true, operation: true },
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { effectiveAt: "desc" },
          take: 1,
        },
      },
    });
    const version = bom?.versions[0];
    const productSnapshot = {
      id: product.id,
      code: product.code,
      name: product.name,
      type: product.type,
      unit: product.unit,
      unitCost: Number(product.cost),
    };
    if (!bom || !version || !version.effectiveAt) {
      return {
        schemaVersion: 2,
        capturedAt: capturedAt.toISOString(),
        asAt: asAt.toISOString(),
        product: productSnapshot,
        bomVersion: null,
        operations: [],
        components: [],
      };
    }
    const nextPath = [...path, productId];
    const components: RecipeSnapshot["components"] = [];
    for (const item of version.items) {
      components.push({
        product: {
          id: item.componentProduct.id,
          code: item.componentProduct.code,
          name: item.componentProduct.name,
          type: item.componentProduct.type,
          unit: item.componentProduct.unit,
          unitCost: Number(item.componentProduct.cost),
        },
        operationCode: item.operation.code,
        netQuantity: Number(item.netQuantity),
        yieldRate: Number(item.yieldRate),
        unit: item.unit,
        unitCostSnapshot: Number(item.unitCostSnapshot),
        sortOrder: item.sortOrder,
        notes: item.notes,
        recipe: await this.captureRecipeSnapshot(tx, item.componentProductId, asAt, nextPath, capturedAt),
      });
    }
    return {
      schemaVersion: 2,
      capturedAt: capturedAt.toISOString(),
      asAt: asAt.toISOString(),
      product: productSnapshot,
      bomVersion: {
        id: version.id,
        bomId: bom.id,
        bomCode: bom.code,
        version: version.version,
        effectiveAt: version.effectiveAt.toISOString(),
        effectiveTo: version.effectiveTo?.toISOString() ?? null,
        outputQuantity: Number(version.outputQuantity),
        outputUnit: version.outputUnit,
      },
      operations: version.operations.map((operation) => ({
        code: operation.code,
        name: operation.name,
        kind: operation.kind,
        sequence: operation.sequence,
        workCenter: operation.workCenter,
        durationMinutes: operation.durationMinutes,
        waitMinutes: operation.waitMinutes,
        temperatureMin: operation.temperatureMin === null ? null : Number(operation.temperatureMin),
        temperatureMax: operation.temperatureMax === null ? null : Number(operation.temperatureMax),
        instructions: operation.instructions,
      })),
      components,
    };
  }

  explodeSnapshots(input: {
    orderId: string;
    orderCode: string;
    deliveryAt: Date;
    lines: Array<{ productName: string; requiredQuantity: number; snapshot: RecipeSnapshot }>;
  }) {
    const totals = new Map<string, Requirement>();
    const missingBoms = new Map<string, { productId: string; productCode: string; productName: string }>();
    for (const line of input.lines) {
      this.explodeSnapshotNode({
        snapshot: line.snapshot,
        quantity: line.requiredQuantity,
        source: `${input.orderCode} · ${line.productName}`,
        totals,
        missingBoms,
      });
    }
    const items = [...totals.values()]
      .map((item) => ({
        ...item,
        grossQuantity: this.round(item.grossQuantity, 6),
        estimatedCost: this.round(item.estimatedCost, 2),
      }))
      .sort((a, b) => a.productCode.localeCompare(b.productCode));
    return {
      orderId: input.orderId,
      orderCode: input.orderCode,
      deliveryAt: input.deliveryAt.toISOString(),
      generatedAt: new Date().toISOString(),
      basis: "approval_recipe_snapshot" as const,
      items,
      missingBoms: [...missingBoms.values()],
      totalEstimatedCost: this.round(items.reduce((sum, item) => sum + item.estimatedCost, 0), 2),
    };
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
          where: {
            status: { not: "draft" },
            effectiveAt: { lte: input.asAt },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.asAt } }],
          },
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

  private explodeSnapshotNode(input: {
    snapshot: RecipeSnapshot;
    quantity: number;
    source: string;
    totals: Map<string, Requirement>;
    missingBoms: Map<string, { productId: string; productCode: string; productName: string }>;
    unitCostOverride?: number;
    unitOverride?: string;
  }) {
    const { snapshot } = input;
    if (!snapshot.bomVersion) {
      if (snapshot.product.type === "finished" || snapshot.product.type === "combo") {
        input.missingBoms.set(snapshot.product.id, {
          productId: snapshot.product.id,
          productCode: snapshot.product.code,
          productName: snapshot.product.name,
        });
        return;
      }
      const unitCost = input.unitCostOverride ?? snapshot.product.unitCost;
      this.addRequirement(input.totals, {
        productId: snapshot.product.id,
        productCode: snapshot.product.code,
        productName: snapshot.product.name,
        productType: snapshot.product.type,
        unit: input.unitOverride ?? snapshot.product.unit,
        grossQuantity: input.quantity,
        unitCost,
        estimatedCost: input.quantity * unitCost,
        sources: [input.source],
      });
      return;
    }
    const factor = input.quantity / snapshot.bomVersion.outputQuantity;
    for (const component of snapshot.components) {
      this.explodeSnapshotNode({
        ...input,
        snapshot: component.recipe,
        quantity: calculateGrossQuantity(component.netQuantity, component.yieldRate, factor),
        unitCostOverride: component.unitCostSnapshot,
        unitOverride: component.unit,
      });
    }
  }

  private async findBom(id: string) {
    const bom = await this.prisma.bom.findFirst({ where: { id, organizationId: DEFAULT_ORGANIZATION_ID }, include: bomInclude });
    if (!bom) throw new NotFoundException("BOM 不存在");
    return bom;
  }

  private assertDefinition(operations: BomOperationDto[], items: BomItemDto[]) {
    const codes = operations.map((operation) => operation.code.trim());
    if (new Set(codes).size !== codes.length) throw new BadRequestException("同一版本的工序编码不能重复");
    if (new Set(operations.map((operation) => operation.sequence)).size !== operations.length) {
      throw new BadRequestException("同一版本的工序顺序不能重复");
    }
    for (const operation of operations) {
      if (operation.temperatureMin !== undefined && operation.temperatureMax !== undefined && operation.temperatureMin > operation.temperatureMax) {
        throw new BadRequestException(`${operation.name} 的最低温度不能高于最高温度`);
      }
    }
    const codeSet = new Set(codes);
    if (items.some((item) => !codeSet.has(item.operationCode.trim()))) {
      throw new BadRequestException("所有物料必须分配到当前版本的投料工序");
    }
  }

  private async loadComponents(tx: TransactionClient, outputProductId: string, items: BomItemDto[]) {
    if (items.some((item) => item.componentProductId === outputProductId)) throw new BadRequestException("产出商品不能直接作为自身物料");
    const componentIds = [...new Set(items.map((item) => item.componentProductId))];
    const products = await tx.product.findMany({ where: { id: { in: componentIds }, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" } });
    if (products.length !== componentIds.length) throw new BadRequestException("BOM 包含不存在或已停用的物料");
    return products;
  }

  private buildOperations(operations: BomOperationDto[]) {
    return [...operations]
      .sort((left, right) => left.sequence - right.sequence)
      .map((operation) => ({
        id: randomUUID(),
        code: operation.code.trim(),
        name: operation.name.trim(),
        kind: operation.kind,
        sequence: operation.sequence,
        workCenter: operation.workCenter?.trim() || null,
        durationMinutes: operation.durationMinutes ?? 0,
        waitMinutes: operation.waitMinutes ?? 0,
        temperatureMin: operation.temperatureMin ?? null,
        temperatureMax: operation.temperatureMax ?? null,
        instructions: operation.instructions?.trim() || null,
      }));
  }

  private async buildItems(tx: TransactionClient, items: BomItemDto[], operationIds: Map<string, string>) {
    const products = await tx.product.findMany({ where: { id: { in: items.map((item) => item.componentProductId) }, organizationId: DEFAULT_ORGANIZATION_ID } });
    const productMap = new Map(products.map((product) => [product.id, product]));
    return items.map((item, index) => ({
      operationId: operationIds.get(item.operationCode.trim())!,
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
