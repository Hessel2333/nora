import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { ListProductionDemandsQueryDto } from "./dto/production-demand.dto.js";
import { ProductionDemandsService } from "./production-demands.service.js";

@ApiTags("production-demands")
@ApiBearerAuth()
@Controller("production-demands")
export class ProductionDemandsController {
  constructor(private readonly productionDemands: ProductionDemandsService) {}

  @Get()
  list(@Query() query: ListProductionDemandsQueryDto) {
    return this.productionDemands.list(query);
  }
}
