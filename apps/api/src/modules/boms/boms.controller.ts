import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CopyBomVersionDto, CreateBomDto, PublishBomVersionDto, UpdateBomVersionDto } from "./dto/bom.dto.js";
import { BomsService } from "./boms.service.js";

@ApiTags("boms")
@Controller("boms")
export class BomsController {
  constructor(private readonly boms: BomsService) {}

  @Get()
  list() {
    return this.boms.list();
  }

  @Post()
  create(@Body() input: CreateBomDto) {
    return this.boms.create(input);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.boms.get(id);
  }

  @Post(":id/versions")
  copyVersion(@Param("id", ParseUUIDPipe) id: string, @Body() input: CopyBomVersionDto) {
    return this.boms.copyVersion(id, input);
  }

  @Put("versions/:versionId")
  updateVersion(@Param("versionId", ParseUUIDPipe) versionId: string, @Body() input: UpdateBomVersionDto) {
    return this.boms.updateDraft(versionId, input);
  }

  @Post("versions/:versionId/publish")
  publishVersion(@Param("versionId", ParseUUIDPipe) versionId: string, @Body() input: PublishBomVersionDto) {
    return this.boms.publish(versionId, input);
  }

  @Post("versions/:versionId/retire")
  retireVersion(@Param("versionId", ParseUUIDPipe) versionId: string) {
    return this.boms.retire(versionId);
  }
}
