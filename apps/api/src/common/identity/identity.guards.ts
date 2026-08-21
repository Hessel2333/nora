import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DEFAULT_ORGANIZATION_ID } from "../organization.js";
import { getNoraRuntimeMode } from "../runtime-mode.js";
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from "./identity.decorators.js";
import type { NoraPrincipal } from "./identity-context.js";
import { noraPermissions, type NoraPermission } from "./permissions.js";
import { OidcTokenVerifier } from "./oidc-token-verifier.js";

interface AuthenticatedRequest {
  headers: Record<string, string | string[] | undefined>;
  principal?: NoraPrincipal;
}

function localPrincipal(source: "development" | "demo"): NoraPrincipal {
  const label = source === "demo" ? "演示用户" : "开发环境用户";
  return {
    subject: source === "demo" ? "demo-user" : "development-user",
    displayName: label,
    username: source === "demo" ? "demo" : "developer",
    organizationId: DEFAULT_ORGANIZATION_ID,
    roles: ["nora_admin"],
    permissions: [...noraPermissions],
    source,
  };
}

function bearerToken(value: string | string[] | undefined) {
  if (typeof value !== "string") return undefined;
  const match = /^Bearer ([^\s]+)$/i.exec(value.trim());
  return match?.[1];
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: OidcTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const mode = getNoraRuntimeMode();
    if (mode !== "production") {
      request.principal = localPrincipal(mode);
      return true;
    }
    const token = bearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedException("请先登录后再访问生产数据");
    request.principal = await this.verifier.verify(token);
    return true;
  }
}

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const permission = this.reflector.getAllAndOverride<NoraPermission>(REQUIRED_PERMISSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().principal;
    if (!principal) throw new UnauthorizedException("请先登录后再执行此操作");
    if (!principal.permissions.includes(permission)) {
      throw new ForbiddenException("当前身份没有执行此操作的权限");
    }
    return true;
  }
}
