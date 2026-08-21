import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDecimal,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from "class-validator";

const qualityDecisions = ["released", "rejected"] as const;

export class ReportWorkOrderOutputDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  revision: number;

  @ApiProperty({ example: "118.000" })
  @IsString()
  @IsDecimal({ decimal_digits: "0,3", force_decimal: false })
  quantity: string;

  @ApiProperty({ example: "份" })
  @IsString()
  @Length(1, 24)
  unit: string;

  @ApiProperty({ example: "FG-20260821-001" })
  @IsString()
  @Length(1, 64)
  lotCode: string;

  @ApiProperty({ example: "2026-08-23T15:59:00.000Z" })
  @IsISO8601({ strict: true })
  expiresAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  varianceReason?: string;

  @ApiProperty({ example: "净菜包装间" })
  @IsString()
  @Length(1, 80)
  workstationCode: string;

  @ApiProperty({ example: "WEB-DEVELOPMENT" })
  @IsString()
  @Length(1, 120)
  deviceId: string;

  @ApiPropertyOptional({ description: "仅用于 demo/development；production 从认证上下文取得" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;
}

export class InspectWorkOrderOutputDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  workOrderRevision: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  outputRevision: number;

  @ApiProperty({ enum: qualityDecisions })
  @IsIn(qualityDecisions)
  decision: (typeof qualityDecisions)[number];

  @ApiProperty({ example: "Q-NET-PREP-V1.2" })
  @IsString()
  @Length(1, 80)
  standardVersion: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  sampleQuantity: number;

  @ApiProperty({ example: "8.50" })
  @IsString()
  @IsDecimal({ decimal_digits: "0,2", force_decimal: false })
  measuredTemperature: string;

  @ApiProperty()
  @IsBoolean()
  appearancePassed: boolean;

  @ApiProperty()
  @IsBoolean()
  packageSealPassed: boolean;

  @ApiProperty()
  @IsBoolean()
  labelPassed: boolean;

  @ApiPropertyOptional({ description: "合格时为成品库；拒收时省略" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 500)
  note?: string;

  @ApiProperty({ example: "质检台" })
  @IsString()
  @Length(1, 80)
  workstationCode: string;

  @ApiProperty({ example: "WEB-DEVELOPMENT" })
  @IsString()
  @Length(1, 120)
  deviceId: string;

  @ApiPropertyOptional({ description: "仅用于 demo/development；production 从认证上下文取得" })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  actor?: string;
}
