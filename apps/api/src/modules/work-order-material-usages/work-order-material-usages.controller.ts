import { Body, Controller, Headers, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import { RecordWorkOrderMaterialUsageDto } from "./dto/work-order-material-usage.dto.js";
import { WorkOrderMaterialUsagesService } from "./work-order-material-usages.service.js";
import { RequirePermission } from "../../common/identity/identity.decorators.js";

@ApiTags("work-order-material-usages")
@ApiBearerAuth()
@Controller("work-orders/:workOrderId/material-usages")
export class WorkOrderMaterialUsagesController {
  constructor(private readonly usages: WorkOrderMaterialUsagesService) {}

  @Post()
  @RequirePermission("execution:operate")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  record(
    @Param("workOrderId", new ParseUUIDPipe()) workOrderId: string,
    @Body() input: RecordWorkOrderMaterialUsageDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.usages.record(workOrderId, input, idempotencyKey);
  }
}
