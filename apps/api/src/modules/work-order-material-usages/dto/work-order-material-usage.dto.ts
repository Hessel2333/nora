import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDecimal, IsIn, IsOptional, IsString, IsUUID, Length } from "class-validator";

export const workOrderMaterialDispositions = ["consumed", "scrapped"] as const;

export class RecordWorkOrderMaterialUsageDto {
  @ApiProperty()
  @IsUUID()
  stockBalanceId: string;

  @ApiProperty({ enum: workOrderMaterialDispositions })
  @IsIn(workOrderMaterialDispositions)
  disposition: (typeof workOrderMaterialDispositions)[number];

  @ApiProperty({ example: "4.500", description: "正数 Decimal 字符串，最多 3 位小数" })
  @IsString()
  @IsDecimal({ decimal_digits: "0,3", force_decimal: false })
  quantity: string;

  @ApiProperty({ example: "kg" })
  @IsString()
  @Length(1, 24)
  unit: string;

  @ApiPropertyOptional({ description: "报损时必填；实际耗用可作为备注" })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  reason?: string;

  @ApiProperty({ example: "肉类前处理" })
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
