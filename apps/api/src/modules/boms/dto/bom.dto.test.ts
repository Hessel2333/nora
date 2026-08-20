import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { BomOperationDto } from "./bom.dto.js";

describe("BomOperationDto", () => {
  it("accepts only the net-prep operation allowlist", async () => {
    const operation = plainToInstance(BomOperationDto, {
      code: "OP10",
      name: "未支持步骤",
      kind: "unsupported_final_process",
      sequence: 10,
    });

    const errors = await validate(operation);

    expect(errors.find((error) => error.property === "kind")?.constraints?.isEnum).toBeDefined();
  });
});
