import { Module } from "@nestjs/common";
import { {{Feature}}Controller } from "./{{feature}}.controller.js";
import { {{Feature}}Service } from "./{{feature}}.service.js";

@Module({
  controllers: [{{Feature}}Controller],
  providers: [{{Feature}}Service],
  exports: [{{Feature}}Service],
})
export class {{Feature}}Module {}
