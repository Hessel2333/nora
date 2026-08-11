"use client";

import { ChartNoAxesCombined } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ZoneStatus } from "@/lib/types";
import type { FactoryRoomSnapshot } from "./room-monitoring";

interface SvgPoint {
  x: number;
  y: number;
}

interface SvgRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface CadRoomMask {
  id: string;
  name: string;
  labelLines: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  path: string;
}

const MAP_WIDTH = 1116;
const MAP_HEIGHT = 430;

const ROOM_STATUS_COLORS: Record<ZoneStatus, { solid: string; stroke: string; fill: string }> = {
  normal: { solid: "#08a879", stroke: "#35b995", fill: "#dff7ef" },
  running: { solid: "#1768f2", stroke: "#4384f5", fill: "#e7f0ff" },
  waiting: { solid: "#f59e0b", stroke: "#f5ad36", fill: "#fff3d8" },
  warning: { solid: "#e68700", stroke: "#f0a11f", fill: "#fff0cf" },
  critical: { solid: "#e5484d", stroke: "#ec6468", fill: "#ffe7e8" },
  offline: { solid: "#7d899e", stroke: "#9aa6b8", fill: "#eef1f5" },
};

function cadRoom(id: string, name: string, points: SvgPoint[], labelLines: string[] = [name]): CadRoomMask {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    id,
    name,
    labelLines,
    x,
    y,
    width: Math.max(...xs) - x,
    height: Math.max(...ys) - y,
    path: points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ") + " Z",
  };
}

function cadRectRoom(id: string, name: string, rect: SvgRect, labelLines?: string[]): CadRoomMask {
  return cadRoom(id, name, [
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ], labelLines);
}

// Geometry-only calibration set. Each coordinate is a wall-face coordinate
// read from the generated CAD vector layer, not a previous business-zone box.
// IDs deliberately carry no business meaning until the rooms are confirmed.
const CAD_ROOM_MASKS: CadRoomMask[] = [
  cadRectRoom("R01", "蔬菜前处理加工", { left: 222.68, right: 359.82, top: 201.58, bottom: 405.78 }, ["蔬菜前处理", "加工"]),
  cadRectRoom("R02", "蔬菜切配间", { left: 361.75, right: 526.7, top: 201.58, bottom: 405.78 }),
  cadRoom("R03+R06", "蔬菜内包装间", [
    { x: 528.64, y: 201.58 },
    { x: 660.94, y: 201.58 },
    { x: 660.94, y: 275.35 },
    { x: 687.54, y: 275.35 },
    { x: 687.54, y: 405.78 },
    { x: 528.64, y: 405.78 },
  ]),
  cadRectRoom("R04", "第二更衣室", { left: 663.11, right: 716.08, top: 201.58, bottom: 273.18 }, ["第二", "更衣室"]),
  cadRoom("R05+R07", "肉类内包装间", [
    { x: 718.02, y: 201.58 },
    { x: 795.41, y: 201.58 },
    { x: 795.41, y: 405.78 },
    { x: 689.48, y: 405.78 },
    { x: 689.48, y: 275.35 },
    { x: 718.02, y: 275.35 },
  ]),
  cadRectRoom("R08", "综合外包间", { left: 797.35, right: 969.07, top: 201.58, bottom: 405.78 }),
  cadRectRoom("R09", "肉类切配间", { left: 222.68, right: 351.59, top: 56.71, bottom: 146.68 }),
  cadRectRoom("R10", "配料间", { left: 353.77, right: 441.33, top: 56.71, bottom: 144.5 }),
  cadRectRoom("R11", "冷藏库", { left: 445.2, right: 589.83, top: 58.88, bottom: 142.57 }),
  cadRectRoom("R12", "冷冻库", { left: 593.94, right: 728.42, top: 58.88, bottom: 142.57 }),
  cadRectRoom("R13", "包材库", { left: 732.53, right: 795.41, top: 56.71, bottom: 146.68 }),
  cadRectRoom("R14", "0–4°C冷藏库", { left: 799.28, right: 967.14, top: 59.66, bottom: 146.68 }, ["0–4°C", "冷藏库"]),
  cadRectRoom("R15", "肉类前处理加工", { left: 151.09, right: 220.5, top: 57.67, bottom: 340.41 }, ["肉类前处理", "加工"]),
  cadRectRoom("R20", "楼梯间", { left: 982.84, right: 1103.14, top: 55.61, bottom: 288.93 }),
  cadRectRoom("R21", "发货缓冲区", { left: 982.84, right: 1103.14, top: 288.93, bottom: 407.81 }, ["发货", "缓冲区"]),
];

