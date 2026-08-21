import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CreateOrderDto, ListOrdersQueryDto, OrderActionDto, ReturnOrderDto, UpdateOrderDto } from "./dto/order.dto.js";
import { OrdersService } from "./orders.service.js";
import { RequirePermission } from "../../common/identity/identity.decorators.js";

@ApiTags("orders")
@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Post()
  @RequirePermission("orders:write")
  create(@Body() input: CreateOrderDto) {
    return this.orders.create(input);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.orders.get(id);
  }

  @Put(":id")
  @RequirePermission("orders:write")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateOrderDto) {
    return this.orders.update(id, input);
  }

  @Post(":id/submit")
  @RequirePermission("orders:write")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() input: OrderActionDto) {
    return this.orders.transition(id, "pending", "submitted", "提交审核", input);
  }

  @Post(":id/approve")
  @RequirePermission("orders:approve")
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() input: OrderActionDto) {
    return this.orders.approve(id, input);
  }

  @Post(":id/return")
  @RequirePermission("orders:approve")
  returnOrder(@Param("id", ParseUUIDPipe) id: string, @Body() input: ReturnOrderDto) {
    return this.orders.transition(id, "draft", "returned", "退回修改", input);
  }

  @Get(":id/material-requirements")
  materialRequirements(@Param("id", ParseUUIDPipe) id: string) {
    return this.orders.materialRequirements(id);
  }

  @Get(":id/production-readiness")
  productionReadiness(@Param("id", ParseUUIDPipe) id: string) {
    return this.orders.productionReadiness(id);
  }

  @Get(":id/production-demand")
  productionDemand(@Param("id", ParseUUIDPipe) id: string) {
    return this.orders.productionDemand(id);
  }
}
