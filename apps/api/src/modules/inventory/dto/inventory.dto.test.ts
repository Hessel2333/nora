import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { CreateOpeningBalanceDto } from "./inventory.dto.js";

const validInput = {
  locationId: "10000000-0000-4000-8000-000000000001",
  productId: "20000000-0000-4000-8000-000000000001",
  lotCode: "OPEN-20260820-001",
  quantity: "12.500",
  unit: "kg",
  qualityStatus: "released",
  receivedAt: "2026-08-20T01:00:00.000Z",
};

describe("CreateOpeningBalanceDto", () => {
  it("accepts a positive-shape Decimal string with an explicit quality status", async () => {
    const errors = await validate(plainToInstance(CreateOpeningBalanceDto, validInput));
    expect(errors).toHaveLength(0);
  });

  it("rejects unsupported quality statuses and excess precision", async () => {
    const input = plainToInstance(CreateOpeningBalanceDto, {
      ...validInput,
      quantity: "12.5009",
      qualityStatus: "available",
    });
    const errors = await validate(input);
    expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(["quantity", "qualityStatus"]));
  });
});
