import { Global, Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { IdentityContextInterceptor } from "./identity-context.interceptor.js";
import { IdentityController } from "./identity.controller.js";
import { AuthenticationGuard, AuthorizationGuard } from "./identity.guards.js";
import { OidcTokenVerifier } from "./oidc-token-verifier.js";

@Global()
@Module({
  controllers: [IdentityController],
  providers: [
    OidcTokenVerifier,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
    { provide: APP_INTERCEPTOR, useClass: IdentityContextInterceptor },
  ],
  exports: [OidcTokenVerifier],
})
export class IdentityModule {}
