import { describe, expect, it } from "vitest";
import { workOrderActions, workOrderCommandSuccessLabel } from "./work-order-actions";

describe("work order actions", () => {
  it("only offers commands allowed by the current server state machine", () => {
    expect(workOrderActions("pending").map((action) => action.command)).toEqual(["start", "report-exception"]);
    expect(workOrderActions("running").map((action) => action.command)).toEqual(["pause", "report-exception"]);
    expect(workOrderActions("paused").map((action) => action.command)).toEqual(["resume", "report-exception"]);
    expect(workOrderActions("exception").map((action) => action.command)).toEqual([
      "recover-running",
      "recover-pending",
    ]);
    expect(workOrderActions("completed")).toEqual([]);
  });

  it("keeps user-facing success feedback specific", () => {
    expect(workOrderCommandSuccessLabel("start")).toBe("工单已开始");
    expect(workOrderCommandSuccessLabel("report-exception")).toBe("异常已上报");
  });
});
