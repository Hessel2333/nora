import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDecimal,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from "class-validator";

export const inventoryLotQualityStatuses = ["pending", "released", "quarantined", "rejected"] as const;

export class InventoryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  lotId?: string;

  @ApiPropertyOptional({ enum: inventoryLotQualityStatuses })
  @IsOptional()
  @IsIn(inventoryLotQualityStatuses)
  qualityStatus?: (typeof inventoryLotQualityStatuses)[number];
}

export class CreateOpeningBalanceDto {
  @ApiProperty()
  @IsUUID()
  locationId: string;

  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ example: "OPEN-20260820-001" })
  @IsString()
  @Length(1, 64)
  lotCode: string;

  @ApiPropertyOptional({ example: "SUP-240820-A" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  supplierLotCode?: string;

  @ApiProperty({ example: "120.000", description: "正数 Decimal 字符串，最多 3 位小数" })
  @IsString()
  @IsDecimal({ decimal_digits: "0,3", force_decimal: false })
  quantity: string;

  @ApiProperty({ example: "kg" })
  @IsString()
  @Length(1, 24)
  unit: string;

  @ApiProperty({ enum: inventoryLotQualityStatuses, default: "released" })
  @IsIn(inventoryLotQualityStatuses)
  qualityStatus: (typeof inventoryLotQualityStatuses)[number];

  @ApiProperty({ example: "2026-08-20T01:00:00.000Z" })
  @IsISO8601({ strict: true })
  receivedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  productionAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601({ strict: true })
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;

  @ApiPropertyOptional({ description: "仅用于 demo/development；production 从认证上下文取得" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;
}
