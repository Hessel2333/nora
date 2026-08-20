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
import type {
  RecoverWorkOrderDto,
  WorkOrderCommandDto,
  WorkOrderReasonCommandDto,
} from "./dto/work-order.dto.js";
import {
  batchStatusForWorkOrder,
  getWorkOrderTransition,
  type ExecutableWorkOrderStatus,
  type WorkOrderCommand,
} from "./work-order-policy.js";
import { presentWorkOrder, workOrderInclude } from "./work-orders.presenter.js";

const eventTypeByCommand = {
  start: "started",
  pause: "paused",
  resume: "resumed",
  report_exception: "exception_reported",
  recover_pending: "recovered",
  recover_running: "recovered",
} as const;

type CommandInput = WorkOrderCommandDto | WorkOrderReasonCommandDto | RecoverWorkOrderDto;

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

  start(id: string, input: WorkOrderCommandDto, idempotencyKey?: string) {
    return this.transition(id, "start", input, idempotencyKey);
  }

  pause(id: string, input: WorkOrderReasonCommandDto, idempotencyKey?: string) {
    return this.transition(id, "pause", input, idempotencyKey);
  }

  resume(id: string, input: WorkOrderCommandDto, idempotencyKey?: string) {
    return this.transition(id, "resume", input, idempotencyKey);
  }

  reportException(id: string, input: WorkOrderReasonCommandDto, idempotencyKey?: string) {
    return this.transition(id, "report_exception", input, idempotencyKey);
  }

  recover(id: string, input: RecoverWorkOrderDto, idempotencyKey?: string) {
    const command = input.targetStatus === "pending" ? "recover_pending" : "recover_running";
    return this.transition(id, command, input, idempotencyKey);
  }

  private async transition(
    id: string,
    command: WorkOrderCommand,
    input: CommandInput,
    idempotencyKey?: string,
  ) {
    const normalizedKey = this.normalizeCommandKey(idempotencyKey);
    const actor = resolveAuditActor(input.actor);
    const workstationCode = input.workstationCode.trim();
    const deviceId = input.deviceId.trim();
    const reason = "reason" in input ? input.reason.trim() : undefined;
    if (!workstationCode || !deviceId) {
      throw new BadRequestException("工位和设备标识不能为空");
    }
    if (["pause", "report_exception", "recover_pending", "recover_running"].includes(command) && !reason) {
      throw new BadRequestException("暂停、异常和恢复命令必须填写原因或处置说明");
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const repeated = await this.repeatedCommand(tx, id, normalizedKey, command);
        if (repeated) return repeated;

        await this.lockWorkOrder(tx, id);
        const workOrder = await tx.workOrder.findFirst({
          where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
          include: workOrderInclude,
        });
        if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");

        const transition = getWorkOrderTransition(workOrder.status, workOrder.revision, input.revision, command);
        if ("issue" in transition) {
          if (transition.issue === "revision_conflict") {
            throw new ConflictException("生产工单已被更新，请刷新后重试");
          }
          throw new ConflictException("当前工单状态不允许执行此操作，请刷新后确认");
        }

        const previousStatus = workOrder.status as ExecutableWorkOrderStatus;
        const nextStatus = transition.status;
        const previousBatchStatus = batchStatusForWorkOrder(previousStatus);
        const nextBatchStatus = batchStatusForWorkOrder(nextStatus);
        if (workOrder.productionBatch.status !== previousBatchStatus) {
          throw new ConflictException("生产批次与工单状态不一致，请联系生产主管处理");
        }

        const nextRevision = workOrder.revision + 1;
        const updatedWorkOrder = await tx.workOrder.updateMany({
          where: {
            id,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: previousStatus,
            revision: input.revision,
          },
          data: { status: nextStatus, revision: nextRevision },
        });
        if (updatedWorkOrder.count !== 1) {
          throw new ConflictException("生产工单已被更新，请刷新后重试");
        }

        const nextBatchRevision = workOrder.productionBatch.revision + 1;
        const updatedBatch = await tx.productionBatch.updateMany({
          where: {
            id: workOrder.productionBatchId,
            organizationId: DEFAULT_ORGANIZATION_ID,
            status: previousBatchStatus,
            revision: workOrder.productionBatch.revision,
          },
          data: { status: nextBatchStatus, revision: nextBatchRevision },
        });
        if (updatedBatch.count !== 1) {
          throw new ConflictException("生产批次已被更新，请刷新后重试");
        }

        const event = await tx.workOrderEvent.create({
          data: {
            organizationId: DEFAULT_ORGANIZATION_ID,
            workOrderId: id,
            type: eventTypeByCommand[command],
            actor,
            fromStatus: previousStatus,
            status: nextStatus,
            revision: nextRevision,
            workstationCode,
            deviceId,
            reason,
            idempotencyKey: normalizedKey,
            details: { command },
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
              source: "work_order",
              workOrderId: id,
              workOrderCode: workOrder.code,
              workOrderEventId: event.id,
              previousStatus: previousBatchStatus,
              status: nextBatchStatus,
              workstationCode,
              deviceId,
              reason,
            },
          },
        });

        return this.readWorkOrder(tx, id);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const repeated = await this.repeatedCommand(this.prisma, id, normalizedKey, command);
        if (repeated) return repeated;
        throw new ConflictException("Idempotency-Key 已用于其他生产工单命令");
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictException("生产工单同时被更新，请保留当前幂等键后重试");
      }
      throw error;
    }
  }

  private normalizeCommandKey(idempotencyKey?: string) {
    const normalizedKey = idempotencyKey?.trim();
    if (!normalizedKey || normalizedKey.length > 80) {
      throw new BadRequestException("Idempotency-Key 必填且不能超过 80 个字符");
    }
    return normalizedKey;
  }

  private async repeatedCommand(
    tx: Prisma.TransactionClient | PrismaService,
    workOrderId: string,
    idempotencyKey: string,
    command: WorkOrderCommand,
  ) {
    const event = await tx.workOrderEvent.findFirst({
      where: { organizationId: DEFAULT_ORGANIZATION_ID, idempotencyKey },
    });
    if (!event) return undefined;
    const targetStatus = command === "recover_pending" ? "pending"
      : command === "recover_running" ? "running"
        : undefined;
    if (
      event.workOrderId !== workOrderId
      || event.type !== eventTypeByCommand[command]
      || (targetStatus && event.status !== targetStatus)
    ) {
      throw new ConflictException("Idempotency-Key 已用于其他生产工单命令");
    }
    return this.readWorkOrder(tx, workOrderId);
  }

  private async lockWorkOrder(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "work_orders" WHERE "id" = CAST(${id} AS uuid) AND "organization_id" = CAST(${DEFAULT_ORGANIZATION_ID} AS uuid) FOR UPDATE`,
    );
  }

  private async readWorkOrder(tx: Prisma.TransactionClient | PrismaService, id: string) {
    const workOrder = await tx.workOrder.findFirst({
      where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
      include: workOrderInclude,
    });
    if (!workOrder) throw new NotFoundException("生产工单不存在或不属于当前组织");
    return presentWorkOrder(workOrder);
  }
}
