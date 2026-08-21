export const noraPermissions = [
  "orders:write",
  "orders:approve",
  "recipes:write",
  "planning:write",
  "inventory:write",
  "execution:operate",
  "execution:supervise",
  "quality:inspect",
] as const;

export type NoraPermission = (typeof noraPermissions)[number];

export interface NoraIdentity {
  subject: string;
  displayName: string;
  username: string;
  organizationId: string;
  roles: string[];
  permissions: NoraPermission[];
  source: "oidc" | "development" | "demo";
}

export function identityCan(identity: NoraIdentity | null, permission: NoraPermission) {
  return identity?.permissions.includes(permission) ?? false;
}

export const localDevelopmentIdentity: NoraIdentity = {
  subject: "development-user",
  displayName: "开发环境用户",
  username: "developer",
  organizationId: "00000000-0000-4000-8000-000000000001",
  roles: ["nora_admin"],
  permissions: [...noraPermissions],
  source: "development",
};

export const localDemoIdentity: NoraIdentity = {
  ...localDevelopmentIdentity,
  subject: "demo-user",
  displayName: "演示用户",
  username: "demo",
  source: "demo",
};
