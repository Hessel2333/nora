import { Module } from "@nestjs/common";
import { ProductionBatchesController } from "./production-batches.controller.js";
import { ProductionBatchesService } from "./production-batches.service.js";

@Module({
  controllers: [ProductionBatchesController],
  providers: [ProductionBatchesService],
})
export class ProductionBatchesModule {}
