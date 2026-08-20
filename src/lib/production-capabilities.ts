const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const readOnlyEntityDetailRoutes = [
  new RegExp(`^/orders/${uuid}$`, "i"),
  new RegExp(`^/customers/${uuid}$`, "i"),
  new RegExp(`^/catalog/boms/${uuid}$`, "i"),
];

const developmentEntityMutationRoutes = [
  new RegExp(`^/orders/${uuid}/edit$`, "i"),
  new RegExp(`^/orders/${uuid}/review$`, "i"),
];

const productionReadRoutes = new Set([
  "/orders",
  "/customers",
  "/catalog/products",
  "/catalog/boms",
  "/production/plans",
  "/production/work-orders",
  "/inventory/stock",
]);

const developmentWriteRoutes = new Set(["/orders/new", "/orders/approvals"]);

function isHelpRoute(pathname: string) {
  return pathname === "/help" || pathname.startsWith("/help/");
}

/**
 * Routes safe to expose in non-demo modes: API-backed reads plus static help.
 * Mutation-only and demo-only subroutes must be listed explicitly rather than
 * inheriting support from a broad path prefix.
 */
export function isProductionSupportedPath(pathname: string) {
  return isHelpRoute(pathname)
    || productionReadRoutes.has(pathname)
    || readOnlyEntityDetailRoutes.some((pattern) => pattern.test(pathname));
}

/** Development may expose API-backed writes that production still blocks until
 * real identity and permission enforcement are connected. */
export function isDevelopmentSupportedPath(pathname: string) {
  return isProductionSupportedPath(pathname)
    || developmentWriteRoutes.has(pathname)
    || developmentEntityMutationRoutes.some((pattern) => pattern.test(pathname));
}
