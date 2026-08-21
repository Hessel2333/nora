import type { NoraRuntimeMode } from "./runtime-mode";

const storageKey = "nora-device-id:v1";
let sessionDeviceId: string | undefined;

function newDeviceId() {
  return `WEB-${crypto.randomUUID()}`;
}

export function currentWebDeviceId(mode: NoraRuntimeMode) {
  if (mode === "demo") return "DEMO-DEVICE";
  if (mode === "development") return "WEB-DEVELOPMENT";
  if (typeof window === "undefined") throw new Error("生产设备标识只能在浏览器中取得");
  try {
    const stored = window.localStorage.getItem(storageKey)?.trim();
    if (stored?.startsWith("WEB-") && stored.length <= 120) return stored;
    const created = newDeviceId();
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    sessionDeviceId ??= newDeviceId();
    return sessionDeviceId;
  }
}
