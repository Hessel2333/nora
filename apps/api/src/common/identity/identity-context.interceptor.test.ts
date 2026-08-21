import { firstValueFrom, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { currentPrincipal, type NoraPrincipal } from "./identity-context.js";
import { IdentityContextInterceptor } from "./identity-context.interceptor.js";

const principal: NoraPrincipal = {
  subject: "user-1",
  displayName: "真实审核员",
  username: "reviewer",
  organizationId: "00000000-0000-4000-8000-000000000001",
  roles: ["nora_order_approver"],
  permissions: ["orders:approve"],
  source: "oidc",
};

describe("identity context interceptor", () => {
  it("keeps the verified principal available while the controller observable executes", async () => {
    const interceptor = new IdentityContextInterceptor();
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ principal }) }),
    } as never;
    const next = {
      handle: () => of(currentPrincipal()?.displayName),
    } as never;

    await expect(firstValueFrom(interceptor.intercept(context, next))).resolves.toBe("真实审核员");
    expect(currentPrincipal()).toBeUndefined();
  });
});
