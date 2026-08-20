import { Body, Controller, Get, Headers, Post, Query } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { CreateOpeningBalanceDto, InventoryQueryDto } from "./dto/inventory.dto.js";
import { InventoryService } from "./inventory.service.js";

@ApiTags("inventory")
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
  @ApiHeader({ name: "Idempotency-Key", required: true })
  createOpeningBalance(
    @Body() input: CreateOpeningBalanceDto,
    @Headers("idempotency-key") idempotencyKey?: string,
  ) {
    return this.inventory.createOpeningBalance(input, idempotencyKey);
  }
}
