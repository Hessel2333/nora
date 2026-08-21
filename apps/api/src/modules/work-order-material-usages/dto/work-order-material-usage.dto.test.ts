import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { RecordWorkOrderMaterialUsageDto } from "./work-order-material-usage.dto.js";

describe("RecordWorkOrderMaterialUsageDto", () => {
  it("accepts a typed material usage and rejects unsupported disposition or precision", async () => {
    const valid = plainToInstance(RecordWorkOrderMaterialUsageDto, {
      stockBalanceId: "50000000-0000-4000-8000-000000000001",
      disposition: "consumed",
      quantity: "0.250",
      unit: "kg",
      workstationCode: "肉类前处理",
      deviceId: "WEB-DEVELOPMENT",
    });
    expect(await validate(valid)).toHaveLength(0);

    const invalid = plainToInstance(RecordWorkOrderMaterialUsageDto, {
      ...valid,
      disposition: "returned",
      quantity: "0.2501",
    });
    expect((await validate(invalid)).map((error) => error.property)).toEqual(
      expect.arrayContaining(["disposition", "quantity"]),
    );
  });
});
