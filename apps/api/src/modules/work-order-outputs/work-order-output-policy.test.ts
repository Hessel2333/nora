import { describe, expect, it } from "vitest";
import {
  frozenOutputTemperatureRange,
  getQualityInspectionIssue,
} from "./work-order-output-policy.js";

describe("work order output policy", () => {
  it("freezes the temperature range from the final ordered operation", () => {
    expect(frozenOutputTemperatureRange({
      operations: [
        { sequence: 10, temperatureMin: 0, temperatureMax: 4 },
        { sequence: 30, temperatureMin: null, temperatureMax: 12 },
      ],
    } as never)).toEqual({ temperatureMin: null, temperatureMax: 12 });
  });

  it("blocks release when a manual check or frozen temperature guard fails", () => {
    expect(getQualityInspectionIssue({
      decision: "released",
      measuredTemperature: 8,
      temperatureMin: 0,
      temperatureMax: 12,
      appearancePassed: false,
      packageSealPassed: true,
      labelPassed: true,
    })).toBe("release_check_failed");
    expect(getQualityInspectionIssue({
      decision: "released",
      measuredTemperature: 13,
      temperatureMin: 0,
      temperatureMax: 12,
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
    })).toBe("temperature_out_of_range");
  });

  it("requires a rejection note and allows a compliant release", () => {
    expect(getQualityInspectionIssue({
      decision: "rejected",
      measuredTemperature: 9,
      temperatureMin: null,
      temperatureMax: 12,
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
      note: " ",
    })).toBe("rejection_note_required");
    expect(getQualityInspectionIssue({
      decision: "released",
      measuredTemperature: 9,
      temperatureMin: null,
      temperatureMax: 12,
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
    })).toBeUndefined();
  });
});
