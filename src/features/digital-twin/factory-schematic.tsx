"use client";

import { ChartNoAxesCombined } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { ZoneStatus } from "@/lib/types";
import { CAD_MAP_HEIGHT, CAD_MAP_WIDTH, CAD_ROOM_GEOMETRIES, type CadRoomGeometry } from "./factory-geometry";
import type { FactoryRoomSnapshot } from "./room-monitoring";

const ROOM_STATUS_COLORS: Record<ZoneStatus, { solid: string; stroke: string; fill: string }> = {
  normal: { solid: "#08a879", stroke: "#35b995", fill: "#dff7ef" },
  running: { solid: "#1768f2", stroke: "#4384f5", fill: "#e7f0ff" },
  waiting: { solid: "#f59e0b", stroke: "#f5ad36", fill: "#fff3d8" },
  warning: { solid: "#e68700", stroke: "#f0a11f", fill: "#fff0cf" },
  critical: { solid: "#e5484d", stroke: "#ec6468", fill: "#ffe7e8" },
  offline: { solid: "#7d899e", stroke: "#9aa6b8", fill: "#eef1f5" },
};

const SHOWROOM_STATUS_COLORS: Record<ZoneStatus, { solid: string; stroke: string; fill: string }> = {
  normal: { solid: "#43ba8b", stroke: "#3f8f78", fill: "#102b2b" },
  running: { solid: "#4c8dff", stroke: "#528cdf", fill: "#10284a" },
  waiting: { solid: "#d7a04e", stroke: "#a97d3e", fill: "#342817" },
  warning: { solid: "#d7a04e", stroke: "#c28d3e", fill: "#392a17" },
  critical: { solid: "#e2666a", stroke: "#c35c61", fill: "#3b1e28" },
  offline: { solid: "#718099", stroke: "#52647d", fill: "#172130" },
};

export type FactorySchematicVariant = "admin" | "showroom";

function RoomMask({ room, live, selected, focused, variant, onSelect, onMonitor, onOpenRoom }: {
  room: CadRoomGeometry;
  live?: FactoryRoomSnapshot;
  selected: boolean;
  focused: boolean;
  variant: FactorySchematicVariant;
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
  const showroom = variant === "showroom";
  const colors = (showroom ? SHOWROOM_STATUS_COLORS : ROOM_STATUS_COLORS)[live?.status ?? "normal"];

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
          fill={selected ? colors.solid : showroom ? "#0c1a2b" : "#ffffff"}
          fillOpacity={showroom ? ".94" : ".98"}
          stroke={selected ? colors.solid : colors.stroke}
          strokeWidth=".8"
        />
        <circle cx={centerX - labelWidth / 2 + 7} cy={labelTop + 7} r={2.7} fill={selected ? "#ffffff" : colors.solid} />
        <text x={centerX + 2} y={labelTop + 9} textAnchor="middle" fill={selected ? "#eaf2ff" : showroom ? "#8ba2bf" : "#6d7f99"} fontSize={compact ? 6 : 6.6} fontWeight="700">{room.id}</text>
        <text x={centerX} y={labelTop + 18} textAnchor="middle" fill={selected ? "#ffffff" : showroom ? "#d8e4f3" : "#24476f"} fontSize={compact ? 6.7 : 8.1} fontWeight="700">
          {room.labelLines.map((line, index) => <tspan key={line} x={centerX} dy={index === 0 ? 0 : lineHeight}>{line}</tspan>)}
        </text>
        {showMetric ? <text x={centerX} y={labelTop + 19 + room.labelLines.length * lineHeight + 7} textAnchor="middle" fill={selected ? "#eef5ff" : showroom ? "#8fa5be" : "#708099"} fontSize="6.8" fontWeight="600">{metric}</text> : null}
        <rect x={centerX - labelWidth / 2 + 1} y={monitorRowTop} width={labelWidth - 2} height="10" rx="2.5" fill={selected ? "rgba(255,255,255,.14)" : showroom ? "#13253a" : "#f1f5fb"} />
        <ChartNoAxesCombined x={centerX - (compact ? 4 : 12)} y={monitorRowTop + 2} width="7" height="7" color={selected ? "#ffffff" : colors.solid} strokeWidth={2.1} />
        {!compact ? <text x={centerX + 4} y={monitorRowTop + 7.4} textAnchor="middle" fill={selected ? "#ffffff" : showroom ? "#8198b5" : "#536b89"} fontSize="6.2" fontWeight="700">监控</text> : null}
      </g>
    </g>
  );
}

