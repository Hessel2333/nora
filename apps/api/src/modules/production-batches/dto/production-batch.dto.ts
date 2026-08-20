import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDecimal,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
  ValidateNested,
} from "class-validator";

export class DemandAllocationDto {
  @ApiProperty()
  @IsUUID()
  productionDemandLineId: string;

  @ApiProperty({ example: "120.000", description: "正数 Decimal 字符串，最多 3 位小数" })
  @IsString()
  @IsDecimal({ decimal_digits: "0,3", force_decimal: false })
  quantity: string;
}

export class CreateProductionBatchDto {
  @ApiProperty({ example: "2026-08-21T02:00:00.000Z" })
  @IsISO8601({ strict: true })
  scheduledFor: string;

  @ApiProperty({ type: [DemandAllocationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => DemandAllocationDto)
  allocations: DemandAllocationDto[];

  @ApiPropertyOptional({ description: "仅用于 demo/development；production 从认证上下文取得" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;
}

export class ProductionBatchCommandDto {
  @ApiProperty({ example: 1, description: "客户端最后读取到的批次 revision" })
  @IsInt()
  @Min(1)
  revision: number;

  @ApiPropertyOptional({ description: "仅用于 demo/development；production 从认证上下文取得" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;
}
