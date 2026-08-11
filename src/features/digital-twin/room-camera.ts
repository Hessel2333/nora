import type { FactoryRoomSnapshot } from "./room-monitoring";

export interface RoomCameraFeed {
  id: string;
  name: string;
  status: "online" | "offline";
  streamUrl?: string;
  poster: string;
  resolution: string;
  fps: number;
  recording: boolean;
  retentionDays: number;
}

const CAMERA_NAMES: Record<string, string> = {
  R01: "前处理操作区主机位",
  R02: "切配操作区主机位",
  "R03+R06": "蔬菜内包主机位",
  R04: "更衣室出入口机位",
  "R05+R07": "肉类内包主机位",
  R08: "综合外包主机位",
  R09: "肉类切配主机位",
  R10: "配料操作区主机位",
  R11: "冷藏库入口机位",
  R12: "冷冻库入口机位",
  R13: "包材库通道机位",
  R14: "冷藏库主机位",
  R15: "肉类前处理主机位",
  R20: "楼梯通道机位",
  R21: "发货缓冲主机位",
};

export function getRoomCameraFeeds(room: FactoryRoomSnapshot): RoomCameraFeed[] {
  const normalizedId = room.id.replaceAll("+", "-");
  return [{
    id: `CAM-${normalizedId}-01`,
    name: CAMERA_NAMES[room.id] ?? `${room.name}主机位`,
    status: "online",
    poster: "/camera/vegetable-room-demo.png",
    resolution: "1920 × 1080",
    fps: 25,
    recording: true,
    retentionDays: 30,
  }];
}
