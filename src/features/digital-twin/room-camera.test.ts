import { describe, expect, it } from "vitest";
import { buildFactoryRoomSnapshots } from "./room-monitoring";
import { getRoomCameraFeeds } from "./room-camera";

describe("room camera feeds", () => {
  const rooms = buildFactoryRoomSnapshots([], []);

  it("maps a room to a stable camera identity and demo poster", () => {
    const room = rooms.find((item) => item.id === "R02");
    expect(room).toBeDefined();
    const [camera] = getRoomCameraFeeds(room!);
    expect(camera.id).toBe("CAM-R02-01");
    expect(camera.name).toBe("切配操作区主机位");
    expect(camera.poster).toBe("/camera/vegetable-room-demo.png");
    expect(camera.streamUrl).toBeUndefined();
  });

  it("normalizes combined room ids for camera codes", () => {
    const room = rooms.find((item) => item.id === "R03+R06");
    expect(room).toBeDefined();
    expect(getRoomCameraFeeds(room!)[0].id).toBe("CAM-R03-R06-01");
  });
});
