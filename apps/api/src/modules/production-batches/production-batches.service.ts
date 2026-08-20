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
import {
  isCompleteRecipeSnapshot,
  isExecutableRecipeSnapshot,
} from "../boms/recipe-snapshot.js";
import type {
  CreateProductionBatchDto,
  ProductionBatchCommandDto,
} from "./dto/production-batch.dto.js";
import {
  getBatchCompatibilityIssue,
  getBatchTransitionIssue,
} from "./production-batch-policy.js";
import { presentProductionBatch, productionBatchInclude } from "./production-batches.presenter.js";

const activeBatchStatuses = [
  "draft",
  "confirmed",
  "released",
  "running",
  "paused",
  "awaiting_quality",
  "completed",
  "exception",
] as const;

const incompatibilityMessages = {
  snapshot_incomplete: "存在不完整配方快照，不能建立生产批次",
  factory_mismatch: "只有同一工厂的生产需求可以合并",
  product_mismatch: "一张生产批次只能包含同一商品",
  unit_mismatch: "计量单位不同，不能直接合并数量",
  bom_version_mismatch: "冻结 BOM 版本不同，不能合并到同一批次",
} as const;

@Injectable()
export class ProductionBatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.productionBatch.findMany({
      where: { organizationId: DEFAULT_ORGANIZATION_ID },
      include: productionBatchInclude,
      orderBy: [{ scheduledFor: "asc" }, { code: "desc" }],
      take: 100,
    });
    return { data: rows.map(presentProductionBatch) };
  }

  async create(input: CreateProductionBatchDto, idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    const lineIds = input.allocations.map((allocation) => allocation.productionDemandLineId);
    if (new Set(lineIds).size !== lineIds.length) {
      throw new BadRequestException("同一生产需求行不能重复分配");
    }
    const actor = resolveAuditActor(input.actor);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.productionBatch.findFirst({
          where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey: normalizedKey },
          include: productionBatchInclude,
        });
        if (existing) return presentProductionBatch(existing);

        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM "production_demand_lines" WHERE "id" IN (${Prisma.join(lineIds)}) FOR UPDATE`,
        );
        const lines = await tx.productionDemandLine.findMany({
          where: {
            id: { in: lineIds },
            productionDemand: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              status: { in: ["pending_planning", "partially_planned"] },
            },
          },
          include: {
            productionDemand: { include: { salesOrder: true } },
            allocations: {
              where: { productionBatch: { status: { in: [...activeBatchStatuses] } } },
            },
          },
        });
        if (lines.length !== lineIds.length) {
          throw new NotFoundException("生产需求行不存在、已完成分配或不属于当前组织");
        }
        const lineMap = new Map(lines.map((line) => [line.id, line]));
        const orderedLines = lineIds.map((id) => lineMap.get(id)!);
        const issue = getBatchCompatibilityIssue(orderedLines.map((line) => ({
          factoryCode: line.productionDemand.factoryCode,
          productId: line.productId,
          unit: line.unit,
          selectedBomVersionId: line.selectedBomVersionId,
          snapshotComplete: isCompleteRecipeSnapshot(line.recipeSnapshot),
        })));
        if (issue) throw new UnprocessableEntityException(incompatibilityMessages[issue]);

        const requested = input.allocations.map((allocation) => ({
          ...allocation,
          quantityDecimal: new Prisma.Decimal(allocation.quantity),
        }));
        for (const allocation of requested) {
          if (!allocation.quantityDecimal.gt(0)) throw new BadRequestException("分配数量必须大于 0");
          const line = lineMap.get(allocation.productionDemandLineId)!;
          const allocated = line.allocations.reduce(
            (sum, current) => sum.add(current.allocatedQuantity),
            new Prisma.Decimal(0),
          );
          const remaining = line.requiredQuantity.sub(allocated);
          if (allocation.quantityDecimal.greaterThan(remaining)) {
            throw new ConflictException(`${line.productionDemand.code} · ${line.productName} 的分配数量超过剩余 ${remaining.toFixed(3)} ${line.unit}`);
          }
        }

        const first = orderedLines[0];
        const plannedQuantity = requested.reduce(
          (sum, allocation) => sum.add(allocation.quantityDecimal),
          new Prisma.Decimal(0),
        );
        const code = await this.nextBatchCode(tx);
        const batch = await tx.productionBatch.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            code,
            idempotencyKey: normalizedKey,
            factoryCode: first.productionDemand.factoryCode,
            factoryName: first.productionDemand.factoryName,
            productId: first.productId,
            productCode: first.productCode,
            productName: first.productName,
            plannedQuantity,
            unit: first.unit,
            selectedBomVersionId: first.selectedBomVersionId!,
            bomVersionSnapshot: first.bomVersionSnapshot!,
            recipeSnapshot: first.recipeSnapshot as Prisma.InputJsonValue,
            scheduledFor: new Date(input.scheduledFor),
            status: "draft",
            createdBy: actor,
            allocations: {
              create: requested.map((allocation) => ({
                productionDemandLineId: allocation.productionDemandLineId,
                allocatedQuantity: allocation.quantityDecimal,
              })),
            },
            events: {
              create: {
                organizationId: DEFAULT_ORGANIZATION_ID,
                type: "created",
                actor,
                revision: 1,
                details: { allocationCount: requested.length },
              },
            },
          },
          include: productionBatchInclude,
        });

        const affectedDemandIds = [...new Set(orderedLines.map((line) => line.productionDemandId))];
        for (const demandId of affectedDemandIds) {
          const demand = await tx.productionDemand.findUniqueOrThrow({
            where: { id: demandId },
            include: {
              lines: {
                include: {
                  allocations: {
                    where: { productionBatch: { status: { in: [...activeBatchStatuses] } } },
                  },
                },
              },
            },
          });
          const allocatedByLine = demand.lines.map((line) => line.allocations.reduce(
            (sum, allocation) => sum.add(allocation.allocatedQuantity),
            new Prisma.Decimal(0),
          ));
          const fullyAllocated = demand.lines.every((line, index) => allocatedByLine[index].equals(line.requiredQuantity));
          const partiallyAllocated = allocatedByLine.some((quantity) => quantity.gt(0));
          const status = fullyAllocated ? "planned" : partiallyAllocated ? "partially_planned" : "pending_planning";
          await tx.productionDemand.update({ where: { id: demand.id }, data: { status } });
          await tx.productionDemandEvent.create({
            data: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              productionDemandId: demand.id,
              type: "allocation_changed",
              actor,
              status,
              details: { productionBatchId: batch.id, productionBatchCode: batch.code },
            },
          });
        }

        return presentProductionBatch(batch);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await this.prisma.productionBatch.findFirst({
          where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey: normalizedKey },
          include: productionBatchInclude,
        });
        if (existing) return presentProductionBatch(existing);
      }
      throw error;
    }
  }

  async confirm(id: string, input: ProductionBatchCommandDto, idempotencyKey?: string) {
    const normalizedKey = this.normalizeCommandKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);

    return this.prisma.$transaction(async (tx) => {
      const repeated = await this.repeatedCommand(tx, id, normalizedKey, "confirmed");
      if (repeated) return repeated;

      await this.lockBatch(tx, id);
      const batch = await tx.productionBatch.findFirst({
        where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
        include: productionBatchInclude,
      });
      if (!batch) throw new NotFoundException("生产批次不存在或不属于当前组织");

      const issue = getBatchTransitionIssue(batch.status, batch.revision, input.revision, "confirm");
      if (issue === "invalid_status") throw new ConflictException("只有草稿生产批次可以确认");
      if (issue === "revision_conflict") throw new ConflictException("生产批次已被更新，请刷新后重试");
      if (!batch.plannedQuantity.gt(0) || !isCompleteRecipeSnapshot(batch.recipeSnapshot)) {
        throw new UnprocessableEntityException("生产数量或冻结配方快照不完整，不能确认批次");
      }

      const nextRevision = batch.revision + 1;
      const updated = await tx.productionBatch.updateMany({
        where: {
          id,
          organizationId: DEFAULT_ORGANIZATION_ID,
          status: "draft",
          revision: input.revision,
        },
        data: { status: "confirmed", revision: nextRevision },
      });
      if (updated.count !== 1) throw new ConflictException("生产批次已被更新，请刷新后重试");

      await tx.productionBatchEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          productionBatchId: id,
          type: "confirmed",
          actor,
          revision: nextRevision,
          idempotencyKey: normalizedKey,
          details: { previousStatus: "draft", status: "confirmed" },
        },
      });
      return this.readBatch(tx, id);
    });
  }

  async release(id: string, input: ProductionBatchCommandDto, idempotencyKey?: string) {
    const normalizedKey = this.normalizeCommandKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);

    return this.prisma.$transaction(async (tx) => {
      const repeated = await this.repeatedCommand(tx, id, normalizedKey, "released");
      if (repeated) return repeated;

      await this.lockBatch(tx, id);
      const batch = await tx.productionBatch.findFirst({
        where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
        include: productionBatchInclude,
      });
      if (!batch) throw new NotFoundException("生产批次不存在或不属于当前组织");

      const issue = getBatchTransitionIssue(batch.status, batch.revision, input.revision, "release");
      if (issue === "invalid_status") throw new ConflictException("只有已确认生产批次可以释放工单");
      if (issue === "revision_conflict") throw new ConflictException("生产批次已被更新，请刷新后重试");
      if (!isExecutableRecipeSnapshot(batch.recipeSnapshot)) {
        throw new UnprocessableEntityException("冻结配方缺少可执行工艺，不能释放工单");
      }
      const operations = [...batch.recipeSnapshot.operations].sort((left, right) => left.sequence - right.sequence);
      const workCenter = operations.find((operation) => operation.workCenter?.trim())?.workCenter?.trim();
      if (!workCenter) throw new UnprocessableEntityException("冻结工艺缺少工作中心，不能释放工单");

      const workOrderCode = await this.nextDocumentCode(tx, "WO");
      const workOrder = await tx.workOrder.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          productionBatchId: batch.id,
          code: workOrderCode,
          factoryCode: batch.factoryCode,
          factoryName: batch.factoryName,
          productId: batch.productId,
          productCode: batch.productCode,
          productName: batch.productName,
          plannedQuantity: batch.plannedQuantity,
          unit: batch.unit,
          selectedBomVersionId: batch.selectedBomVersionId,
          bomVersionSnapshot: batch.bomVersionSnapshot,
          recipeSnapshot: batch.recipeSnapshot as Prisma.InputJsonValue,
          scheduledStartAt: batch.scheduledFor,
          workCenter,
          status: "pending",
          createdBy: actor,
          events: {
            create: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              type: "created",
              actor,
              status: "pending",
              revision: 1,
              details: { productionBatchId: batch.id, productionBatchCode: batch.code },
            },
          },
        },
      });

      const nextRevision = batch.revision + 1;
      const updated = await tx.productionBatch.updateMany({
        where: {
          id,
          organizationId: DEFAULT_ORGANIZATION_ID,
          status: "confirmed",
          revision: input.revision,
        },
        data: { status: "released", revision: nextRevision },
      });
      if (updated.count !== 1) throw new ConflictException("生产批次已被更新，请刷新后重试");

      await tx.productionBatchEvent.create({
        data: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          productionBatchId: id,
          type: "released",
          actor,
          revision: nextRevision,
          idempotencyKey: normalizedKey,
          details: {
            previousStatus: "confirmed",
            status: "released",
            workOrderId: workOrder.id,
            workOrderCode: workOrder.code,
            operationCount: operations.length,
          },
        },
      });
      return this.readBatch(tx, id);
    });
  }

  private normalizeCommandKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    return normalizedKey;
  }

  private async repeatedCommand(
    tx: Prisma.TransactionClient,
    batchId: string,
    idempotencyKey: string,
    type: "confirmed" | "released",
  ) {
    const event = await tx.productionBatchEvent.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
    });
    if (!event) return undefined;
    if (event.productionBatchId !== batchId || event.type !== type) {
      throw new ConflictException("Idempotency-Key 已用于其他生产批次命令");
    }
    return this.readBatch(tx, batchId);
  }

  private async lockBatch(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "production_batches" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }

  private async readBatch(tx: Prisma.TransactionClient, id: string) {
    const batch = await tx.productionBatch.findFirst({
      where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
      include: productionBatchInclude,
    });
    if (!batch) throw new NotFoundException("生产批次不存在或不属于当前组织");
    return presentProductionBatch(batch);
  }

  private async nextBatchCode(tx: Prisma.TransactionClient) {
    return this.nextDocumentCode(tx, "PB");
  }

  private async nextDocumentCode(tx: Prisma.TransactionClient, kind: "PB" | "WO") {
    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).replaceAll("-", "");
    const sequence = await tx.documentNumber.upsert({
      where: { organizationId_kind_dateKey: { organizationId: DEFAULT_ORGANIZATION_ID, kind, dateKey } },
      create: { organizationId: DEFAULT_ORGANIZATION_ID, kind, dateKey, currentValue: 1 },
      update: { currentValue: { increment: 1 } },
    });
    return `${kind}${dateKey}${String(sequence.currentValue).padStart(4, "0")}`;
  }
}
