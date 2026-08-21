import { UnauthorizedException } from "@nestjs/common";
import { currentPrincipal } from "./identity/identity-context.js";

export type NoraRuntimeMode = "demo" | "development" | "production";

export function getNoraRuntimeMode(value = process.env.NORA_MODE): NoraRuntimeMode {
  if (value === "demo" || value === "development" || value === "production") return value;
  return "development";
}

export function resolveAuditActor(actor?: string, mode = getNoraRuntimeMode()) {
  if (mode === "production") {
    const principal = currentPrincipal();
    if (!principal) throw new UnauthorizedException("生产环境缺少受信任身份，已拒绝写操作");
    return principal.displayName;
  }
  const normalized = actor?.trim();
  if (normalized) return normalized;
  if (mode === "demo") return "演示用户";
  return "开发环境用户";
}
