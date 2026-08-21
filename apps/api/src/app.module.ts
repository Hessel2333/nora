import { Module } from "@nestjs/common";
import { BomsModule } from "./modules/boms/boms.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { HealthController } from "./modules/health/health.controller.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { ProductionDemandsModule } from "./modules/production-demands/production-demands.module.js";
import { ProductionBatchesModule } from "./modules/production-batches/production-batches.module.js";
import { WorkOrdersModule } from "./modules/work-orders/work-orders.module.js";
import { WorkOrderOutputsModule } from "./modules/work-order-outputs/work-order-outputs.module.js";
import { InventoryModule } from "./modules/inventory/inventory.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [PrismaModule, CatalogModule, BomsModule, OrdersModule, ProductionDemandsModule, ProductionBatchesModule, WorkOrdersModule, WorkOrderOutputsModule, InventoryModule],
  controllers: [HealthController],
})
export class AppModule {}
