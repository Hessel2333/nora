import { Module } from "@nestjs/common";
import { BomsModule } from "./modules/boms/boms.module.js";
import { CatalogModule } from "./modules/catalog/catalog.module.js";
import { HealthController } from "./modules/health/health.controller.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [PrismaModule, CatalogModule, BomsModule, OrdersModule],
  controllers: [HealthController],
})
export class AppModule {}
