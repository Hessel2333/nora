import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { NoraPrincipal } from "./identity-context.js";
import { AuthenticationGuard, AuthorizationGuard } from "./identity.guards.js";

const principal: NoraPrincipal = {
  subject: "user-1",
  displayName: "计划员",
  username: "planner",
  organizationId: "00000000-0000-4000-8000-000000000001",
  roles: ["nora_planner"],
  permissions: ["planning:write"],
  source: "oidc",
};

function context(request: { headers: Record<string, string>; principal?: NoraPrincipal }) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as never;
}

describe("identity guards", () => {
  it("requires a bearer token in production and attaches the verified principal", async () => {
    vi.stubEnv("NORA_MODE", "production");
    try {
      const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
      const verifier = { verify: vi.fn().mockResolvedValue(principal) };
      const guard = new AuthenticationGuard(reflector as never, verifier as never);
      await expect(guard.canActivate(context({ headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
      const request = { headers: { authorization: "Bearer signed-token" } };
      await expect(guard.canActivate(context(request))).resolves.toBe(true);
      expect(verifier.verify).toHaveBeenCalledWith("signed-token");
      expect(request).toHaveProperty("principal", principal);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses a server-owned admin principal in development", async () => {
    vi.stubEnv("NORA_MODE", "development");
    try {
      const request = { headers: {} };
      const guard = new AuthenticationGuard(
        { getAllAndOverride: vi.fn().mockReturnValue(false) } as never,
        { verify: vi.fn() } as never,
      );
      await expect(guard.canActivate(context(request))).resolves.toBe(true);
      expect(request).toHaveProperty("principal", expect.objectContaining({ source: "development" }));
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("allows only the permission declared by the command", () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue("quality:inspect") };
    const guard = new AuthorizationGuard(reflector as never);
    expect(() => guard.canActivate(context({ headers: {}, principal }))).toThrow(ForbiddenException);
    const qualityPrincipal = { ...principal, permissions: ["quality:inspect" as const] };
    expect(guard.canActivate(context({ headers: {}, principal: qualityPrincipal }))).toBe(true);
  });
});
