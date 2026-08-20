import { beforeEach, describe, expect, it } from "vitest";
import { orders as demoOrders } from "./mock-data";
import { NoraWriteUnavailableError } from "./runtime-mode";
import { useNoraStore } from "./store";

describe("production write boundary", () => {
  beforeEach(() => {
    useNoraStore.setState({
      mode: "production",
      backendStatus: "offline",
      backendError: "API unavailable",
      orders: [],
      activities: [],
    });
  });

  it("does not persist an order or success activity when the API is unavailable", async () => {
    const candidate = {
      ...structuredClone(demoOrders[0]),
      id: "offline-order",
      code: "OFFLINE-SHOULD-NOT-PERSIST",
    };

    await expect(useNoraStore.getState().addOrder(candidate)).rejects.toBeInstanceOf(
      NoraWriteUnavailableError,
    );

    expect(useNoraStore.getState().orders).toEqual([]);
    expect(useNoraStore.getState().activities).toEqual([]);
  });
});
