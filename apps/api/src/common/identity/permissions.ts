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

export const noraRoles = [
  "nora_sales_operator",
  "nora_order_approver",
  "nora_recipe_manager",
  "nora_planner",
  "nora_inventory_operator",
  "nora_production_operator",
  "nora_production_supervisor",
  "nora_quality_inspector",
  "nora_admin",
] as const;

export type NoraRole = (typeof noraRoles)[number];

const rolePermissions: Record<NoraRole, readonly NoraPermission[]> = {
  nora_sales_operator: ["orders:write"],
  nora_order_approver: ["orders:approve"],
  nora_recipe_manager: ["recipes:write"],
  nora_planner: ["planning:write"],
  nora_inventory_operator: ["inventory:write"],
  nora_production_operator: ["execution:operate"],
  nora_production_supervisor: ["execution:operate", "execution:supervise"],
  nora_quality_inspector: ["quality:inspect"],
  nora_admin: noraPermissions,
};

const knownRoles = new Set<string>(noraRoles);

export function recognizedNoraRoles(roles: Iterable<string>) {
  return [...new Set([...roles].filter((role): role is NoraRole => knownRoles.has(role)))].sort();
}

export function permissionsForRoles(roles: Iterable<NoraRole>) {
  const granted = new Set<NoraPermission>();
  for (const role of roles) {
    for (const permission of rolePermissions[role]) granted.add(permission);
  }
  return noraPermissions.filter((permission) => granted.has(permission));
}
