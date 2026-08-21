import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import {
  InspectWorkOrderOutputDto,
  ReportWorkOrderOutputDto,
} from "./work-order-output.dto.js";

describe("work order output DTOs", () => {
  it("accepts a valid output report and rejects excess Decimal precision", async () => {
    const valid = plainToInstance(ReportWorkOrderOutputDto, {
      revision: 2,
      quantity: "118.000",
      unit: "份",
      lotCode: "FG-20260821-001",
      expiresAt: "2030-08-23T15:59:00.000Z",
      workstationCode: "净菜包装间",
      deviceId: "WEB-DEVELOPMENT",
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(ReportWorkOrderOutputDto, { ...valid, quantity: "1.0001" });
    expect((await validate(invalid)).map((error) => error.property)).toContain("quantity");
  });

  it("requires typed inspection fields and a supported decision", async () => {
    const valid = plainToInstance(InspectWorkOrderOutputDto, {
      workOrderRevision: 3,
      outputRevision: 1,
      decision: "released",
      standardVersion: "Q-NET-PREP-V1.2",
      sampleQuantity: 5,
      measuredTemperature: "8.50",
      appearancePassed: true,
      packageSealPassed: true,
      labelPassed: true,
      locationId: "11000000-0000-4000-8000-000000000004",
      workstationCode: "质量检验台",
      deviceId: "WEB-DEVELOPMENT",
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(InspectWorkOrderOutputDto, {
      ...valid,
      decision: "waived",
      measuredTemperature: "8.555",
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["decision", "measuredTemperature"]),
    );
  });
});
