"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, CalendarDays, CheckCircle2, Eye, EyeOff, Focus, Gauge, Layers3, Maximize2, Minimize2, Minus, PackageCheck, Plus, RefreshCw, RotateCcw, Waves } from "lucide-react";
import { useNoraStore } from "@/lib/store";
import { cn, workOrderStatus } from "@/lib/utils";
import type { StatusTone, TwinZone } from "@/lib/types";
import { Badge, Button, Card, IconBox, MetricCard, PageHeader, Progress, SectionTitle } from "@/components/ui";
import { FactorySchematic } from "./factory-schematic";
import { RoomCameraDialog } from "./room-camera-dialog";
import { RoomDetailPanel } from "./room-detail-panel";
import { RoomMonitorDialog } from "./room-monitor-dialog";
import { buildFactoryRoomSnapshots, roomIdForZone } from "./room-monitoring";

export function DigitalTwinPage() {
  const storedZones = useNoraStore((state) => state.zones);
  const workOrders = useNoraStore((state) => state.workOrders);
  const activities = useNoraStore((state) => state.activities);
  const zones = useMemo(() => storedZones.map((zone) => {
    const task = workOrders.find((workOrder) => workOrder.zoneId === zone.id);
    if (!task) return zone;
    const status = task.status === "in_progress" ? "running" : task.status === "paused" || task.status === "released" ? "waiting" : zone.status;
    return { ...zone, status, progress: task.progress };
  }), [storedZones, workOrders]);
  const mapRef = useRef<HTMLDivElement>(null);
  const [lastRefresh, setLastRefresh] = useState("08:47:32");
  const [activeView, setActiveView] = useState<"overview" | "production" | "environment">("overview");
  const [showRooms, setShowRooms] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState("R02");
  const [focusedRoomId, setFocusedRoomId] = useState<string | null>(null);
  const [cameraRoomId, setCameraRoomId] = useState<string | null>(null);
  const [monitorRoomId, setMonitorRoomId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const rooms = useMemo(() => buildFactoryRoomSnapshots(zones, workOrders), [zones, workOrders]);
  const selectedRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0];
  const cameraRoom = rooms.find((room) => room.id === cameraRoomId) ?? selectedRoom;
  const monitorRoom = rooms.find((room) => room.id === monitorRoomId) ?? selectedRoom;
  const runningCount = zones.filter((zone) => zone.status === "running").length;
  const averageProgress = Math.round(workOrders.reduce((sum, item) => sum + item.progress, 0) / workOrders.length);
  const route = useMemo(() => ["vegetable-prep", "vegetable-cutting", "vegetable-packing", "outer-packing", "cold-chain", "dispatch"].map((id) => zones.find((zone) => zone.id === id)).filter(Boolean) as TwinZone[], [zones]);

  const selectRoom = (roomId: string) => {
    setSelectedRoomId(roomId);
  };

  const openRoomMonitor = (roomId: string) => {
    selectRoom(roomId);
    setMonitorRoomId(roomId);
  };

  const openRoomCamera = (roomId: string) => {
    selectRoom(roomId);
    setCameraRoomId(roomId);
  };

  const selectZone = (zoneId: string) => {
    const roomId = roomIdForZone(zoneId);
    if (roomId) setSelectedRoomId(roomId);
    setFocusedRoomId(null);
  };

  const toggleSelectedRoomFocus = () => {
    setFocusedRoomId((current) => current === selectedRoom.id ? null : selectedRoom.id);
  };

  const enterFullscreen = async () => {
    if (mapRef.current?.requestFullscreen) await mapRef.current.requestFullscreen();
  };

  return <>
    <PageHeader title="数字孪生 / 呆大厨工厂" description="实时查看生产区域、批次流转与环境状态" actions={<><Button variant="secondary" size="sm" onClick={enterFullscreen}><Maximize2 size={15} />全屏</Button><Button variant="secondary" size="sm" onClick={() => setLastRefresh(new Date().toLocaleTimeString("zh-CN", { hour12: false }))}><RefreshCw size={15} />刷新 {lastRefresh}</Button></>} />
    <div className="mb-3 flex gap-5 border-b border-[#e3e8ef] text-sm">{([{ id: "overview", label: "工厂总览" }, { id: "production", label: "生产监控" }, { id: "environment", label: "环境监控" }] as const).map((view) => <button key={view.id} onClick={() => setActiveView(view.id)} className={cn("focus-ring px-1 pb-3 font-medium", activeView === view.id ? "border-b-2 border-[#1768f2] font-semibold text-[#1768f2]" : "text-[#72809a] hover:text-[#3f4d68]")}>{view.label}</button>)}</div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <MetricCard label="今日产量" value="12,568" suffix="份" icon={PackageCheck} tone="info" change="较昨日 ↑ 12.6%" />
      <MetricCard label="计划完成率" value={`${averageProgress}%`} icon={Gauge} tone="success" change="较昨日 ↑ 8.3%" />
      <MetricCard label="在制任务" value={String(runningCount + 14)} suffix="个" icon={CalendarDays} tone="danger" change="较昨日 ↓ 2 个" />
      <MetricCard label="设备综合效率" value="82.4%" icon={Activity} tone="success" change="较昨日 ↑ 3.1%" />
      <MetricCard label="能耗强度" value="1.26" suffix="kWh/kg" icon={Waves} tone="warning" change="较昨日 ↓ 4.7%" />
      <MetricCard label="异常告警" value="5" suffix="条" icon={AlertTriangle} tone="danger" change="较昨日 ↑ 2 条" />
    </div>

    <div className="mt-3 grid gap-3 2xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <div className="space-y-3">
        <Card><SectionTitle title="任务与工单" action={<Link href="/production/work-orders" className="text-xs font-medium text-[#1768f2]">查看全部</Link>} /><div className="grid grid-cols-3 gap-2 p-3">{[{ label: "运行中", value: 16, tone: "info" as StatusTone }, { label: "待开始", value: 6, tone: "warning" as StatusTone }, { label: "即将到期", value: 3, tone: "danger" as StatusTone }].map((item) => <div key={item.label} className="rounded-xl bg-[#f7f9fc] p-2 text-center"><strong className="block text-lg text-[#23314d]">{item.value}</strong><span className="text-[10px] text-[#7f8a9e]">{item.label}</span></div>)}</div><div className="divide-y divide-[#edf0f4] px-3 pb-2">{workOrders.slice(0, 3).map((item) => <button key={item.id} onClick={() => selectZone(item.zoneId)} className="w-full py-3 text-left"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-[#42506d]">{item.code}</span><Badge tone={workOrderStatus[item.status].tone}>{item.progress}%</Badge></div><Progress value={item.progress} className="mt-2" /></button>)}</div></Card>
        <Card><SectionTitle title="房间实时状态" description="选择房间查看主指标与详情" /><div className="nora-scrollbar max-h-[326px] overflow-y-auto p-2">{rooms.map((room) => <button key={room.id} onClick={() => { selectRoom(room.id); setFocusedRoomId(null); }} className={cn("focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left", selectedRoomId === room.id ? "bg-[#edf4ff]" : "hover:bg-[#f6f8fb]")}><span className={cn("h-2 w-2 shrink-0 rounded-full", room.status === "normal" ? "bg-[#08a879]" : room.status === "running" ? "bg-[#1768f2]" : room.status === "critical" ? "bg-[#e5484d]" : room.status === "offline" ? "bg-[#8b96a8]" : "bg-[#f59e0b]")} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[#4f5e78]">{room.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#929daf]">{room.id}</span></span><span className="max-w-[86px] truncate text-[10px] font-medium text-[#71809a]">{room.mapMetric}</span></button>)}</div></Card>
      </div>

      <Card ref={mapRef} className="min-w-0 overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[#44526c]">工厂房间总览</span>
            <span className="text-[10px] text-[#7b879b]">17 个 CAD 分区 · 15 个业务区域</span>
            <Badge tone="info">{focusedRoomId ? `聚焦 · ${selectedRoom.name}` : `当前 ${selectedRoom.name}`}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm"><span className="font-semibold text-[#1768f2]">2D</span></Button>
            <Button variant="ghost" size="sm" aria-label={showRooms ? "隐藏房间遮罩" : "显示房间遮罩"} onClick={() => setShowRooms((value) => !value)}>{showRooms ? <Eye size={15} /> : <EyeOff size={15} />}</Button>
            <Button variant={focusedRoomId ? "secondary" : "ghost"} size="sm" aria-label={focusedRoomId ? "返回工厂总览" : "聚焦当前房间"} onClick={toggleSelectedRoomFocus}>{focusedRoomId ? <Minimize2 size={15} /> : <Focus size={15} />}<span className="hidden xl:inline">{focusedRoomId ? "返回总览" : "聚焦房间"}</span></Button>
            <Button variant="ghost" size="sm" aria-label="缩小地图" disabled={Boolean(focusedRoomId)} onClick={() => setZoom((value) => Math.max(0.8, Number((value - 0.2).toFixed(1))))}><Minus size={15} /></Button>
            <span className="w-10 text-center text-[10px] font-semibold text-[#68758d]">{focusedRoomId ? "聚焦" : `${Math.round(zoom * 100)}%`}</span>
            <Button variant="ghost" size="sm" aria-label="放大地图" disabled={Boolean(focusedRoomId)} onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.2).toFixed(1))))}><Plus size={15} /></Button>
            <Button variant="ghost" size="sm" aria-label="重置地图" onClick={() => { setZoom(1); setFocusedRoomId(null); }}><RotateCcw size={15} /></Button>
            <Button variant="ghost" size="sm" aria-label="切换房间遮罩" onClick={() => setShowRooms((value) => !value)}><Layers3 size={15} /></Button>
          </div>
        </div>
        <div className={cn("nora-scrollbar bg-white p-1.5 sm:p-2.5", focusedRoomId ? "overflow-hidden" : "overflow-auto")}>
          <div className="mx-auto min-w-[900px]" style={{ width: `${focusedRoomId ? 100 : zoom * 100}%` }}>
            <FactorySchematic rooms={rooms} selectedId={selectedRoomId} focusedId={focusedRoomId} showRooms={showRooms} onSelect={selectRoom} onMonitorRoom={openRoomCamera} onOpenRoom={openRoomMonitor} />
          </div>
        </div>
        <div className="border-t border-[#e8edf3] p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-[#34425e]">蔬菜批次流转路径</p><p className="mt-0.5 text-[10px] text-[#8a95a8]">PK202607140018 · 从收货到发货</p></div>
            <Badge tone="info">实时联动</Badge>
          </div>
          <div className="nora-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            {route.map((zone, index) => <div key={zone.id} className="flex min-w-fit items-center gap-2"><button onClick={() => selectZone(zone.id)} className={cn("focus-ring min-w-[112px] rounded-xl border px-3 py-2 text-left", selectedRoom.zoneId === zone.id ? "border-[#1768f2] bg-[#edf4ff]" : "border-[#e3e8f0] bg-white hover:bg-[#fafcff]")}><span className="block text-[11px] font-medium text-[#34425f]">{zone.shortName}</span><span className={cn("mt-1 block text-[10px]", zone.status === "running" ? "text-[#1768f2]" : zone.status === "warning" ? "text-[#d97706]" : "text-[#8792a5]")}>{zone.status === "normal" ? "已完成" : zone.status === "running" ? `进行中 ${zone.progress}%` : zone.status === "warning" ? "温控关注" : "待开始"}</span></button>{index < route.length - 1 ? <span className="text-[#a5afbf]">→</span> : null}</div>)}
          </div>
        </div>
      </Card>

      <RoomDetailPanel room={selectedRoom} focused={focusedRoomId === selectedRoom.id} onToggleFocus={toggleSelectedRoomFocus} onOpenMonitor={() => openRoomMonitor(selectedRoom.id)} />
    </div>

    <Card className="mt-3"><SectionTitle title="异常与告警" action={<Badge tone="danger">{activities.length}</Badge>} /><div className="grid divide-y divide-[#edf0f4] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">{activities.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 p-4"><IconBox icon={item.tone === "danger" ? AlertTriangle : CheckCircle2} tone={item.tone} size="sm" /><div><p className="text-xs font-semibold text-[#34425f]">{item.title}</p><p className="mt-1 text-[11px] text-[#7f8a9e]">{item.detail}</p><span className="mt-1 block text-[10px] text-[#a0a9b8]">今天 {item.time}</span></div></div>)}</div></Card>
    <RoomCameraDialog key={cameraRoom.id} room={cameraRoom} open={Boolean(cameraRoomId)} onOpenChange={(nextOpen) => { if (!nextOpen) setCameraRoomId(null); }} />
    <RoomMonitorDialog key={monitorRoom.id} room={monitorRoom} open={Boolean(monitorRoomId)} onOpenChange={(nextOpen) => { if (!nextOpen) setMonitorRoomId(null); }} />
  </>;
}
