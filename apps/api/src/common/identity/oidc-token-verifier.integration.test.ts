import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from "jose";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_ORGANIZATION_ID } from "../organization.js";
import { OidcTokenVerifier } from "./oidc-token-verifier.js";

const issuer = "https://identity.example.test/realms/nora";
const audience = "nora-api";
let server: Server;
let privateKey: CryptoKey;

async function signedToken({
  tokenIssuer = issuer,
  tokenAudience = audience,
  organizationId = DEFAULT_ORGANIZATION_ID,
  expired = false,
}: {
  tokenIssuer?: string;
  tokenAudience?: string;
  organizationId?: string;
  expired?: boolean;
} = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    organization_id: organizationId,
    preferred_username: "operator",
    realm_access: { roles: ["nora_production_operator"] },
  })
    .setProtectedHeader({ alg: "RS256", kid: "nora-test-key" })
    .setSubject("user-1")
    .setIssuer(tokenIssuer)
    .setAudience(tokenAudience)
    .setIssuedAt(expired ? now - 600 : now)
    .setExpirationTime(expired ? now - 60 : now + 300)
    .sign(privateKey);
}

describe.sequential("OIDC token verification", () => {
  beforeAll(async () => {
    const keys = await generateKeyPair("RS256");
    privateKey = keys.privateKey;
    const publicJwk = await exportJWK(keys.publicKey);
    const jwks = JSON.stringify({
      keys: [{ ...publicJwk, kid: "nora-test-key", use: "sig", alg: "RS256" }],
    });
    server = createServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(jwks);
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("JWKS test server did not start");
    vi.stubEnv("NORA_OIDC_ISSUER", issuer);
    vi.stubEnv("NORA_OIDC_AUDIENCE", audience);
    vi.stubEnv("NORA_OIDC_JWKS_URI", `http://127.0.0.1:${address.port}/certs`);
  });

  afterAll(async () => {
    server.close();
    await once(server, "close");
    vi.unstubAllEnvs();
  });

  it("accepts a correctly signed current-organization token", async () => {
    const principal = await new OidcTokenVerifier().verify(await signedToken());
    expect(principal).toEqual(expect.objectContaining({
      subject: "user-1",
      organizationId: DEFAULT_ORGANIZATION_ID,
      permissions: ["execution:operate"],
    }));
  });

  it.each([
    ["wrong issuer", { tokenIssuer: "https://attacker.example.test/realms/nora" }],
    ["wrong audience", { tokenAudience: "another-api" }],
    ["expired token", { expired: true }],
  ])("rejects %s", async (_label, options) => {
    await expect(new OidcTokenVerifier().verify(await signedToken(options)))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects a valid token from another organization", async () => {
    const token = await signedToken({ organizationId: "10000000-0000-4000-8000-000000000001" });
    await expect(new OidcTokenVerifier().verify(token)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
