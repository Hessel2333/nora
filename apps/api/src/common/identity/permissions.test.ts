import { describe, expect, it } from "vitest";
import { permissionsForRoles, recognizedNoraRoles } from "./permissions.js";

describe("identity permissions", () => {
  it("maps only recognized OIDC roles to the minimum Nora permissions", () => {
    const roles = recognizedNoraRoles([
      "offline_access",
      "nora_production_operator",
      "nora_quality_inspector",
      "nora_production_operator",
    ]);
    expect(roles).toEqual(["nora_production_operator", "nora_quality_inspector"]);
    expect(permissionsForRoles(roles)).toEqual(["execution:operate", "quality:inspect"]);
  });

  it("grants every known permission to nora_admin", () => {
    expect(permissionsForRoles(["nora_admin"])).toHaveLength(8);
  });
});
