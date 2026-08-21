import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { identityContext, type NoraPrincipal } from "./identity/identity-context.js";
import { getNoraRuntimeMode, resolveAuditActor } from "./runtime-mode.js";

const principal: NoraPrincipal = {
  subject: "user-1",
  displayName: "真实审核员",
  username: "reviewer",
  organizationId: "00000000-0000-4000-8000-000000000001",
  roles: ["nora_order_approver"],
  permissions: ["orders:approve"],
  source: "oidc",
};

describe("runtime mode", () => {
  it("defaults to development instead of silently enabling demo behavior", () => {
    expect(getNoraRuntimeMode(undefined)).toBe("development");
  });

  it("rejects production writes outside an authenticated request context", () => {
    expect(() => resolveAuditActor(undefined, "production")).toThrow(UnauthorizedException);
    expect(() => resolveAuditActor("声称是真实用户", "production")).toThrow(UnauthorizedException);
  });

  it("uses the verified production principal and ignores a client actor", () => {
    identityContext.run(principal, () => {
      expect(resolveAuditActor("伪造用户", "production")).toBe("真实审核员");
    });
  });

  it("keeps the demo actor only in explicit demo mode", () => {
    expect(resolveAuditActor(undefined, "demo")).toBe("演示用户");
  });
});
