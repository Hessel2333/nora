import { BadRequestException } from "@nestjs/common";

export type NoraRuntimeMode = "demo" | "development" | "production";

export function getNoraRuntimeMode(value = process.env.NORA_MODE): NoraRuntimeMode {
  if (value === "demo" || value === "development" || value === "production") return value;
  return "development";
}

export function resolveAuditActor(actor?: string, mode = getNoraRuntimeMode()) {
  if (mode === "production") {
    throw new BadRequestException("生产环境身份认证尚未接入，已拒绝写操作；不能信任客户端提供的操作者姓名");
  }
  const normalized = actor?.trim();
  if (normalized) return normalized;
  if (mode === "demo") return "演示用户";
  return "开发环境用户";
}
