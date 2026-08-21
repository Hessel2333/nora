import { describe, expect, it } from "vitest";
import { identityCan, localDevelopmentIdentity } from "./identity";

describe("web identity permissions", () => {
  it("checks server-projected permissions without inferring from display roles", () => {
    expect(identityCan(localDevelopmentIdentity, "quality:inspect")).toBe(true);
    expect(identityCan({
      ...localDevelopmentIdentity,
      roles: ["nora_quality_inspector"],
      permissions: [],
    }, "quality:inspect")).toBe(false);
    expect(identityCan(null, "orders:write")).toBe(false);
  });
});