function ArchitecturalBase({ variant }: { variant: FactorySchematicVariant }) {
  const showroom = variant === "showroom";
  return (
    <g aria-hidden="true">
      <rect x="16" y="20" width="1090" height="392" rx="12" fill={showroom ? "#0d1c2c" : "#fbfdff"} fillOpacity={showroom ? ".96" : ".68"} />
      <image href="/cad/factory-plan.svg" x="0" y="0" width="1240" height="670" preserveAspectRatio="xMidYMid meet" mask="url(#factory-footprint-mask)" opacity={showroom ? ".72" : "1"} />
    </g>
  );
}

function focusTransform(room: CadRoomGeometry | undefined): string {
  if (!room) return "translate3d(0%, 0%, 0) scale(1)";
  const scale = Math.min(2.4, 900 / (room.width + 100), 380 / (room.height + 32));
  const centerX = room.x + room.width / 2;
  const centerY = room.y + room.height / 2;
  const translateX = 50 - (centerX / CAD_MAP_WIDTH) * scale * 100;
  const translateY = 50 - (centerY / CAD_MAP_HEIGHT) * scale * 100;
  return `translate3d(${translateX.toFixed(3)}%, ${translateY.toFixed(3)}%, 0) scale(${scale.toFixed(3)})`;
}

export function FactorySchematic({ rooms, selectedId, focusedId, showRooms, variant = "admin", showBatchFlow = false, batchProgress = 0, onSelect, onMonitorRoom, onOpenRoom }: {
  rooms: FactoryRoomSnapshot[];
  selectedId: string;
  focusedId: string | null;
  showRooms: boolean;
  variant?: FactorySchematicVariant;
  showBatchFlow?: boolean;
  batchProgress?: number;
  onSelect: (id: string) => void;
  onMonitorRoom: (id: string) => void;
  onOpenRoom: (id: string) => void;
}) {
  const roomDataById = new Map(rooms.map((room) => [room.id, room]));
  const focusedRoom = focusedId ? CAD_ROOM_GEOMETRIES.find((room) => room.id === focusedId) : undefined;

  return (
    <div
      className="factory-map-compositor"
      style={{ transform: focusTransform(focusedRoom) }}
    >
      <svg
        viewBox={variant === "showroom" ? "130 35 986 385" : "0 0 1116 430"}
        className="block h-auto w-full min-w-[900px]"
        role="img"
        aria-label={`${variant === "showroom" ? "净配菜" : "呆大厨"}工厂 CAD 房间状态图`}
        data-variant={variant}
      >
        <defs>
          <pattern id="blueprint-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 18 0 L 0 0 0 18" fill="none" stroke={variant === "showroom" ? "#29405a" : "#dfe7f0"} strokeWidth=".65" /></pattern>
          <mask id="factory-footprint-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1116" height="430">
            <rect width="1116" height="430" fill="#fff" />
            <path d="M 140 342.59 H 222.68 V 408.62 H 326 V 430 H 140 Z" fill="#000" />
          </mask>
        </defs>

        <rect width="1116" height="430" rx="14" fill={variant === "showroom" ? "#07111f" : "#f6f9fd"} />
        <rect x="16" y="20" width="1090" height="392" rx="12" fill="url(#blueprint-grid)" opacity=".72" />
        <ArchitecturalBase variant={variant} />
        {showRooms ? CAD_ROOM_GEOMETRIES.map((room) => (
          <RoomMask
            key={room.id}
            room={room}
            live={roomDataById.get(room.id)}
            selected={room.id === selectedId}
            focused={Boolean(focusedId)}
            variant={variant}
            onSelect={() => onSelect(room.id)}
            onMonitor={() => onMonitorRoom(room.id)}
            onOpenRoom={() => onOpenRoom(room.id)}
          />
        )) : null}
        {showBatchFlow ? (
          <g aria-label="演示批次 DEMO-PL-028 正沿生产路线移动">
            <path className="factory-batch-route" d="M185 198 L222 198 L222 174 L287 174 L287 147 L287 174 L397 174 L397 145 L397 174 L883 174 L883 202 L883 174 L883 147 L883 174 L1043 174 L1043 289 L1043 348" />
            <circle
              className="factory-batch-pulse"
              cx="0"
              cy="0"
              r="6"
              style={{ offsetDistance: `${Math.max(0, Math.min(1, batchProgress)) * 100}%` }}
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}
