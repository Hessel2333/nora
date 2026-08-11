import { describe, expect, it } from "vitest";
import { twinZones, workOrders } from "../../lib/mock-data";
import { buildFactoryRoomSnapshots, roomIdForZone } from "./room-monitoring";

describe("factory room monitoring", () => {
  const rooms = buildFactoryRoomSnapshots(twinZones, workOrders);

  it("builds the 15 confirmed business rooms without removed CAD spaces", () => {
    expect(rooms).toHaveLength(15);
    expect(rooms.map((room) => room.id)).not.toEqual(
      expect.arrayContaining(["R16", "R17", "R18", "R19", "R22"]),
    );
  });

  it("binds a live work order to the vegetable cutting room", () => {
    const room = rooms.find((item) => item.id === "R02");

    expect(room).toMatchObject({
      name: "蔬菜切配间",
      status: "running",
      progress: 72,
      temperature: "12.6°C",
      humidity: "58%RH",
      mapMetric: "进行中 72%",
    });
    expect(room?.task).toMatchObject({
      code: "RW20260714-002",
      workOrderId: "wo-002",
      progress: 72,
    });
  });

  it("keeps room-type metrics aligned with their operational purpose", () => {
    expect(rooms.find((item) => item.id === "R04")).toMatchObject({
      primaryMetric: "occupancy",
      mapMetric: "当前 2 人",
    });
    expect(rooms.find((item) => item.id === "R14")).toMatchObject({
      primaryMetric: "environment",
      status: "warning",
      temperature: "4.8°C",
      humidity: "54%RH",
      mapMetric: "4.8°C · 54%RH",
      alert: { title: "温度接近上限", tone: "warning" },
    });
    expect(rooms.find((item) => item.id === "R13")).toMatchObject({
      primaryMetric: "inventory",
      mapMetric: "库存 68%",
    });
    expect(rooms.find((item) => item.id === "R21")).toMatchObject({
      primaryMetric: "fulfillment",
      mapMetric: "齐套 70%",
    });
  });

  it("maps production zones back to the confirmed CAD rooms", () => {
    expect(roomIdForZone("vegetable-cutting")).toBe("R02");
    expect(roomIdForZone("cold-chain")).toBe("R14");
    expect(roomIdForZone("unknown-zone")).toBeUndefined();
  });
});
