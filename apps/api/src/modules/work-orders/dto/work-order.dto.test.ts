import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { describe, expect, it } from "vitest";
import { RecoverWorkOrderDto, WorkOrderReasonCommandDto } from "./work-order.dto.js";

const command = {
  revision: 1,
  workstationCode: "肉类前处理间",
  deviceId: "WEB-DEVELOPMENT",
  actor: "开发环境用户",
  reason: "问题已处理",
};

describe("work order command DTO", () => {
  it("accepts a complete audited recovery command", async () => {
    const errors = await validate(plainToInstance(RecoverWorkOrderDto, { ...command, targetStatus: "running" }));
    expect(errors).toHaveLength(0);
  });

  it("rejects missing reasons and unsupported recovery targets", async () => {
    const reasonErrors = await validate(plainToInstance(WorkOrderReasonCommandDto, { ...command, reason: "" }));
    const targetErrors = await validate(plainToInstance(RecoverWorkOrderDto, { ...command, targetStatus: "completed" }));
    expect(reasonErrors.some((error) => error.property === "reason")).toBe(true);
    expect(targetErrors.some((error) => error.property === "targetStatus")).toBe(true);
  });
});
