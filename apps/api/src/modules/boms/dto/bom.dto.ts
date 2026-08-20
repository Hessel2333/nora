import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { BomOperationKind } from "../../../generated/prisma/enums.js";

export class BomOperationDto {
  @ApiProperty({ example: "OP10" })
  @IsString()
  @Length(1, 32)
  code: string;

  @ApiProperty({ example: "清洗" })
  @IsString()
  @Length(1, 80)
  name: string;

  @ApiProperty({ enum: BomOperationKind, example: BomOperationKind.wash })
  @IsEnum(BomOperationKind)
  kind: BomOperationKind;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence: number;

  @ApiPropertyOptional({ example: "蔬菜前处理" })
  @IsOptional()
  @IsString()
  @Length(0, 80)
  workCenter?: string;

  @ApiPropertyOptional({ example: 12, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  waitMinutes?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  temperatureMin?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  temperatureMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  instructions?: string;
}

export class BomItemDto {
  @ApiProperty()
  @IsUUID()
  componentProductId: string;

  @ApiProperty({ example: "OP20" })
  @IsString()
  @Length(1, 32)
  operationCode: string;

  @ApiProperty({ example: 0.57 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  netQuantity: number;

  @ApiProperty({ example: 0.95 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  @Max(1)
  yieldRate: number;

  @ApiProperty({ example: "kg" })
  @IsString()
  @Length(1, 24)
  unit: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}

export class CreateBomDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: "BOM-CP0001" })
  @IsString()
  @Length(2, 40)
  code: string;

  @ApiProperty({ example: "V1.0" })
  @IsString()
  @Length(1, 24)
  version: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  outputQuantity: number;

  @ApiProperty({ example: "份" })
  @IsString()
  @Length(1, 24)
  outputUnit: string;

  @ApiProperty({ type: [BomOperationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomOperationDto)
  operations: BomOperationDto[];

  @ApiProperty({ type: [BomItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items: BomItemDto[];
}

export class UpdateBomVersionDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  outputQuantity: number;

  @ApiProperty()
  @IsString()
  @Length(1, 24)
  outputUnit: string;

  @ApiProperty({ type: [BomOperationDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomOperationDto)
  operations: BomOperationDto[];

  @ApiProperty({ type: [BomItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BomItemDto)
  items: BomItemDto[];
}

export class CopyBomVersionDto {
  @ApiProperty({ example: "V1.1" })
  @IsString()
  @Length(1, 24)
  version: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sourceVersionId?: string;
}

export class PublishBomVersionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  revision: number;

  @ApiPropertyOptional({ example: "2026-08-18T00:00:00+08:00" })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
