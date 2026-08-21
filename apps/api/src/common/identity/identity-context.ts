import { AsyncLocalStorage } from "node:async_hooks";
import type { NoraPermission, NoraRole } from "./permissions.js";

export interface NoraPrincipal {
  subject: string;
  displayName: string;
  username: string;
  organizationId: string;
  roles: NoraRole[];
  permissions: NoraPermission[];
  source: "oidc" | "development" | "demo";
}

export const identityContext = new AsyncLocalStorage<NoraPrincipal>();

export function currentPrincipal() {
  return identityContext.getStore();
}
