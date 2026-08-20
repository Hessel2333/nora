import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export const productionDemandStatuses = [
  "pending_planning",
  "partially_planned",
  "planned",
  "completed",
  "cancelled",
] as const;

export class ListProductionDemandsQueryDto {
  @ApiPropertyOptional({ description: "需求号、订单号、客户或商品" })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  query?: string;

  @ApiPropertyOptional({ enum: productionDemandStatuses })
  @IsOptional()
  @IsIn(productionDemandStatuses)
  status?: (typeof productionDemandStatuses)[number];

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
