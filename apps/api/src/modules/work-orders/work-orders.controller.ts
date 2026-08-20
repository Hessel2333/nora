import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  RecoverWorkOrderDto,
  WorkOrderCommandDto,
  WorkOrderReasonCommandDto,
} from "./dto/work-order.dto.js";
import { WorkOrdersService } from "./work-orders.service.js";

@ApiTags("work-orders")
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  list() {
    return this.workOrders.list();
  }

  @Post(":id/start")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  start(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.start(id, input, idempotencyKey);
  }

  @Post(":id/pause")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  pause(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderReasonCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.pause(id, input, idempotencyKey);
  }

  @Post(":id/resume")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  resume(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.resume(id, input, idempotencyKey);
  }

  @Post(":id/report-exception")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  reportException(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderReasonCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.reportException(id, input, idempotencyKey);
  }

  @Post(":id/recover")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  recover(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: RecoverWorkOrderDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.workOrders.recover(id, input, idempotencyKey);
  }
}
