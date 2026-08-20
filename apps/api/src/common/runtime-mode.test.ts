import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { getNoraRuntimeMode, resolveAuditActor } from "./runtime-mode.js";

describe("runtime mode", () => {
  it("defaults to development instead of silently enabling demo behavior", () => {
    expect(getNoraRuntimeMode(undefined)).toBe("development");
  });

  it("rejects fake or missing actors in production", () => {
    expect(() => resolveAuditActor(undefined, "production")).toThrow(BadRequestException);
    expect(() => resolveAuditActor("演示用户", "production")).toThrow(BadRequestException);
    expect(() => resolveAuditActor("声称是真实用户", "production")).toThrow(BadRequestException);
  });

  it("keeps the demo actor only in explicit demo mode", () => {
    expect(resolveAuditActor(undefined, "demo")).toBe("演示用户");
  });
});
