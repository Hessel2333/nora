import { Module } from "@nestjs/common";
import { BomsModule } from "../boms/boms.module.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [BomsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