function RoomMask({ room, live, selected, focused, onSelect, onMonitor, onOpenRoom }: {
  room: CadRoomMask;
  live?: FactoryRoomSnapshot;
  selected: boolean;
  focused: boolean;
  onSelect: () => void;
  onMonitor: () => void;
  onOpenRoom: () => void;
}) {
  const centerX = room.x + room.width / 2;
  const centerY = room.y + room.height / 2;
  const compact = room.width < 64 || room.height < 68;
  const showMetric = Boolean(live) && !compact && room.width >= 80;
  const metric = live?.mapMetric ?? "";
  const longestLabel = Math.max(room.id.length, ...room.labelLines.map((line) => line.length), showMetric ? metric.length : 0);
  const labelWidth = Math.min(Math.max(compact ? 42 : 64, longestLabel * (compact ? 6.4 : 6.8) + 18), Math.max(38, room.width - 8));
  const lineHeight = compact ? 8 : 9.5;
  const labelHeight = 28 + room.labelLines.length * lineHeight + (showMetric ? 11 : 0);
  const labelTop = centerY - labelHeight / 2;
  const monitorRowTop = labelTop + labelHeight - 11;
  const labelCornerRadius = compact ? 3 : 4;
  const colors = ROOM_STATUS_COLORS[live?.status ?? "normal"];

  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpenRoom();
    }
    if (event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return (
    <g opacity={focused && !selected ? .16 : 1}>
      <g
        role="button"
        tabIndex={0}
        aria-label={`${room.id}，${room.name}${live ? `，${live.mapMetric}` : ""}`}
        aria-pressed={selected}
        onClick={onSelect}
        onDoubleClick={(event) => {
          event.stopPropagation();
          onOpenRoom();
        }}
        onKeyDown={onKeyDown}
        className="cursor-pointer outline-none"
      >
        <path
          d={room.path}
          fill={colors.fill}
          fillOpacity={selected ? .54 : .26}
          stroke={selected ? colors.solid : colors.stroke}
          strokeOpacity={selected ? 1 : .78}
          strokeWidth={selected ? 2.4 : 1.15}
          strokeDasharray={selected ? "7 5" : "3 5"}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
      <g
        role="button"
        tabIndex={0}
        aria-label={`打开 ${room.id} ${room.name}摄像头监控`}
        onClick={(event) => {
          event.stopPropagation();
          onMonitor();
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onMonitor();
          }
        }}
        className="cursor-pointer outline-none"
      >
        <rect
          x={centerX - labelWidth / 2}
          y={labelTop}
          width={labelWidth}
          height={labelHeight}
          rx={labelCornerRadius}
          fill={selected ? colors.solid : "#ffffff"}
          fillOpacity=".98"
          stroke={selected ? colors.solid : colors.stroke}
          strokeWidth=".8"
        />
        <circle cx={centerX - labelWidth / 2 + 7} cy={labelTop + 7} r={2.7} fill={selected ? "#ffffff" : colors.solid} />
        <text x={centerX + 2} y={labelTop + 9} textAnchor="middle" fill={selected ? "#eaf2ff" : "#6d7f99"} fontSize={compact ? 6 : 6.6} fontWeight="700">{room.id}</text>
        <text x={centerX} y={labelTop + 18} textAnchor="middle" fill={selected ? "#ffffff" : "#24476f"} fontSize={compact ? 6.7 : 8.1} fontWeight="700">
          {room.labelLines.map((line, index) => <tspan key={line} x={centerX} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>)}
        </text>
        {showMetric ? <text x={centerX} y={labelTop + 19 + room.labelLines.length * lineHeight + 7} textAnchor="middle" fill={selected ? "#eef5ff" : "#708099"} fontSize="6.8" fontWeight="600">{metric}</text> : null}
        <rect x={centerX - labelWidth / 2 + 1} y={monitorRowTop} width={labelWidth - 2} height="10" rx="2.5" fill={selected ? "rgba(255,255,255,.14)" : "#f1f5fb"} />
        <ChartNoAxesCombined x={centerX - (compact ? 4 : 12)} y={monitorRowTop + 2} width="7" height="7" color={selected ? "#ffffff" : colors.solid} strokeWidth={2.1} />
        {!compact ? <text x={centerX + 4} y={monitorRowTop + 7.4} textAnchor="middle" fill={selected ? "#ffffff" : "#536b89"} fontSize="6.2" fontWeight="700">监控</text> : null}
      </g>
    </g>
  );
}

