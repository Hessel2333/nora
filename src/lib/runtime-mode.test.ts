import { describe, expect, it } from "vitest";
import {
  NoraWriteUnavailableError,
  assertLocalDemoWrite,
  frontendAuditActor,
  getNoraRuntimeMode,
} from "./runtime-mode";

describe("frontend runtime mode", () => {
  it("defaults to development and never silently enables demo mode", () => {
    expect(getNoraRuntimeMode(undefined)).toBe("development");
  });

  it("allows local writes only in explicit demo mode", () => {
    expect(() => assertLocalDemoWrite("demo", "审核订单")).not.toThrow();
    expect(() => assertLocalDemoWrite("production", "审核订单")).toThrow(NoraWriteUnavailableError);
    expect(() => assertLocalDemoWrite("development", "审核订单")).toThrow(NoraWriteUnavailableError);
  });

  it("does not manufacture a production audit identity", () => {
    expect(frontendAuditActor("production")).toBeUndefined();
  });
});
