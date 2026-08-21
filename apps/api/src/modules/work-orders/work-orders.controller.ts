import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  RecoverWorkOrderDto,
  WorkOrderCommandDto,
  WorkOrderReasonCommandDto,
} from "./dto/work-order.dto.js";
import { WorkOrdersService } from "./work-orders.service.js";
import { RequirePermission } from "../../common/identity/identity.decorators.js";

@ApiTags("work-orders")
@ApiBearerAuth()
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  list() {
    return this.workOrders.list();
  }

  @Post(":id/start")
  @RequirePermission("execution:operate")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  start(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.start(id, input, idempotencyKey);
  }

  @Post(":id/pause")
  @RequirePermission("execution:operate")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  pause(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderReasonCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.pause(id, input, idempotencyKey);
  }

  @Post(":id/resume")
  @RequirePermission("execution:operate")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  resume(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.resume(id, input, idempotencyKey);
  }

  @Post(":id/report-exception")
  @RequirePermission("execution:operate")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  reportException(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderReasonCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.reportException(id, input, idempotencyKey);
  }

  @Post(":id/recover")
  @RequirePermission("execution:supervise")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  recover(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: RecoverWorkOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.recover(id, input, idempotencyKey);
  }
}
