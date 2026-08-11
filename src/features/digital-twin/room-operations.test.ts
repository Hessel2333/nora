import { describe, expect, it } from "vitest";
import { twinZones, workOrders } from "../../lib/mock-data";
import { buildFactoryRoomSnapshots } from "./room-monitoring";
import { getRoomOperationsProfile } from "./room-operations";

describe("room-specific operational monitoring", () => {
  const rooms = buildFactoryRoomSnapshots(twinZones, workOrders);

  it("uses task progress for production rooms", () => {
    const room = rooms.find((item) => item.id === "R02")!;
    const profile = getRoomOperationsProfile(room);
    expect(profile.kind).toBe("task");
    expect(profile.metrics[0]).toMatchObject({ label: "任务进度", value: "72%" });
    expect(profile.chart?.actual.at(-1)).toBe(72);
  });

  it("uses stock metrics for the packaging-material warehouse", () => {
    const room = rooms.find((item) => item.id === "R13")!;
    const profile = getRoomOperationsProfile(room);
    expect(profile.kind).toBe("inventory");
    expect(profile.viewLabel).toBe("库存监控");
    expect(profile.metrics[0]).toMatchObject({ label: "库存占用率", value: "68%" });
  });

  it("uses fulfillment metrics for the dispatch buffer", () => {
    const room = rooms.find((item) => item.id === "R21")!;
    const profile = getRoomOperationsProfile(room);
    expect(profile.kind).toBe("fulfillment");
    expect(profile.metrics[0]).toMatchObject({ label: "订单齐套率", value: "70%" });
    expect(profile.events.some((event) => event.title === "计划装车发运")).toBe(true);
  });
});
