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
import { InventoryService } from "../inventory/inventory.service.js";
import { stockBalanceInclude } from "../inventory/inventory.presenter.js";
import { calculateWorkOrderMaterialRequirements } from "../inventory/work-order-material-policy.js";
import type { RecordWorkOrderMaterialUsageDto } from "./dto/work-order-material-usage.dto.js";
import {
  isMaterialUsageAllowed,
  remainingIssuedQuantity,
} from "./work-order-material-usage-policy.js";
import {
  presentWorkOrderMaterialUsage,
  workOrderMaterialUsageInclude,
} from "./work-order-material-usages.presenter.js";

type DatabaseClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class WorkOrderMaterialUsagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
  ) {}

  async record(
    workOrderId: string,
    input: RecordWorkOrderMaterialUsageDto,
    idempotencyKey?: string,
  ) {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);
    const quantity = new Prisma.Decimal(input.quantity);
    const unit = input.unit.trim();
    const workstationCode = input.workstationCode.trim();
    const deviceId = input.deviceId.trim();
    const reason = input.reason?.trim();
    if (!quantity.gt(0)) throw new BadRequestException("核销数量必须大于 0");
    if (!unit || !workstationCode || !deviceId) {
      throw new BadRequestException("单位、工位和设备标识不能为空");
    }
    if (input.disposition === "scrapped" && !reason) {
      throw new BadRequestException("登记报损时必须填写原因");
    }

    try {
      const usage = await this.prisma.$transaction(async (tx) => {
        const repeatedBeforeLock = await this.repeatedUsage(
          tx,
          workOrderId,
          input.disposition,
          normalizedKey,
        );
        if (repeatedBeforeLock) return repeatedBeforeLock;

        await this.lockWorkOrder(tx, workOrderId);
        const repeatedAfterLock = await this.repeatedUsage(
          tx,
          workOrderId,
          input.disposition,
          normalizedKey,
        );
        if (repeatedAfterLock) return repeatedAfterLock;

        const workOrder = await tx.workOrder.findFirst({
          where: { id: workOrderId, organizationId: DEFAULT_ORGANIZATION_ID },
          select: {
            id: true,
            code: true,
            status: true,
            recipeSnapshot: true,
            plannedQuantity: true,
          },
        });
        if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
        if (!isMaterialUsageAllowed(workOrder.status)) {
          throw new ConflictException("只有生产中的工单可以登记实际耗用或报损");
        }
        if (!isExecutableRecipeSnapshot(workOrder.recipeSnapshot)) {
          throw new UnprocessableEntityException("工单冻结配方不完整，不能登记物料核销");
        }

        const balance = await tx.stockBalanceProjection.findFirst({
          where: { id: input.stockBalanceId, organizationId: DEFAULT_ORGANIZATION_ID },
          include: stockBalanceInclude,
        });
        if (!balance) throw new NotFoundException("库存批次余额不存在或不属于当前组织");

        const requirement = calculateWorkOrderMaterialRequirements(
          workOrder.recipeSnapshot,
          workOrder.plannedQuantity,
        ).find((item) => (
          item.productId === balance.productId
          && item.unit === unit
          && item.unit === balance.product.unit
        ));
        if (!requirement) {
          throw new UnprocessableEntityException("所选批次不是工单冻结配方中的同单位叶子原料");
        }

        const [movements, previousUsages] = await Promise.all([
          tx.inventoryTransaction.findMany({
            where: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              workOrderId,
              locationId: balance.locationId,
              productId: balance.productId,
              lotId: balance.lotId,
              unit,
              type: { in: ["issue", "return"] },
            },
            select: { type: true, quantity: true },
          }),
          tx.workOrderMaterialUsage.findMany({
            where: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              workOrderId,
              locationId: balance.locationId,
              productId: balance.productId,
              lotId: balance.lotId,
              unit,
            },
            select: { disposition: true, quantity: true },
          }),
        ]);
        const netIssued = movements.reduce(
          (total, movement) => movement.type === "issue"
            ? total.add(movement.quantity)
            : total.sub(movement.quantity),
          new Prisma.Decimal(0),
        );
        const consumed = previousUsages
          .filter((item) => item.disposition === "consumed")
          .reduce((total, item) => total.add(item.quantity), new Prisma.Decimal(0));
        const scrapped = previousUsages
          .filter((item) => item.disposition === "scrapped")
          .reduce((total, item) => total.add(item.quantity), new Prisma.Decimal(0));
        const available = remainingIssuedQuantity(netIssued, consumed, scrapped);
        if (quantity.greaterThan(available)) {
          throw new ConflictException(`超过该批次待核销量 ${available.toFixed(3)} ${unit}`);
        }

        const now = new Date();
        return tx.workOrderMaterialUsage.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId,
            locationId: balance.locationId,
            productId: balance.productId,
            lotId: balance.lotId,
            disposition: input.disposition,
            quantity,
            unit,
            reason,
            actor,
            workstationCode,
            deviceId,
            idempotencyKey: normalizedKey,
            occurredAt: now,
          },
          include: workOrderMaterialUsageInclude,
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      return {
        usage: presentWorkOrderMaterialUsage(usage),
        materials: await this.inventory.getWorkOrderMaterials(workOrderId),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.repeatedUsage(
          this.prisma,
          workOrderId,
          input.disposition,
          normalizedKey,
        );
        if (repeated) {
          return {
            usage: presentWorkOrderMaterialUsage(repeated),
            materials: await this.inventory.getWorkOrderMaterials(workOrderId),
          };
        }
        throw new ConflictException("Idempotency-Key 已用于其他物料核销命令");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("工单物料同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  private normalizeIdempotencyKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    return normalizedKey;
  }

  private async repeatedUsage(
    tx: DatabaseClient,
    workOrderId: string,
    disposition: "consumed" | "scrapped",
    idempotencyKey: string,
  ) {
    const usage = await tx.workOrderMaterialUsage.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
      include: workOrderMaterialUsageInclude,
    });
    if (!usage) return undefined;
    if (usage.workOrderId !== workOrderId || usage.disposition !== disposition) {
      throw new ConflictException("Idempotency-Key 已用于其他物料核销命令");
    }
    return usage;
  }

  private async lockWorkOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "work_orders" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }
}
