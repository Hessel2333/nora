export interface CadPoint {
  x: number;
  y: number;
}

interface CadRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CadRoomGeometry {
  id: string;
  name: string;
  labelLines: string[];
  points: CadPoint[];
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
}

export const CAD_MAP_WIDTH = 1116;
export const CAD_MAP_HEIGHT = 430;

function room(id: string, name: string, points: CadPoint[], labelLines: string[] = [name]): CadRoomGeometry {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);

  return {
    id,
    name,
    labelLines,
    points,
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ") + " Z",
  };
}

function rectangularRoom(id: string, name: string, rect: CadRect, labelLines?: string[]) {
  return room(id, name, [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ], labelLines);
}

// The room faces remain in the same coordinate system as factory-plan.svg.
// These values are the shared source of truth for both the 2D mask and 3D model.
export const CAD_ROOM_GEOMETRIES: CadRoomGeometry[] = [
  rectangularRoom("R01", "蔬菜前处理加工", { left: 222.68, right: 359.82, top: 201.58, bottom: 405.78 }, ["蔬菜前处理", "加工"]),
  rectangularRoom("R02", "蔬菜切配间", { left: 361.75, right: 526.7, top: 201.58, bottom: 405.78 }),
  room("R03+R06", "蔬菜内包装间", [
    { x: 528.64, y: 201.58 },
    { x: 660.94, y: 201.58 },
    { x: 660.94, y: 275.35 },
    { x: 687.54, y: 275.35 },
    { x: 687.54, y: 405.78 },
    { x: 528.64, y: 405.78 },
  ]),
  rectangularRoom("R04", "第二更衣室", { left: 663.11, right: 716.08, top: 201.58, bottom: 273.18 }, ["第二", "更衣室"]),
  room("R05+R07", "肉类内包装间", [
    { x: 718.02, y: 201.58 },
    { x: 795.41, y: 201.58 },
    { x: 795.41, y: 405.78 },
    { x: 689.48, y: 405.78 },
    { x: 689.48, y: 275.35 },
    { x: 718.02, y: 275.35 },
  ]),
  rectangularRoom("R08", "综合外包间", { left: 797.35, right: 969.07, top: 201.58, bottom: 405.78 }),
  rectangularRoom("R09", "肉类切配间", { left: 222.68, right: 351.59, top: 56.71, bottom: 146.68 }),
  rectangularRoom("R10", "配料间", { left: 353.77, right: 441.33, top: 56.71, bottom: 144.5 }),
  rectangularRoom("R11", "冷藏库", { left: 445.2, right: 589.83, top: 58.88, bottom: 142.57 }),
  rectangularRoom("R12", "冷冻库", { left: 593.94, right: 728.42, top: 58.88, bottom: 142.57 }),
  rectangularRoom("R13", "包材库", { left: 732.53, right: 795.41, top: 56.71, bottom: 146.68 }),
  rectangularRoom("R14", "0–4°C冷藏库", { left: 799.28, right: 967.14, top: 59.66, bottom: 146.68 }, ["0–4°C", "冷藏库"]),
  rectangularRoom("R15", "肉类前处理加工", { left: 151.09, right: 220.5, top: 57.67, bottom: 340.41 }, ["肉类前处理", "加工"]),
  rectangularRoom("R20", "楼梯间", { left: 982.84, right: 1103.14, top: 55.61, bottom: 288.93 }),
  rectangularRoom("R21", "发货缓冲区", { left: 982.84, right: 1103.14, top: 288.93, bottom: 407.81 }, ["发货", "缓冲区"]),
];

export function cadPointToWorld(point: CadPoint, scale = 0.04) {
  return {
    x: (point.x - CAD_MAP_WIDTH / 2) * scale,
    z: (point.y - CAD_MAP_HEIGHT / 2) * scale,
  };
}
