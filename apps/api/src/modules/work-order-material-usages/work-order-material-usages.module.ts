import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module.js";
import { WorkOrderMaterialUsagesController } from "./work-order-material-usages.controller.js";
import { WorkOrderMaterialUsagesService } from "./work-order-material-usages.service.js";

@Module({
  imports: [InventoryModule],
  controllers: [WorkOrderMaterialUsagesController],
  providers: [WorkOrderMaterialUsagesService],
})
export class WorkOrderMaterialUsagesModule {}
