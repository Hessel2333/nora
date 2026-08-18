import { describe, expect, it } from "vitest";
import { canTransitionOrder } from "./order-policy.js";

describe("order state policy", () => {
  it("allows the MVP approval flow", () => {
    expect(canTransitionOrder("draft", "pending")).toBe(true);
    expect(canTransitionOrder("pending", "approved")).toBe(true);
    expect(canTransitionOrder("pending", "draft")).toBe(true);
  });

  it("rejects skipped and terminal transitions", () => {
    expect(canTransitionOrder("draft", "approved")).toBe(false);
    expect(canTransitionOrder("reconciled", "draft")).toBe(false);
  });
});
