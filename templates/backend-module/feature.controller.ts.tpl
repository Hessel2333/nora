import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Create{{Feature}}Dto } from "./dto/create-{{feature}}.dto.js";
import { {{Feature}}Service } from "./{{feature}}.service.js";

@ApiTags("{{features}}")
@Controller("{{features}}")
export class {{Feature}}Controller {
  constructor(private readonly service: {{Feature}}Service) {}

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() input: Create{{Feature}}Dto) {
    return this.service.create(input);
  }
}
