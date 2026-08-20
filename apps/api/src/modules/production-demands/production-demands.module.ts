import { Module } from "@nestjs/common";
import { ProductionDemandsController } from "./production-demands.controller.js";
import { ProductionDemandsService } from "./production-demands.service.js";

@Module({
  controllers: [ProductionDemandsController],
  providers: [ProductionDemandsService],
})
export class ProductionDemandsModule {}
