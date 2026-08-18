import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
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

export class BomItemDto {
  @ApiProperty()
  @IsUUID()
  componentProductId: string;

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
  @ApiPropertyOptional({ example: "2026-08-18T00:00:00+08:00" })
  @IsOptional()
  @IsDateString()
  effectiveAt?: string;
}
