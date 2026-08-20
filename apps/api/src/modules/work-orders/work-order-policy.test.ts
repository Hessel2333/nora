import { describe, expect, it } from "vitest";
import { batchStatusForWorkOrder, getWorkOrderTransition } from "./work-order-policy.js";

describe("work order execution policy", () => {
  it.each([
    ["pending", "start", "running"],
    ["running", "pause", "paused"],
    ["paused", "resume", "running"],
    ["pending", "report_exception", "exception"],
    ["running", "report_exception", "exception"],
    ["paused", "report_exception", "exception"],
    ["exception", "recover_pending", "pending"],
    ["exception", "recover_running", "running"],
  ] as const)("allows %s through %s", (status, command, expected) => {
    expect(getWorkOrderTransition(status, 3, 3, command)).toEqual({ status: expected });
  });

  it("rejects skipped states and stale revisions", () => {
    expect(getWorkOrderTransition("pending", 1, 1, "pause")).toEqual({ issue: "invalid_status" });
    expect(getWorkOrderTransition("running", 2, 1, "pause")).toEqual({ issue: "revision_conflict" });
  });

  it("maps execution state back to the production batch projection", () => {
    expect(batchStatusForWorkOrder("pending")).toBe("released");
    expect(batchStatusForWorkOrder("running")).toBe("running");
    expect(batchStatusForWorkOrder("paused")).toBe("paused");
    expect(batchStatusForWorkOrder("exception")).toBe("exception");
  });
});
