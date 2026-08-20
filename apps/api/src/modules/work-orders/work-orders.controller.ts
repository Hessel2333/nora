import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { WorkOrdersService } from "./work-orders.service.js";

@ApiTags("work-orders")
@Controller("work-orders")
export class WorkOrdersController {
  constructor(private readonly workOrders: WorkOrdersService) {}

  @Get()
  list() {
    return this.workOrders.list();
  }
}
