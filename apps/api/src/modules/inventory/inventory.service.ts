import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";
import { DEFAULT_ORGANIZATION_ID } from "../../common/organization.js";
import { resolveAuditActor } from "../../common/runtime-mode.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { CreateOpeningBalanceDto, InventoryQueryDto } from "./dto/inventory.dto.js";
import {
  inventoryTransactionInclude,
  presentInventoryLocation,
  presentInventoryTransaction,
  presentStockBalance,
  stockBalanceInclude,
} from "./inventory.presenter.js";

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
    if (!quantity.isPositive()) throw new BadRequestException("期初数量必须大于 0");

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
