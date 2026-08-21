import { ForbiddenException, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../organization.js";
import { principalFromClaims, readOidcConfig } from "./oidc-token-verifier.js";

describe("OIDC identity claims", () => {
  it("builds a principal only from recognized roles in the verified claims", () => {
    const principal = principalFromClaims({
      sub: "user-1",
      organization_id: DEFAULT_ORGANIZATION_ID,
      preferred_username: "operator",
      name: "现场操作员",
      realm_access: { roles: ["offline_access", "nora_production_operator"] },
    });
    expect(principal).toEqual(expect.objectContaining({
      subject: "user-1",
      displayName: "现场操作员",
      organizationId: DEFAULT_ORGANIZATION_ID,
      roles: ["nora_production_operator"],
      permissions: ["execution:operate"],
      source: "oidc",
    }));
  });

  it("rejects missing subjects and cross-organization claims", () => {
    expect(() => principalFromClaims({ organization_id: DEFAULT_ORGANIZATION_ID })).toThrow(UnauthorizedException);
    expect(() => principalFromClaims({
      sub: "user-1",
      organization_id: "10000000-0000-4000-8000-000000000001",
    })).toThrow(ForbiddenException);
  });

  it("requires fixed complete configuration and HTTPS outside loopback", () => {
    expect(() => readOidcConfig({})).toThrow(ServiceUnavailableException);
    expect(() => readOidcConfig({
      NORA_OIDC_ISSUER: "https://identity.example.com/realms/nora",
      NORA_OIDC_AUDIENCE: "nora-api",
      NORA_OIDC_JWKS_URI: "http://identity.example.com/realms/nora/certs",
    })).toThrow(ServiceUnavailableException);
    expect(readOidcConfig({
      NORA_OIDC_ISSUER: "http://localhost:18080/realms/nora",
      NORA_OIDC_AUDIENCE: "nora-api",
      NORA_OIDC_JWKS_URI: "http://localhost:18080/realms/nora/protocol/openid-connect/certs",
    })).toEqual(expect.objectContaining({ audience: "nora-api" }));
  });
});
