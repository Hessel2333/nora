import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { DEFAULT_ORGANIZATION_ID } from "../organization.js";
import type { NoraPrincipal } from "./identity-context.js";
import { permissionsForRoles, recognizedNoraRoles } from "./permissions.js";

interface NoraOidcClaims extends JWTPayload {
  organization_id?: unknown;
  preferred_username?: unknown;
  name?: unknown;
  roles?: unknown;
  realm_access?: unknown;
}

interface OidcConfig {
  issuer: string;
  audience: string;
  jwksUri: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readOidcConfig(env: NodeJS.ProcessEnv = process.env): OidcConfig {
  const issuer = env.NORA_OIDC_ISSUER?.trim();
  const audience = env.NORA_OIDC_AUDIENCE?.trim();
  const jwksUri = env.NORA_OIDC_JWKS_URI?.trim();
  if (!issuer || !audience || !jwksUri) {
    throw new ServiceUnavailableException("身份服务配置不完整，请联系系统管理员");
  }
  let parsed: URL;
  try {
    parsed = new URL(jwksUri);
  } catch {
    throw new ServiceUnavailableException("身份服务 JWKS 地址无效");
  }
  const isLoopback = parsed.hostname === "localhost"
    || parsed.hostname === "127.0.0.1"
    || parsed.hostname === "[::1]";
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopback)) {
    throw new ServiceUnavailableException("身份服务 JWKS 必须使用 HTTPS；本地回环地址除外");
  }
  return { issuer, audience, jwksUri: parsed.toString() };
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function principalFromClaims(
  claims: NoraOidcClaims,
  organizationId = DEFAULT_ORGANIZATION_ID,
): NoraPrincipal {
  const subject = claims.sub?.trim();
  if (!subject) throw new UnauthorizedException("身份令牌缺少用户标识");
  if (typeof claims.organization_id !== "string" || !uuidPattern.test(claims.organization_id)) {
    throw new ForbiddenException("身份令牌缺少有效组织范围");
  }
  if (claims.organization_id !== organizationId) {
    throw new ForbiddenException("当前身份无权访问该组织");
  }
  const realmRoles = typeof claims.realm_access === "object" && claims.realm_access !== null
    ? stringArray((claims.realm_access as { roles?: unknown }).roles)
    : [];
  const roles = recognizedNoraRoles([...stringArray(claims.roles), ...realmRoles]);
  const username = typeof claims.preferred_username === "string" && claims.preferred_username.trim()
    ? claims.preferred_username.trim()
    : subject;
  const displayName = typeof claims.name === "string" && claims.name.trim()
    ? claims.name.trim().slice(0, 80)
    : username.slice(0, 80);
  return {
    subject,
    displayName,
    username,
    organizationId,
    roles,
    permissions: permissionsForRoles(roles),
    source: "oidc",
  };
}

@Injectable()
export class OidcTokenVerifier {
  private cacheKey = "";
  private keySet?: JWTVerifyGetKey;

  async verify(token: string) {
    const config = readOidcConfig();
    if (!this.keySet || this.cacheKey !== config.jwksUri) {
      this.keySet = createRemoteJWKSet(new URL(config.jwksUri), {
        timeoutDuration: 5_000,
        cooldownDuration: 30_000,
        cacheMaxAge: 600_000,
      });
      this.cacheKey = config.jwksUri;
    }
    try {
      const { payload } = await jwtVerify<NoraOidcClaims>(token, this.keySet, {
        issuer: config.issuer,
        audience: config.audience,
        algorithms: ["RS256"],
        requiredClaims: ["sub", "iat", "exp"],
        clockTolerance: 5,
      });
      return principalFromClaims(payload);
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) throw error;
      const code = (error as { code?: string }).code;
      if (error instanceof TypeError || code === "ERR_JWKS_TIMEOUT" || code === "ERR_JWKS_FETCH_FAILED") {
        throw new ServiceUnavailableException("身份服务暂不可用，请稍后重试");
      }
      throw new UnauthorizedException("登录已失效或身份令牌无效");
    }
  }
}