function ArchitecturalBase() {
  return (
    <g aria-hidden="true">
      <rect x="16" y="20" width="1090" height="392" rx="12" fill="#fbfdff" fillOpacity=".68" />
      <image href="/cad/factory-plan.svg" x="0" y="0" width="1240" height="670" preserveAspectRatio="xMidYMid meet" mask="url(#factory-footprint-mask)" />
    </g>
  );
}

function focusTransform(room: CadRoomMask | undefined): string {
  if (!room) return "translate3d(0%, 0%, 0) scale(1)";
  const scale = Math.min(2.4, 900 / (room.width + 100), 380 / (room.height + 32));
  const centerX = room.x + room.width / 2;
  const centerY = room.y + room.height / 2;
  const translateX = 50 - (centerX / MAP_WIDTH) * scale * 100;
  const translateY = 50 - (centerY / MAP_HEIGHT) * scale * 100;
  return `translate3d(${translateX.toFixed(3)}%, ${translateY.toFixed(3)}%, 0) scale(${scale.toFixed(3)})`;
}

export function FactorySchematic({ rooms, selectedId, focusedId, showRooms, onSelect, onMonitorRoom, onOpenRoom }: {
  rooms: FactoryRoomSnapshot[];
  selectedId: string;
  focusedId: string | null;
  showRooms: boolean;
  onSelect: (id: string) => void;
  onMonitorRoom: (id: string) => void;
  onOpenRoom: (id: string) => void;
}) {
  const roomDataById = new Map(rooms.map((room) => [room.id, room]));
  const focusedRoom = focusedId ? CAD_ROOM_MASKS.find((room) => room.id === focusedId) : undefined;

  return (
    <div
      className="factory-map-compositor"
      style={{ transform: focusTransform(focusedRoom) }}
    >
      <svg viewBox="0 0 1116 430" className="block h-auto w-full min-w-[900px]" role="img" aria-label="呆大厨工厂 CAD 房间状态图">
        <defs>
          <pattern id="blueprint-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke="#dfe7f0" strokeWidth=".65" /></pattern>
          <mask id="factory-footprint-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1116" height="430">
            <rect width="1116" height="430" fill="#fff" />
            <path d="M 140 342.59 H 222.68 V 408.62 H 326 V 430 H 140 Z" fill="#000" />
          </mask>
        </defs>

        <rect width="1116" height="430" rx="14" fill="#f6f9fd" />
        <rect x="16" y="20" width="1090" height="392" rx="12" fill="url(#blueprint-grid)" opacity=".72" />
        <ArchitecturalBase />
        {showRooms ? CAD_ROOM_MASKS.map((room) => (
          <RoomMask
            key={room.id}
            room={room}
            live={roomDataById.get(room.id)}
            selected={room.id === selectedId}
            focused={Boolean(focusedId)}
            onSelect={() => onSelect(room.id)}
            onMonitor={() => onMonitorRoom(room.id)}
            onOpenRoom={() => onOpenRoom(room.id)}
          />
        )) : null}
      </svg>
    </div>
  );
}
