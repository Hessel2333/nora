import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service.js";

@ApiTags("catalog")
@ApiBearerAuth()
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("customers")
  customers(@Query("query") query?: string) {
    return this.catalog.listCustomers(query);
  }

  @Get("products")
  products(@Query("query") query?: string) {
    return this.catalog.listProducts(query);
  }
}
