import { describe, expect, it } from "vitest";
import { isBomValidityConstraintConflict } from "./bom-errors.js";

describe("isBomValidityConstraintConflict", () => {
  it("recognizes the named PostgreSQL exclusion constraint in Prisma metadata", () => {
    expect(isBomValidityConstraintConflict({
      code: "P2004",
      meta: { database_error: { message: "conflicting key violates exclusion constraint bom_versions_no_overlapping_validity" } },
    })).toBe(true);
  });

  it("does not hide unrelated database constraint errors", () => {
    expect(isBomValidityConstraintConflict({ code: "P2004", message: "another constraint failed" })).toBe(false);
  });
});
