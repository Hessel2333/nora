import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateOrderDto, ListOrdersQueryDto, OrderActionDto, ReturnOrderDto, UpdateOrderDto } from "./dto/order.dto.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.list(query);
  }

  @Post()
  create(@Body() input: CreateOrderDto) {
    return this.orders.create(input);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.orders.get(id);
  }

  @Put(":id")
  update(@Param("id", ParseUUIDPipe) id: string, @Body() input: UpdateOrderDto) {
    return this.orders.update(id, input);
  }

  @Post(":id/submit")
  submit(@Param("id", ParseUUIDPipe) id: string, @Body() input: OrderActionDto) {
    return this.orders.transition(id, "pending", "submitted", "提交审核", input);
  }

  @Post(":id/approve")
  approve(@Param("id", ParseUUIDPipe) id: string, @Body() input: OrderActionDto) {
    return this.orders.approve(id, input);
  }

  @Post(":id/return")
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
