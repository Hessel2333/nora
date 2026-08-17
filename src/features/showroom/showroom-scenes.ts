import type { ShowroomSceneDefinition, ShowroomSceneId } from "./showroom-types";

export const SHOWROOM_SCENES: ShowroomSceneDefinition[] = [
  { id: "intro", label: "开场", durationMs: 6_000, transitionDurationMs: 1_200, enterAtMs: 900, highlightAtMs: 2_400, exitAtMs: 4_300 },
  { id: "forecast", label: "01 预测", durationMs: 10_000, transitionDurationMs: 1_200, enterAtMs: 900, highlightAtMs: 4_400, exitAtMs: 8_200 },
  { id: "order", label: "02 订单", durationMs: 10_000, transitionDurationMs: 1_300, enterAtMs: 850, highlightAtMs: 4_200, exitAtMs: 8_000 },
  { id: "bom", label: "03 数字菜谱", durationMs: 16_000, transitionDurationMs: 1_400, enterAtMs: 1_000, highlightAtMs: 6_800, exitAtMs: 13_400 },
  { id: "mrp", label: "04 MRP", durationMs: 13_000, transitionDurationMs: 1_300, enterAtMs: 900, highlightAtMs: 5_300, exitAtMs: 10_700 },
  { id: "production", label: "05 生产", durationMs: 16_000, transitionDurationMs: 1_400, enterAtMs: 1_000, highlightAtMs: 6_800, exitAtMs: 13_300 },
  { id: "traceability", label: "06 追溯", durationMs: 10_000, transitionDurationMs: 1_200, enterAtMs: 850, highlightAtMs: 4_200, exitAtMs: 8_100 },
  { id: "procurement", label: "07 采购", durationMs: 12_000, transitionDurationMs: 1_250, enterAtMs: 900, highlightAtMs: 4_900, exitAtMs: 9_900 },
  { id: "business", label: "08 经营", durationMs: 11_000, transitionDurationMs: 1_300, enterAtMs: 900, highlightAtMs: 4_600, exitAtMs: 8_900 },
  { id: "platform", label: "09 平台", durationMs: 8_000, transitionDurationMs: 1_300, enterAtMs: 900, highlightAtMs: 3_400, exitAtMs: 5_800 },
];

export const SHOWROOM_TOTAL_DURATION = SHOWROOM_SCENES.reduce((total, scene) => total + scene.durationMs, 0);

export function showroomSceneIndex(id: ShowroomSceneId) {
  return SHOWROOM_SCENES.findIndex((scene) => scene.id === id);
}
