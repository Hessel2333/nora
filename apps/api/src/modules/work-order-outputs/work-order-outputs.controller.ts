import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  InspectWorkOrderOutputDto,
  ReportWorkOrderOutputDto,
} from "./dto/work-order-output.dto.js";
import { WorkOrderOutputsService } from "./work-order-outputs.service.js";

@ApiTags("work-order-outputs")
@Controller("work-orders/:workOrderId/outputs")
export class WorkOrderOutputsController {
  constructor(private readonly outputs: WorkOrderOutputsService) {}

  @Get()
  list(@Param("workOrderId", new ParseUUIDPipe()) workOrderId: string) {
    return this.outputs.list(workOrderId);
  }

  @Post()
  @ApiHeader({ name: "Idempotency-Key", required: true })
  report(
    @Param("workOrderId", new ParseUUIDPipe()) workOrderId: string,
    @Body() input: ReportWorkOrderOutputDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.outputs.report(workOrderId, input, idempotencyKey);
  }

  @Post(":outputId/inspect")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  inspect(
    @Param("workOrderId", new ParseUUIDPipe()) workOrderId: string,
    @Param("outputId", new ParseUUIDPipe()) outputId: string,
    @Body() input: InspectWorkOrderOutputDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.outputs.inspect(workOrderId, outputId, input, idempotencyKey);
  }
}
