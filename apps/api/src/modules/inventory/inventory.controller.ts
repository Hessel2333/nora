import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiTags } from "@nestjs/swagger";
import {
  CreateOpeningBalanceDto,
  InventoryQueryDto,
  WorkOrderMaterialMovementDto,
} from "./dto/inventory.dto.js";
import { InventoryService } from "./inventory.service.js";
import { RequirePermission } from "../../common/identity/identity.decorators.js";

@ApiTags("inventory")
@ApiBearerAuth()
@Controller("inventory")
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get("locations")
  listLocations() {
    return this.inventory.listLocations();
  }

  @Get("stock")
  listStock(@Query() query: InventoryQueryDto) {
    return this.inventory.listStock(query);
  }

  @Get("transactions")
  listTransactions(@Query() query: InventoryQueryDto) {
    return this.inventory.listTransactions(query);
  }

  @Post("opening-balances")
  @RequirePermission("inventory:write")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  createOpeningBalance(
    @Body() input: CreateOpeningBalanceDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.inventory.createOpeningBalance(input, idempotencyKey);
  }

  @Get("work-orders/:id/materials")
  workOrderMaterials(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.inventory.getWorkOrderMaterials(id);
  }

  @Post("work-orders/:id/issues")
  @RequirePermission("inventory:write")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  issueWorkOrderMaterial(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderMaterialMovementDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.inventory.issueWorkOrderMaterial(id, input, idempotencyKey);
  }

  @Post("work-orders/:id/returns")
  @RequirePermission("inventory:write")
  @ApiHeader({ name: "Idempotency-Key", required: true })
  returnWorkOrderMaterial(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() input: WorkOrderMaterialMovementDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.inventory.returnWorkOrderMaterial(id, input, idempotencyKey);
  }
}
