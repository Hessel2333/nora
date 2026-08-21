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
import { calculateWorkOrderMaterialRequirements } from "../inventory/work-order-material-policy.js";
import { getMaterialReconciliationIssue } from "../work-order-material-usages/work-order-material-usage-policy.js";
import type {
  InspectWorkOrderOutputDto,
  ReportWorkOrderOutputDto,
} from "./dto/work-order-output.dto.js";
import {
  frozenOutputTemperatureRange,
  getQualityInspectionIssue,
} from "./work-order-output-policy.js";
import {
  presentWorkOrderOutput,
  workOrderOutputInclude,
} from "./work-order-outputs.presenter.js";

type DatabaseClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class WorkOrderOutputsService {
  constructor(private readonly prisma: PrismaService) {}

  list(workOrderId: string) {
    return this.readView(this.prisma, workOrderId);
  }

  async report(workOrderId: string, input: ReportWorkOrderOutputDto, idempotencyKey?: string) {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);
    const workstationCode = input.workstationCode.trim();
    const deviceId = input.deviceId.trim();
    const lotCode = input.lotCode.trim();
    const unit = input.unit.trim();
    const varianceReason = input.varianceReason?.trim();
    const quantity = this.positiveDecimal(input.quantity, "实际产出数量");
    const expiresAt = new Date(input.expiresAt);
    if (!workstationCode || !deviceId || !lotCode || !unit) {
      throw new BadRequestException("工位、设备、批次号和单位不能为空");
    }
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new BadRequestException("成品有效期必须晚于当前服务端时间");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const repeated = await this.repeatedReport(tx, workOrderId, normalizedKey);
        if (repeated) return repeated;

        await this.lockWorkOrder(tx, workOrderId);
        const workOrder = await tx.workOrder.findFirst({
          where: { id: workOrderId, organizationId: DEFAULT_ORGANIZATION_ID },
          include: {
            product: { select: { unit: true } },
            productionBatch: { select: { status: true, revision: true } },
          },
        });
        if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
        if (workOrder.status !== "running" || workOrder.productionBatch.status !== "running") {
          throw new ConflictException("只有生产中且批次状态一致的工单可以申报产出");
        }
        if (workOrder.revision !== input.revision) {
          throw new ConflictException("生产工单已被更新，请刷新后重试");
        }
        if (unit !== workOrder.unit || unit !== workOrder.product.unit) {
          throw new UnprocessableEntityException(`产出必须使用工单与商品基础单位 ${workOrder.unit}`);
        }
        if (!quantity.equals(workOrder.plannedQuantity) && !varianceReason) {
          throw new BadRequestException("实际产出与计划数量不一致时必须填写差异原因");
        }
        if (!isExecutableRecipeSnapshot(workOrder.recipeSnapshot)) {
          throw new UnprocessableEntityException("工单冻结配方不完整，不能申报产出");
        }
        await this.assertMaterialsReconciled(
          tx,
          workOrderId,
          workOrder.recipeSnapshot,
          workOrder.plannedQuantity,
        );

        const existing = await tx.workOrderOutput.findFirst({
          where: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId,
            status: { in: ["pending_quality", "released"] },
          },
          select: { status: true },
        });
        if (existing?.status === "pending_quality") {
          throw new ConflictException("该工单已有待检产出，请先完成质量判定");
        }
        if (existing?.status === "released") {
          throw new ConflictException("该工单已有放行产出，不能重复申报");
        }

        const now = new Date();
        const range = frozenOutputTemperatureRange(workOrder.recipeSnapshot);
        const lot = await tx.inventoryLot.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            productId: workOrder.productId,
            code: lotCode,
            qualityStatus: "pending",
            receivedAt: now,
            productionAt: now,
            expiresAt,
            createdBy: actor,
          },
        });
        await tx.workOrderOutput.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId,
            productionBatchId: workOrder.productionBatchId,
            productId: workOrder.productId,
            lotId: lot.id,
            quantity,
            unit,
            varianceReason,
            temperatureMin: range.temperatureMin,
            temperatureMax: range.temperatureMax,
            actor,
            workstationCode,
            deviceId,
            idempotencyKey: normalizedKey,
            reportedAt: now,
          },
        });

        const nextWorkOrderRevision = workOrder.revision + 1;
        const updatedWorkOrder = await tx.workOrder.updateMany({
          where: {
            id: workOrderId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: "running",
            revision: input.revision,
          },
          data: { status: "awaiting_quality", revision: nextWorkOrderRevision },
        });
        if (updatedWorkOrder.count !== 1) {
          throw new ConflictException("生产工单已被更新，请刷新后重试");
        }

        const nextBatchRevision = workOrder.productionBatch.revision + 1;
        const updatedBatch = await tx.productionBatch.updateMany({
          where: {
            id: workOrder.productionBatchId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: "running",
            revision: workOrder.productionBatch.revision,
          },
          data: { status: "awaiting_quality", revision: nextBatchRevision },
        });
        if (updatedBatch.count !== 1) {
          throw new ConflictException("生产批次已被更新，请刷新后重试");
        }

        const event = await tx.workOrderEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId,
            type: "output_reported",
            actor,
            fromStatus: "running",
            status: "awaiting_quality",
            revision: nextWorkOrderRevision,
            workstationCode,
            deviceId,
            reason: varianceReason,
            idempotencyKey: normalizedKey,
            details: {
              lotCode,
              quantity: quantity.toFixed(3),
              unit,
              expiresAt: expiresAt.toISOString(),
              temperatureMin: range.temperatureMin,
              temperatureMax: range.temperatureMax,
            },
          },
        });
        await tx.productionBatchEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            productionBatchId: workOrder.productionBatchId,
            type: "status_changed",
            actor,
            revision: nextBatchRevision,
            details: {
              source: "work_order_output",
              workOrderId,
              workOrderEventId: event.id,
              previousStatus: "running",
              status: "awaiting_quality",
              lotCode,
            },
          },
        });
        return this.readView(tx, workOrderId);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.repeatedReport(this.prisma, workOrderId, normalizedKey);
        if (repeated) return repeated;
        throw new ConflictException("成品批次号已存在，或工单已有待检/放行产出");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("工单产出同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  async inspect(
    workOrderId: string,
    outputId: string,
    input: InspectWorkOrderOutputDto,
    idempotencyKey?: string,
  ) {
    const normalizedKey = this.normalizeIdempotencyKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);
    const workstationCode = input.workstationCode.trim();
    const deviceId = input.deviceId.trim();
    const standardVersion = input.standardVersion.trim();
    const note = input.note?.trim();
    const measuredTemperature = this.decimal(input.measuredTemperature, "实测温度");
    if (!workstationCode || !deviceId || !standardVersion) {
      throw new BadRequestException("工位、设备和质量标准版本不能为空");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const repeated = await this.repeatedInspection(
          tx,
          workOrderId,
          outputId,
          input.decision,
          normalizedKey,
        );
        if (repeated) return repeated;

        await this.lockWorkOrder(tx, workOrderId);
        await this.lockOutput(tx, outputId);
        const output = await tx.workOrderOutput.findFirst({
          where: {
            id: outputId,
            workOrderId,
            organizationId: DEFAULT_ORGANIZATION_ID,
          },
          include: {
            lot: true,
            workOrder: {
              include: { productionBatch: { select: { status: true, revision: true } } },
            },
          },
        });
        if (!output) throw new NotFoundException("待检产出不存在或不属于当前组织工单");
        if (
          output.status !== "pending_quality"
          || output.workOrder.status !== "awaiting_quality"
          || output.workOrder.productionBatch.status !== "awaiting_quality"
        ) {
          throw new ConflictException("当前产出或工单状态不允许质量判定");
        }
        if (output.workOrder.revision !== input.workOrderRevision || output.revision !== input.outputRevision) {
          throw new ConflictException("工单或产出已被更新，请刷新后重试");
        }

        const inspectionIssue = getQualityInspectionIssue({
          decision: input.decision,
          measuredTemperature: measuredTemperature.toNumber(),
          temperatureMin: output.temperatureMin?.toNumber() ?? null,
          temperatureMax: output.temperatureMax?.toNumber() ?? null,
          appearancePassed: input.appearancePassed,
          packageSealPassed: input.packageSealPassed,
          labelPassed: input.labelPassed,
          note,
        });
        if (inspectionIssue === "release_check_failed") {
          throw new UnprocessableEntityException("外观、封口和标签全部通过后才能质量放行");
        }
        if (inspectionIssue === "temperature_out_of_range") {
          throw new UnprocessableEntityException("实测温度超出工单冻结工艺范围，不能质量放行");
        }
        if (inspectionIssue === "rejection_note_required") {
          throw new BadRequestException("不合格判定必须填写原因和处置说明");
        }

        const location = input.decision === "released"
          ? await this.finishedGoodsLocation(tx, input.locationId, output.workOrder.factoryCode)
          : undefined;
        const now = new Date();
        const inspection = await tx.qualityInspection.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderOutputId: outputId,
            decision: input.decision,
            standardVersion,
            sampleQuantity: input.sampleQuantity,
            measuredTemperature,
            appearancePassed: input.appearancePassed,
            packageSealPassed: input.packageSealPassed,
            labelPassed: input.labelPassed,
            note,
            actor,
            workstationCode,
            deviceId,
            idempotencyKey: normalizedKey,
          },
        });

        const nextOutputRevision = output.revision + 1;
        const updatedOutput = await tx.workOrderOutput.updateMany({
          where: {
            id: outputId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: "pending_quality",
            revision: input.outputRevision,
          },
          data: { status: input.decision, revision: nextOutputRevision },
        });
        if (updatedOutput.count !== 1) {
          throw new ConflictException("待检产出已被更新，请刷新后重试");
        }
        const updatedLot = await tx.inventoryLot.updateMany({
          where: {
            id: output.lotId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            qualityStatus: "pending",
          },
          data: { qualityStatus: input.decision },
        });
        if (updatedLot.count !== 1) {
          throw new ConflictException("成品批次质量状态已被更新，请刷新后重试");
        }

        if (input.decision === "released" && location) {
          await tx.inventoryTransaction.create({
            data: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              locationId: location.id,
              productId: output.productId,
              lotId: output.lotId,
              workOrderId,
              workOrderOutputId: outputId,
              type: "produce",
              direction: "inbound",
              quantity: output.quantity,
              unit: output.unit,
              sourceType: "production_output",
              sourceId: outputId,
              referenceCode: output.workOrder.code,
              note: note || `质量放行 · ${standardVersion}`,
              actor,
              workstationCode,
              deviceId,
              idempotencyKey: normalizedKey,
              occurredAt: now,
            },
          });
          await tx.stockBalanceProjection.create({
            data: {
              organizationId: DEFAULT_ORGANIZATION_ID,
              locationId: location.id,
              productId: output.productId,
              lotId: output.lotId,
              onHandQuantity: output.quantity,
              revision: 1,
            },
          });
        }

        const nextStatus = input.decision === "released" ? "completed" as const : "exception" as const;
        const nextWorkOrderRevision = output.workOrder.revision + 1;
        const updatedWorkOrder = await tx.workOrder.updateMany({
          where: {
            id: workOrderId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: "awaiting_quality",
            revision: input.workOrderRevision,
          },
          data: { status: nextStatus, revision: nextWorkOrderRevision },
        });
        if (updatedWorkOrder.count !== 1) {
          throw new ConflictException("生产工单已被更新，请刷新后重试");
        }
        const nextBatchRevision = output.workOrder.productionBatch.revision + 1;
        const updatedBatch = await tx.productionBatch.updateMany({
          where: {
            id: output.productionBatchId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: "awaiting_quality",
            revision: output.workOrder.productionBatch.revision,
          },
          data: { status: nextStatus, revision: nextBatchRevision },
        });
        if (updatedBatch.count !== 1) {
          throw new ConflictException("生产批次已被更新，请刷新后重试");
        }

        const event = await tx.workOrderEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId,
            type: input.decision === "released" ? "completed" : "quality_rejected",
            actor,
            fromStatus: "awaiting_quality",
            status: nextStatus,
            revision: nextWorkOrderRevision,
            workstationCode,
            deviceId,
            reason: note,
            idempotencyKey: normalizedKey,
            details: {
              outputId,
              inspectionId: inspection.id,
              decision: input.decision,
              standardVersion,
              measuredTemperature: measuredTemperature.toFixed(2),
              lotCode: output.lot.code,
              inventoryLocationId: location?.id,
            },
          },
        });
        await tx.productionBatchEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            productionBatchId: output.productionBatchId,
            type: "status_changed",
            actor,
            revision: nextBatchRevision,
            details: {
              source: "quality_inspection",
              workOrderId,
              workOrderEventId: event.id,
              outputId,
              inspectionId: inspection.id,
              previousStatus: "awaiting_quality",
              status: nextStatus,
            },
          },
        });
        return this.readView(tx, workOrderId);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.repeatedInspection(
          this.prisma,
          workOrderId,
          outputId,
          input.decision,
          normalizedKey,
        );
        if (repeated) return repeated;
        throw new ConflictException("Idempotency-Key 已用于其他质量或库存命令");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("质量判定同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  private async readView(tx: DatabaseClient, workOrderId: string) {
    const [workOrder, outputs, locations] = await Promise.all([
      tx.workOrder.findFirst({
        where: { id: workOrderId, organizationId: DEFAULT_ORGANIZATION_ID },
        select: {
          id: true,
          code: true,
          factoryCode: true,
          productName: true,
          plannedQuantity: true,
          unit: true,
          workCenter: true,
          status: true,
          revision: true,
        },
      }),
      tx.workOrderOutput.findMany({
        where: { organizationId: DEFAULT_ORGANIZATION_ID, workOrderId },
        include: workOrderOutputInclude,
        orderBy: [{ reportedAt: "desc" }, { createdAt: "desc" }],
        take: 20,
      }),
      tx.inventoryLocation.findMany({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          type: "finished_goods",
          active: true,
        },
        select: { id: true, factoryCode: true, code: true, name: true },
        orderBy: [{ factoryCode: "asc" }, { code: "asc" }],
      }),
    ]);
    if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
    return {
      workOrder: {
        ...workOrder,
        plannedQuantity: workOrder.plannedQuantity.toFixed(3),
      },
      outputs: outputs.map(presentWorkOrderOutput),
      finishedGoodsLocations: locations.filter((location) => location.factoryCode === workOrder.factoryCode),
    };
  }

  private async repeatedReport(tx: DatabaseClient, workOrderId: string, idempotencyKey: string) {
    const output = await tx.workOrderOutput.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
      select: { workOrderId: true },
    });
    if (!output) return undefined;
    if (output.workOrderId !== workOrderId) {
      throw new ConflictException("Idempotency-Key 已用于其他工单报产命令");
    }
    return this.readView(tx, workOrderId);
  }

  private async repeatedInspection(
    tx: DatabaseClient,
    workOrderId: string,
    outputId: string,
    decision: "released" | "rejected",
    idempotencyKey: string,
  ) {
    const inspection = await tx.qualityInspection.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
      include: { workOrderOutput: { select: { id: true, workOrderId: true } } },
    });
    if (!inspection) return undefined;
    if (
      inspection.workOrderOutput.id !== outputId
      || inspection.workOrderOutput.workOrderId !== workOrderId
      || inspection.decision !== decision
    ) {
      throw new ConflictException("Idempotency-Key 已用于其他质量判定命令");
    }
    return this.readView(tx, workOrderId);
  }

  private async assertMaterialsReconciled(
    tx: Prisma.TransactionClient,
    workOrderId: string,
    recipeSnapshot: Parameters<typeof calculateWorkOrderMaterialRequirements>[0],
    plannedQuantity: Prisma.Decimal,
  ) {
    const requirements = calculateWorkOrderMaterialRequirements(recipeSnapshot, plannedQuantity);
    const [movements, usages] = await Promise.all([
      tx.inventoryTransaction.findMany({
        where: {
          organizationId: DEFAULT_ORGANIZATION_ID,
          workOrderId,
          type: { in: ["issue", "return"] },
        },
        select: { productId: true, unit: true, type: true, quantity: true },
      }),
      tx.workOrderMaterialUsage.findMany({
        where: { organizationId: DEFAULT_ORGANIZATION_ID, workOrderId },
        select: { productId: true, unit: true, disposition: true, quantity: true },
      }),
    ]);
    const rows = requirements.map((requirement) => {
      const matchingMovements = movements.filter((movement) => (
        movement.productId === requirement.productId && movement.unit === requirement.unit
      ));
      const matchingUsages = usages.filter((usage) => (
        usage.productId === requirement.productId && usage.unit === requirement.unit
      ));
      return {
        planned: requirement.plannedQuantity,
        netIssued: matchingMovements.reduce(
          (total, movement) => movement.type === "issue"
            ? total.add(movement.quantity)
            : total.sub(movement.quantity),
          new Prisma.Decimal(0),
        ),
        consumed: matchingUsages
          .filter((usage) => usage.disposition === "consumed")
          .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0)),
        scrapped: matchingUsages
          .filter((usage) => usage.disposition === "scrapped")
          .reduce((total, usage) => total.add(usage.quantity), new Prisma.Decimal(0)),
      };
    });
    const issue = getMaterialReconciliationIssue(rows);
    if (issue === "not_fully_issued") {
      throw new ConflictException("工单物料尚未按冻结配方领齐，请完成领料后再申报产出");
    }
    if (issue === "unreconciled") {
      throw new ConflictException("已领原料仍有待核销数量，请登记实际耗用、报损或退料后再申报产出");
    }
  }

  private async finishedGoodsLocation(
    tx: DatabaseClient,
    locationId: string | undefined,
    factoryCode: string,
  ) {
    if (!locationId) throw new BadRequestException("质量放行必须选择成品入库库位");
    const location = await tx.inventoryLocation.findFirst({
      where: {
        id: locationId,
        organizationId: DEFAULT_ORGANIZATION_ID,
        factoryCode,
        type: "finished_goods",
        active: true,
      },
      select: { id: true, code: true, name: true },
    });
    if (!location) throw new NotFoundException("成品库位不存在、不属于当前组织工厂或已停用");
    return location;
  }

  private positiveDecimal(value: string, label: string) {
    const decimal = this.decimal(value, label);
    if (decimal.lessThanOrEqualTo(0)) throw new BadRequestException(`${label}必须大于 0`);
    if (decimal.greaterThan("99999999999.999")) throw new BadRequestException(`${label}超出系统可记录范围`);
    return decimal;
  }

  private decimal(value: string, label: string) {
    let decimal: Prisma.Decimal;
    try {
      decimal = new Prisma.Decimal(value);
    } catch {
      throw new BadRequestException(`${label}格式无效`);
    }
    if (label === "实测温度" && (decimal.lessThan(-100) || decimal.greaterThan(100))) {
      throw new BadRequestException("实测温度必须在 -100 至 100 ℃ 之间");
    }
    return decimal;
  }

  private normalizeIdempotencyKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    return normalizedKey;
  }

  private async lockWorkOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "work_orders" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }

  private async lockOutput(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "work_order_outputs" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }
}
