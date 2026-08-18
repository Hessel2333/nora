import { Module } from "@nestjs/common";
import { BomsController } from "./boms.controller.js";
import { BomsService } from "./boms.service.js";

@Module({
  controllers: [BomsController],
  providers: [BomsService],
  exports: [BomsService],
})
export class BomsModule {}
