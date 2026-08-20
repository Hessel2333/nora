import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useNoraStore } from "./store";

describe("development demo preview", () => {
  beforeEach(() => {
    useNoraStore.setState({
      runtimeMode: "development",
      mode: "development",
      demoPreview: false,
      backendStatus: "ready",
      products: [],
      boms: [],
      customers: [],
      orders: [],
      workOrders: [],
      zones: [],
      activities: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens isolated demo data for every page without changing the runtime boundary", async () => {
    await useNoraStore.getState().setDemoPreview(true);

    const state = useNoraStore.getState();
    expect(state.runtimeMode).toBe("development");
    expect(state.mode).toBe("demo");
    expect(state.demoPreview).toBe(true);
    expect(state.backendStatus).toBe("demo");
    expect(state.orders.length).toBeGreaterThan(0);
    expect(state.workOrders.length).toBeGreaterThan(0);
  });

  it("does not enable the preview inside production", async () => {
    useNoraStore.setState({ runtimeMode: "production", mode: "production" });

    await useNoraStore.getState().setDemoPreview(true);

    expect(useNoraStore.getState().mode).toBe("production");
    expect(useNoraStore.getState().demoPreview).toBe(false);
  });

  it("restores the preview after a reload without persisting demo business data", async () => {
    const session = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => session.set(key, value),
        removeItem: (key: string) => session.delete(key),
      },
    });

    await useNoraStore.getState().setDemoPreview(true);
    expect([...session.values()]).toEqual(["true"]);

    useNoraStore.setState({
      mode: "development",
      demoPreview: false,
      backendStatus: "idle",
      orders: [],
      workOrders: [],
    });
    await useNoraStore.getState().hydrateBackend();

    expect(useNoraStore.getState()).toEqual(expect.objectContaining({
      mode: "demo",
      demoPreview: true,
      backendStatus: "demo",
    }));
    expect(useNoraStore.getState().orders.length).toBeGreaterThan(0);
  });
});
