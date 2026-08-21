import { describe, expect, it } from "vitest";
import { outputTemperatureRange, qualityReleaseIssue } from "./work-order-output-view";

const output = {
  temperatureMin: "0.00",
  temperatureMax: "12.00",
} as never;

describe("work order output view", () => {
  it("formats frozen temperature bounds", () => {
    expect(outputTemperatureRange(output)).toBe("0.00–12.00 ℃");
  });

  it("blocks release until checks, temperature and location are valid", () => {
    expect(qualityReleaseIssue({
      output,
      measuredTemperature: "13",
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
      standardVersion: "Q-V1",
      sampleQuantity: "5",
      locationId: "location-1",
    })).toContain("超出冻结范围");
    expect(qualityReleaseIssue({
      output,
      measuredTemperature: "8",
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
      standardVersion: "Q-V1",
      sampleQuantity: "5",
      locationId: "location-1",
    })).toBe("");
  });
});
