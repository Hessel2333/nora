import { describe, expect, it } from "vitest";
import { materialIssueProgress, suggestedMovementQuantity } from "./work-order-material-view";

describe("work order material view", () => {
  it("calculates bounded net issue progress", () => {
    expect(materialIssueProgress({ plannedQuantity: "2.000", netIssuedQuantity: "0.500" } as never)).toBe(25);
    expect(materialIssueProgress({ plannedQuantity: "2.000", netIssuedQuantity: "3.000" } as never)).toBe(100);
  });

  it("suggests the smaller of remaining requirement and lot balance", () => {
    expect(suggestedMovementQuantity("1.516", "12.500")).toBe("1.516");
    expect(suggestedMovementQuantity("1.516", "0.700")).toBe("0.700");
  });
});
