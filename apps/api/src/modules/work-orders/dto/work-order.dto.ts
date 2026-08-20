import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from "class-validator";

export class WorkOrderCommandDto {
  @ApiProperty({ example: 1, description: "客户端最后读取到的工单 revision" })
  @IsInt()
  @Min(1)
  revision: number;

  @ApiProperty({ example: "肉类前处理间" })
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

export class WorkOrderReasonCommandDto extends WorkOrderCommandDto {
  @ApiProperty({ example: "等待原料补充" })
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class RecoverWorkOrderDto extends WorkOrderReasonCommandDto {
  @ApiProperty({ enum: ["pending", "running"] })
  @IsIn(["pending", "running"])
  targetStatus: "pending" | "running";
}
