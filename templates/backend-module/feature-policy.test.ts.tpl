import { describe, expect, it } from "vitest";
import { canTransition{{Feature}} } from "./{{feature}}-policy.js";

describe("{{feature}} policy", () => {
  it("documents allowed and rejected transitions", () => {
    expect(canTransition{{Feature}}("from", "to")).toBe(false);
  });
});
