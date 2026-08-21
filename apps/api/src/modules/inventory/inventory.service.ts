import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { resolveAuditActor } from "../../common/runtime-mode.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { isExecutableRecipeSnapshot } from "../boms/recipe-snapshot.js";
import { remainingIssuedQuantity } from "../work-order-material-usages/work-order-material-usage-policy.js";
import {
  presentWorkOrderMaterialUsage,
  workOrderMaterialUsageInclude,
} from "../work-order-material-usages/work-order-material-usages.presenter.js";
import type {
  CreateOpeningBalanceDto,
  InventoryQueryDto,
  WorkOrderMaterialMovementDto,
} from "./dto/inventory.dto.js";
import {
  inventoryTransactionInclude,
  presentInventoryLocation,
  presentInventoryTransaction,
  presentStockBalance,
  stockBalanceInclude,
} from "./inventory.presenter.js";
import {
  calculateWorkOrderMaterialRequirements,
  isMaterialMovementAllowed,
  type WorkOrderMaterialMovement,
} from "./work-order-material-policy.js";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async listLocations() {
    const rows = await this.prisma.inventoryLocation.findMany({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, active: true },
      orderBy: [{ factoryCode: "asc" }, { code: "asc" }],
    });
    return { data: rows.map(presentInventoryLocation) };
  }

  async listStock(query: InventoryQueryDto) {
    const rows = await this.prisma.stockBalanceProjection.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        onHandQuantity: { gt: 0 },
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.lotId ? { lotId: query.lotId } : {}),
        ...(query.qualityStatus ? { lot: { qualityStatus: query.qualityStatus } } : {}),
      },
      include: stockBalanceInclude,
      orderBy: [{ lot: { expiresAt: "asc" } }, { product: { code: "asc" } }],
      take: 200,
    });
    return { data: rows.map(presentStockBalance) };
  }

  async listTransactions(query: InventoryQueryDto) {
    const rows = await this.prisma.inventoryTransaction.findMany({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.lotId ? { lotId: query.lotId } : {}),
      },
      include: inventoryTransactionInclude,
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return { data: rows.map(presentInventoryTransaction) };
  }

  async createOpeningBalance(input: CreateOpeningBalanceDto, idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    const actor = resolveAuditActor(input.actor);
    const quantity = new Prisma.Decimal(input.quantity);
    if (!quantity.gt(0)) throw new BadRequestException("期初数量必须大于 0");

    const receivedAt = new Date(input.receivedAt);
    const productionAt = input.productionAt ? new Date(input.productionAt) : undefined;
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;
    if (expiresAt && expiresAt <= receivedAt) {
      throw new BadRequestException("失效时间必须晚于收货时间");
    }
    const lotCode = input.lotCode.trim().toUpperCase();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const repeated = await tx.inventoryTransaction.findFirst({
          where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey: normalizedKey },
          include: inventoryTransactionInclude,
        });
        if (repeated) return this.readOpeningBalanceResult(tx, repeated);

        const [location, product, existingLot] = await Promise.all([
          tx.inventoryLocation.findFirst({
            where: { id: input.locationId, organizationId: DEFAULT_ORGANIZATION_ID, active: true },
          }),
          tx.product.findFirst({
            where: { id: input.productId, organizationId: DEFAULT_ORGANIZATION_ID, status: "active" },
          }),
          tx.inventoryLot.findFirst({
            where: { organizationId: DEFAULT_ORGANIZATION_ID, code: lotCode },
          }),
        ]);
        if (!location) throw new NotFoundException("库存库位不存在、未启用或不属于当前组织");
        if (!product) throw new NotFoundException("产品不存在、未启用或不属于当前组织");
        if (existingLot) throw new ConflictException("库存批次号已存在，不能重复登记期初库存");
        if (product.unit !== input.unit.trim()) {
          throw new ConflictException(`库存单位必须使用产品基础单位 ${product.unit}`);
        }

        const lot = await tx.inventoryLot.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            productId: product.id,
            code: lotCode,
            supplierLotCode: input.supplierLotCode?.trim(),
            qualityStatus: input.qualityStatus,
            receivedAt,
            productionAt,
            expiresAt,
            createdBy: actor,
          },
        });
        const transaction = await tx.inventoryTransaction.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            locationId: location.id,
            productId: product.id,
            lotId: lot.id,
            type: "opening_balance",
            direction: "inbound",
            quantity,
            unit: product.unit,
            sourceType: "opening_balance",
            referenceCode: lot.code,
            note: input.note?.trim(),
            actor,
            idempotencyKey: normalizedKey,
            occurredAt: receivedAt,
          },
          include: inventoryTransactionInclude,
        });
        const balance = await tx.stockBalanceProjection.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            locationId: location.id,
            productId: product.id,
            lotId: lot.id,
            onHandQuantity: quantity,
          },
          include: stockBalanceInclude,
        });
        return {
          transaction: presentInventoryTransaction(transaction),
          balance: presentStockBalance(balance),
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.prisma.inventoryTransaction.findFirst({
          where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey: normalizedKey },
          include: inventoryTransactionInclude,
        });
        if (repeated) return this.readOpeningBalanceResult(this.prisma, repeated);
        throw new ConflictException("库存批次号已存在，不能重复登记期初库存");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("库存同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  getWorkOrderMaterials(id: string) {
    return this.buildWorkOrderMaterials(this.prisma, id);
  }

  issueWorkOrderMaterial(
    id: string,
    input: WorkOrderMaterialMovementDto,
    idempotencyKey?: string,
  ) {
    return this.moveWorkOrderMaterial(id, "issue", input, idempotencyKey);
  }

  returnWorkOrderMaterial(
    id: string,
    input: WorkOrderMaterialMovementDto,
    idempotencyKey?: string,
  ) {
    return this.moveWorkOrderMaterial(id, "return", input, idempotencyKey);
  }

  private async moveWorkOrderMaterial(
    id: string,
    movement: WorkOrderMaterialMovement,
    input: WorkOrderMaterialMovementDto,
    idempotencyKey?: string,
  ) {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);
    const quantity = new Prisma.Decimal(input.quantity);
    if (!quantity.gt(0)) throw new BadRequestException("领退料数量必须大于 0");
    const workstationCode = input.workstationCode.trim();
    const deviceId = input.deviceId.trim();
    if (!workstationCode || !deviceId) throw new BadRequestException("工位和设备标识不能为空");

    try {
      return await this.prisma.$transaction(async (tx) => {
        const repeatedBeforeLock = await this.repeatedMaterialMovement(tx, id, movement, normalizedKey);
        if (repeatedBeforeLock) return repeatedBeforeLock;

        await this.lockWorkOrder(tx, id);
        const repeatedAfterLock = await this.repeatedMaterialMovement(tx, id, movement, normalizedKey);
        if (repeatedAfterLock) return repeatedAfterLock;

        const workOrder = await tx.workOrder.findFirst({
          where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
          select: {
            id: true,
            code: true,
            status: true,
            recipeSnapshot: true,
            plannedQuantity: true,
          },
        });
        if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
        if (!isMaterialMovementAllowed(workOrder.status, movement)) {
          throw new ConflictException(
            movement === "issue" ? "当前工单状态不允许新增领料" : "当前工单状态不允许退料",
          );
        }
        if (!isExecutableRecipeSnapshot(workOrder.recipeSnapshot)) {
          throw new UnprocessableEntityException("工单冻结配方不完整，不能领退料");
        }
        const requirements = calculateWorkOrderMaterialRequirements(
          workOrder.recipeSnapshot,
          workOrder.plannedQuantity,
        );

        await this.lockStockBalance(tx, input.stockBalanceId);
        const balance = await tx.stockBalanceProjection.findFirst({
          where: { id: input.stockBalanceId, organizationId: DEFAULT_ORGANIZATION_ID },
          include: stockBalanceInclude,
        });
        if (!balance) throw new NotFoundException("库存余额不存在或不属于当前组织");
        if (balance.revision !== input.expectedBalanceRevision) {
          throw new ConflictException("库存余额已被更新，请刷新后重试");
        }
        const productRequirements = requirements.filter((item) => item.productId === balance.productId);
        if (!productRequirements.length) {
          throw new UnprocessableEntityException("所选产品不在工单冻结配方的原料需求中");
        }
        const requirement = productRequirements.find((item) => (
          item.unit === input.unit.trim() && item.unit === balance.product.unit
        ));
        if (!requirement) {
          throw new UnprocessableEntityException(`领退料必须使用库存基础单位 ${balance.product.unit}`);
        }

        const [previousMovements, previousUsages] = await Promise.all([
          tx.inventoryTransaction.findMany({
            where: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              workOrderId: id,
              productId: balance.productId,
              type: { in: ["issue", "return"] },
            },
            select: {
              type: true,
              quantity: true,
              locationId: true,
              lotId: true,
            },
          }),
          tx.workOrderMaterialUsage.findMany({
            where: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              workOrderId: id,
              locationId: balance.locationId,
              productId: balance.productId,
              lotId: balance.lotId,
              unit: requirement.unit,
            },
            select: { disposition: true, quantity: true },
          }),
        ]);
        const productNetIssued = previousMovements.reduce(
          (total, current) => current.type === "issue"
            ? total.add(current.quantity)
            : total.sub(current.quantity),
          new Prisma.Decimal(0),
        );
        const lotNetIssued = previousMovements
          .filter((current) => current.locationId === balance.locationId && current.lotId === balance.lotId)
          .reduce(
            (total, current) => current.type === "issue"
              ? total.add(current.quantity)
              : total.sub(current.quantity),
            new Prisma.Decimal(0),
          );
        const lotConsumed = previousUsages
          .filter((usage) => usage.disposition === "consumed")
          .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
        const lotScrapped = previousUsages
          .filter((usage) => usage.disposition === "scrapped")
          .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
        const lotReturnable = remainingIssuedQuantity(lotNetIssued, lotConsumed, lotScrapped);

        if (movement === "issue") {
          if (balance.lot.qualityStatus !== "released") {
            throw new ConflictException("只有已放行库存批次可以领料");
          }
          if (balance.lot.expiresAt && balance.lot.expiresAt <= new Date()) {
            throw new ConflictException("库存批次已失效，不能领料");
          }
          if (quantity.greaterThan(balance.onHandQuantity)) {
            throw new ConflictException(`库存不足，当前批次仅有 ${balance.onHandQuantity.toFixed(3)} ${balance.product.unit}`);
          }
          if (productNetIssued.add(quantity).greaterThan(requirement.plannedQuantity)) {
            const remaining = Prisma.Decimal.max(requirement.plannedQuantity.sub(productNetIssued), 0);
            throw new ConflictException(`超过计划剩余领料量 ${remaining.toFixed(3)} ${requirement.unit}`);
          }
        } else if (quantity.greaterThan(lotReturnable)) {
          throw new ConflictException(`超过该批次待核销量 ${lotReturnable.toFixed(3)} ${requirement.unit}`);
        }

        const updated = await tx.stockBalanceProjection.updateMany({
          where: {
            id: balance.id,
            organizationId: DEFAULT_ORGANIZATION_ID,
            revision: input.expectedBalanceRevision,
            ...(movement === "issue" ? { onHandQuantity: { gte: quantity } } : {}),
          },
          data: {
            onHandQuantity: movement === "issue" ? { decrement: quantity } : { increment: quantity },
            revision: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new ConflictException("库存余额同时被更新，请刷新后重试");

        const transaction = await tx.inventoryTransaction.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            locationId: balance.locationId,
            productId: balance.productId,
            lotId: balance.lotId,
            workOrderId: id,
            type: movement,
            direction: movement === "issue" ? "outbound" : "inbound",
            quantity,
            unit: balance.product.unit,
            sourceType: "work_order",
            sourceId: id,
            referenceCode: workOrder.code,
            note: input.note?.trim(),
            actor,
            workstationCode,
            deviceId,
            idempotencyKey: normalizedKey,
            occurredAt: new Date(),
          },
          include: inventoryTransactionInclude,
        });
        return this.readMaterialMovementResult(tx, transaction);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.repeatedMaterialMovement(
          this.prisma,
          id,
          movement,
          normalizedKey,
        );
        if (repeated) return repeated;
        throw new ConflictException("Idempotency-Key 已用于其他库存命令");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("库存同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  private async buildWorkOrderMaterials(
    tx: Prisma.TransactionClient | PrismaService,
    id: string,
  ) {
    const workOrder = await tx.workOrder.findFirst({
      where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
      select: {
        id: true,
        code: true,
        productName: true,
        plannedQuantity: true,
        unit: true,
        status: true,
        revision: true,
        workCenter: true,
        recipeSnapshot: true,
      },
    });
    if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
    if (!isExecutableRecipeSnapshot(workOrder.recipeSnapshot)) {
      throw new UnprocessableEntityException("工单冻结配方不完整，不能计算领料需求");
    }
    const requirements = calculateWorkOrderMaterialRequirements(
      workOrder.recipeSnapshot,
      workOrder.plannedQuantity,
    );
    const productIds = [...new Set(requirements.map((requirement) => requirement.productId))];
    const [movements, usages, balances] = await Promise.all([
      tx.inventoryTransaction.findMany({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          workOrderId: id,
          type: { in: ["issue", "return"] },
        },
        include: inventoryTransactionInclude,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 200,
      }),
      tx.workOrderMaterialUsage.findMany({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          workOrderId: id,
        },
        include: workOrderMaterialUsageInclude,
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 200,
      }),
      productIds.length ? tx.stockBalanceProjection.findMany({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          productId: { in: productIds },
        },
        include: stockBalanceInclude,
        orderBy: [{ lot: { expiresAt: "asc" } }, { location: { code: "asc" } }],
        take: 500,
      }) : Promise.resolve([]),
    ]);
    const now = new Date();
    const balanceByKey = new Map(
      balances.map((balance) => [this.balanceKey(balance.locationId, balance.productId, balance.lotId), balance]),
    );

    const presentedRequirements = requirements.map((requirement) => {
      const productMovements = movements.filter((movement) => (
        movement.productId === requirement.productId && movement.unit === requirement.unit
      ));
      const productUsages = usages.filter((usage) => (
        usage.productId === requirement.productId && usage.unit === requirement.unit
      ));
      const issuedQuantity = productMovements
        .filter((movement) => movement.type === "issue")
        .reduce((total, movement) => total.add(movement.quantity), new Prisma.Decimal(0));
      const returnedQuantity = productMovements
        .filter((movement) => movement.type === "return")
        .reduce((total, movement) => total.add(movement.quantity), new Prisma.Decimal(0));
      const netIssuedQuantity = issuedQuantity.sub(returnedQuantity);
      const consumedQuantity = productUsages
        .filter((usage) => usage.disposition === "consumed")
        .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
      const scrappedQuantity = productUsages
        .filter((usage) => usage.disposition === "scrapped")
        .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
      const reconciledQuantity = consumedQuantity.add(scrappedQuantity);
      const unaccountedQuantity = remainingIssuedQuantity(
        netIssuedQuantity,
        consumedQuantity,
        scrappedQuantity,
      );
      const remainingQuantity = Prisma.Decimal.max(
        requirement.plannedQuantity.sub(netIssuedQuantity),
        0,
      );
      const issuedLots = new Map<string, Prisma.Decimal>();
      for (const movement of productMovements) {
        const key = this.balanceKey(movement.locationId, movement.productId, movement.lotId);
        const current = issuedLots.get(key) ?? new Prisma.Decimal(0);
        issuedLots.set(
          key,
          movement.type === "issue" ? current.add(movement.quantity) : current.sub(movement.quantity),
        );
      }
      return {
        product: {
          id: requirement.productId,
          code: requirement.productCode,
          name: requirement.productName,
        },
        plannedQuantity: requirement.plannedQuantity.toFixed(3),
        issuedQuantity: issuedQuantity.toFixed(3),
        returnedQuantity: returnedQuantity.toFixed(3),
        netIssuedQuantity: netIssuedQuantity.toFixed(3),
        consumedQuantity: consumedQuantity.toFixed(3),
        scrappedQuantity: scrappedQuantity.toFixed(3),
        reconciledQuantity: reconciledQuantity.toFixed(3),
        unaccountedQuantity: unaccountedQuantity.toFixed(3),
        remainingQuantity: remainingQuantity.toFixed(3),
        reconciliationReady: remainingQuantity.equals(0) && unaccountedQuantity.equals(0),
        unit: requirement.unit,
        availableLots: balances
          .filter((balance) => (
            balance.productId === requirement.productId
            && balance.product.unit === requirement.unit
            && balance.onHandQuantity.gt(0)
            && balance.lot.qualityStatus === "released"
            && (!balance.lot.expiresAt || balance.lot.expiresAt > now)
          ))
          .map(presentStockBalance),
        issuedLots: [...issuedLots.entries()]
          .filter(([, quantity]) => quantity.gt(0))
          .map(([key, quantity]) => {
            const balance = balanceByKey.get(key);
            if (!balance) return undefined;
            const lotUsages = productUsages.filter((usage) => (
              usage.locationId === balance.locationId && usage.lotId === balance.lotId
            ));
            const consumed = lotUsages
              .filter((usage) => usage.disposition === "consumed")
              .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
            const scrapped = lotUsages
              .filter((usage) => usage.disposition === "scrapped")
              .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0));
            return {
              balance: presentStockBalance(balance),
              netIssuedQuantity: quantity.toFixed(3),
              consumedQuantity: consumed.toFixed(3),
              scrappedQuantity: scrapped.toFixed(3),
              unaccountedQuantity: remainingIssuedQuantity(quantity, consumed, scrapped).toFixed(3),
            };
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item)),
      };
    });

    return {
      workOrder: {
        id: workOrder.id,
        code: workOrder.code,
        productName: workOrder.productName,
        plannedQuantity: workOrder.plannedQuantity.toFixed(3),
        unit: workOrder.unit,
        status: workOrder.status,
        revision: workOrder.revision,
        workCenter: workOrder.workCenter,
      },
      reconciliation: {
        ready: presentedRequirements.every((requirement) => requirement.reconciliationReady),
        pendingRequirementCount: presentedRequirements.filter((requirement) => !requirement.reconciliationReady).length,
      },
      requirements: presentedRequirements,
      movements: movements.map(presentInventoryTransaction),
      usages: usages.map(presentWorkOrderMaterialUsage),
    };
  }

  private normalizeIdempotencyKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    return normalizedKey;
  }

  private async repeatedMaterialMovement(
    tx: Prisma.TransactionClient | PrismaService,
    workOrderId: string,
    movement: WorkOrderMaterialMovement,
    idempotencyKey: string,
  ) {
    const transaction = await tx.inventoryTransaction.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
      include: inventoryTransactionInclude,
    });
    if (!transaction) return undefined;
    if (transaction.workOrderId !== workOrderId || transaction.type !== movement) {
      throw new ConflictException("Idempotency-Key 已用于其他库存命令");
    }
    return this.readMaterialMovementResult(tx, transaction);
  }

  private async readMaterialMovementResult(
    tx: Prisma.TransactionClient | PrismaService,
    transaction: Prisma.InventoryTransactionGetPayload<{ include: typeof inventoryTransactionInclude }>,
  ) {
    if (!transaction.workOrderId) throw new ConflictException("库存流水缺少来源工单");
    const balance = await tx.stockBalanceProjection.findFirstOrThrow({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        locationId: transaction.locationId,
        productId: transaction.productId,
        lotId: transaction.lotId,
      },
      include: stockBalanceInclude,
    });
    return {
      transaction: presentInventoryTransaction(transaction),
      balance: presentStockBalance(balance),
      materials: await this.buildWorkOrderMaterials(tx, transaction.workOrderId),
    };
  }

  private async lockWorkOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "work_orders" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }

  private async lockStockBalance(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "stock_balance_projections" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }

  private balanceKey(locationId: string, productId: string, lotId: string) {
    return `${locationId}:${productId}:${lotId}`;
  }

  private async readOpeningBalanceResult(
    tx: Prisma.TransactionClient | PrismaService,
    transaction: Prisma.InventoryTransactionGetPayload<{ include: typeof inventoryTransactionInclude }>,
  ) {
    const balance = await tx.stockBalanceProjection.findFirstOrThrow({
      where: {
        organizationId: DEFAULT_ORGANIZATION_ID,
        locationId: transaction.locationId,
        productId: transaction.productId,
        lotId: transaction.lotId,
      },
      include: stockBalanceInclude,
    });
    return {
      transaction: presentInventoryTransaction(transaction),
      balance: presentStockBalance(balance),
    };
  }
}
