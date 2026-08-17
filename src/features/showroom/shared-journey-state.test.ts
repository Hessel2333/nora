import { describe, expect, it } from "vitest";
import { sharedJourneyVisibility } from "./shared-journey-state";

describe("sharedJourneyVisibility", () => {
  it.each([
    ["forecast", 0.76],
    ["order", 0.5],
    ["bom", 0.28],
    ["mrp", 0.78],
    ["production", 0.2],
  ] as const)("keeps the shared overlay out of the %s active phase", (scene, progress) => {
    expect(Object.values(sharedJourneyVisibility(scene, "active", progress))).toEqual([
      false,
      false,
    ]);
  });

  it("only enables a hand-off when the source and destination share the same visual object", () => {
    expect(sharedJourneyVisibility("forecast", "transition", 0.94).order).toBe(false);
    expect(sharedJourneyVisibility("order", "transition", 0.94).dish).toBe(true);
  });

  it("keeps the dish overlay through the first BOM frames, then releases ownership", () => {
    expect(sharedJourneyVisibility("bom", "enter", 0.04).dish).toBe(true);
    expect(sharedJourneyVisibility("bom", "active", 0.08).dish).toBe(false);
  });

  it("keeps the intro order visible as the opening hero object", () => {
    expect(sharedJourneyVisibility("intro", "active", 0.6).order).toBe(true);
  });
});
