import { Controller, Get, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentPrincipal } from "./identity.decorators.js";
import type { NoraPrincipal } from "./identity-context.js";

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class IdentityController {
  @Get("me")
  me(@CurrentPrincipal() principal?: NoraPrincipal) {
    if (!principal) throw new UnauthorizedException("请先登录");
    return principal;
  }
}
