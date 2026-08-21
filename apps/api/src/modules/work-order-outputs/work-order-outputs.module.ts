import { Module } from "@nestjs/common";
import { WorkOrderOutputsController } from "./work-order-outputs.controller.js";
import { WorkOrderOutputsService } from "./work-order-outputs.service.js";

@Module({
  controllers: [WorkOrderOutputsController],
  providers: [WorkOrderOutputsService],
})
export class WorkOrderOutputsModule {}
