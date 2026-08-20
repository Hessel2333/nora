import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  CreateProductionBatchDto,
  ProductionBatchCommandDto,
} from "./dto/production-batch.dto.js";
import { ProductionBatchesService } from "./production-batches.service.js";

@ApiTags("production-batches")
@Controller("production-batches")
export class ProductionBatchesController {
  constructor(private readonly productionBatches: ProductionBatchesService) {}

  @Get()
  list() {
    return this.productionBatches.list();
  }

  @Post()
  @ApiHeader({ name: "Idempotency-Key", required: true })
  create(
    @Body() input: CreateProductionBatchDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.productionBatches.create(input, idempotencyKey);
  }

  @Post(":id/confirm")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  confirm(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: ProductionBatchCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.productionBatches.confirm(id, input, idempotencyKey);
  }

  @Post(":id/release")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  release(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: ProductionBatchCommandDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.productionBatches.release(id, input, idempotencyKey);
  }
}
