import { describe, expect, it } from "vitest";
import type { FactoryRoomSnapshot } from "./room-monitoring";
import { getRoomEnvironmentProfile } from "./room-environment";

function room(id: string, temperature: string, humidity: string): FactoryRoomSnapshot {
  return {
    id,
    name: id,
    status: id === "R14" ? "warning" : "normal",
    progress: 0,
    temperature,
    humidity,
    owner: "测试负责人",
    equipment: "测试设备",
    primaryMetric: "environment",
    mapMetric: `${temperature} · ${humidity}`,
    updatedAt: "刚刚",
  };
}

describe("room environment profiles", () => {
  it("provides deterministic 24-hour and 7-day history for monitored cold rooms", () => {
    for (const snapshot of [room("R11", "2.8°C", "46%RH"), room("R12", "-18.2°C", "42%RH"), room("R14", "4.8°C", "54%RH")]) {
      const profile = getRoomEnvironmentProfile(snapshot);
      expect(profile.history["24h"]).toHaveLength(12);
      expect(profile.history["7d"]).toHaveLength(7);
      expect(profile.history["24h"].at(-1)?.temperature).toBe(Number.parseFloat(snapshot.temperature));
      expect(profile.history["24h"].at(-1)?.humidity).toBe(Number.parseFloat(snapshot.humidity));
    }
  });

  it("keeps the cold-storage thresholds and active alert aligned with the current reading", () => {
    const profile = getRoomEnvironmentProfile(room("R14", "4.8°C", "54%RH"));
    expect(profile.temperatureRange).toEqual([0, 4]);
    expect(profile.anomalies[0]).toMatchObject({ metric: "temperature", status: "active", reading: "4.8°C" });
  });

  it("uses a negative temperature band for the freezer", () => {
    const profile = getRoomEnvironmentProfile(room("R12", "-18.2°C", "42%RH"));
    expect(profile.temperatureRange).toEqual([-22, -16]);
    expect(profile.anomalies.some((item) => item.status === "resolved")).toBe(true);
  });
});
