import { describe, expect, it } from "vitest";
import { isDevelopmentSupportedPath, isProductionSupportedPath } from "./production-capabilities";

describe("production capability routes", () => {
  it.each([
    "/orders",
    "/orders/550e8400-e29b-41d4-a716-446655440000",
    "/customers",
    "/customers/550e8400-e29b-41d4-a716-446655440000",
    "/catalog/products",
    "/catalog/boms",
    "/catalog/boms/550e8400-e29b-41d4-a716-446655440000",
    "/production/plans",
    "/production/work-orders",
    "/help",
    "/help/order-and-demand/production-demand",
  ])("allows production-safe read route %s", (pathname) => {
    expect(isProductionSupportedPath(pathname)).toBe(true);
  });

  it.each([
    "/orders/new",
    "/orders/import",
    "/orders/reconciliation",
    "/orders/approvals",
    "/orders/550e8400-e29b-41d4-a716-446655440000/edit",
    "/orders/550e8400-e29b-41d4-a716-446655440000/review",
    "/catalog/settings",
  ])("blocks unfinished or mutation route %s", (pathname) => {
    expect(isProductionSupportedPath(pathname)).toBe(false);
  });

  it.each([
    "/orders/new",
    "/orders/approvals",
    "/orders/550e8400-e29b-41d4-a716-446655440000/edit",
    "/orders/550e8400-e29b-41d4-a716-446655440000/review",
  ])("allows API-backed order mutation route only in development: %s", (pathname) => {
    expect(isDevelopmentSupportedPath(pathname)).toBe(true);
    expect(isProductionSupportedPath(pathname)).toBe(false);
  });
});
