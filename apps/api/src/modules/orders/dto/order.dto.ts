import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export const orderSources = ["客户下单", "手工录入", "AI预测", "Excel导入"] as const;

export class OrderLineDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 120 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  customerId: string;

  @ApiProperty({ example: "2026-08-18T11:00:00+08:00" })
  @IsISO8601({ strict: true })
  deliveryAt: string;

  @ApiProperty({ enum: orderSources })
  @IsIn(orderSources)
  source: (typeof orderSources)[number];

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;

  @ApiProperty({ type: [OrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines: OrderLineDto[];

  @ApiProperty({ enum: ["draft", "pending"], default: "draft" })
  @IsIn(["draft", "pending"])
  status: "draft" | "pending";
}

export class UpdateOrderDto extends CreateOrderDto {
  @ApiProperty({ description: "乐观锁版本" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision: number;
}

export class OrderActionDto {
  @ApiPropertyOptional({ default: "演示用户" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  comment?: string;
}

export class ReturnOrderDto extends OrderActionDto {
  @ApiProperty()
  @IsString()
  @Length(1, 1000)
  declare comment: string;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: ["draft", "pending", "approved", "in_production", "delivering", "completed", "reconciled"] })
  @IsOptional()
  @IsIn(["draft", "pending", "approved", "in_production", "delivering", "completed", "reconciled"])
  status?: "draft" | "pending" | "approved" | "in_production" | "delivering" | "completed" | "reconciled";

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 50, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 50;
}
