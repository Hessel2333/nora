export type NoraRuntimeMode = "demo" | "development" | "production";

export function getNoraRuntimeMode(value = process.env.NEXT_PUBLIC_NORA_MODE): NoraRuntimeMode {
  if (value === "demo" || value === "development" || value === "production") return value;
  return "development";
}

export class NoraWriteUnavailableError extends Error {
  constructor(action: string) {
    super(`${action}未保存：服务暂不可用，请稍后重试`);
    this.name = "NoraWriteUnavailableError";
  }
}

export function assertLocalDemoWrite(mode: NoraRuntimeMode, action: string) {
  if (mode !== "demo") throw new NoraWriteUnavailableError(action);
}

export function frontendAuditActor(mode: NoraRuntimeMode) {
  if (mode === "demo") return "演示用户";
  if (mode === "development") return "开发环境用户";
  return undefined;
}

export function runtimeLabel(mode: NoraRuntimeMode) {
  if (mode === "demo") return "演示模式";
  if (mode === "production") return "生产模式";
  return "开发环境";
}
