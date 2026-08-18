import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class Create{{Feature}}Dto {
  @ApiProperty()
  @IsString()
  @Length(1, 120)
  name: string;
}
