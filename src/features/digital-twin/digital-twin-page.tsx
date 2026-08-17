"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Box, CalendarDays, CheckCircle2, Eye, EyeOff, Focus, Gauge, Layers3, Map, Maximize2, Minimize2, Minus, PackageCheck, Plus, RefreshCw, RotateCcw, Waves } from "lucide-react";
import { useNoraStore } from "@/lib/store";
import { cn, workOrderStatus } from "@/lib/utils";
import type { StatusTone, TwinZone } from "@/lib/types";
import { Badge, Button, Card, IconBox, MetricCard, PageHeader, Progress, SectionTitle } from "@/components/ui";
import { FactorySchematic } from "./factory-schematic";
import type { FactoryModel3DHandle } from "./factory-model-3d";
import { RoomCameraDialog } from "./room-camera-dialog";
import { RoomDetailPanel } from "./room-detail-panel";
import { RoomMonitorDialog } from "./room-monitor-dialog";
import { buildFactoryRoomSnapshots, roomIdForZone } from "./room-monitoring";

const FactoryModel3D = dynamic(() => import("./factory-model-3d").then((module) => module.FactoryModel3D), {
  ssr: false,
  loading: () => <div className="grid h-[510px] place-items-center bg-[#f7f9fc] text-xs font-medium text-[#7d899e]">正在生成三维工厂模型…</div>,
});

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
  const model3DRef = useRef<FactoryModel3DHandle>(null);
  const [lastRefresh, setLastRefresh] = useState("08:47:32");
  const [activeView, setActiveView] = useState<"overview" | "production" | "environment">("overview");
  const [showRooms, setShowRooms] = useState(true);
  const [mapMode, setMapMode] = useState<"2d" | "3d">("2d");
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
  const visibleRooms = useMemo(() => {
    if (activeView === "production") return rooms.filter((room) => room.primaryMetric === "task" || room.primaryMetric === "fulfillment");
    if (activeView === "environment") return rooms.filter((room) => room.primaryMetric === "environment" || Boolean(room.alert));
    return rooms;
  }, [activeView, rooms]);

  const metricCards = activeView === "production" ? [
    { label: "今日产量", value: "12,568", suffix: "份", icon: PackageCheck, tone: "info" as StatusTone, change: "较昨日 ↑ 12.6%" },
    { label: "计划完成率", value: `${averageProgress}%`, icon: Gauge, tone: "success" as StatusTone, change: "较昨日 ↑ 8.3%" },
    { label: "在制任务", value: String(runningCount + 14), suffix: "个", icon: CalendarDays, tone: "danger" as StatusTone, change: "较昨日 ↓ 2 个" },
    { label: "设备综合效率", value: "82.4%", icon: Activity, tone: "success" as StatusTone, change: "较昨日 ↑ 3.1%" },
  ] : activeView === "environment" ? [
    { label: "温控在线率", value: "99.2%", icon: Gauge, tone: "success" as StatusTone, change: "15 个区域在线" },
    { label: "临界温区", value: "1", suffix: "处", icon: Waves, tone: "warning" as StatusTone, change: "R14 接近上限" },
    { label: "环境告警", value: "2", suffix: "条", icon: AlertTriangle, tone: "danger" as StatusTone, change: "1 条待复核" },
    { label: "能耗强度", value: "1.26", suffix: "kWh/kg", icon: Activity, tone: "info" as StatusTone, change: "较昨日 ↓ 4.7%" },
  ] : [
    { label: "今日产量", value: "12,568", suffix: "份", icon: PackageCheck, tone: "info" as StatusTone, change: "较昨日 ↑ 12.6%" },
    { label: "计划完成率", value: `${averageProgress}%`, icon: Gauge, tone: "success" as StatusTone, change: "较昨日 ↑ 8.3%" },
    { label: "在制任务", value: String(runningCount + 14), suffix: "个", icon: CalendarDays, tone: "danger" as StatusTone, change: "较昨日 ↓ 2 个" },
    { label: "设备综合效率", value: "82.4%", icon: Activity, tone: "success" as StatusTone, change: "较昨日 ↑ 3.1%" },
    { label: "能耗强度", value: "1.26", suffix: "kWh/kg", icon: Waves, tone: "warning" as StatusTone, change: "较昨日 ↓ 4.7%" },
    { label: "异常告警", value: "5", suffix: "条", icon: AlertTriangle, tone: "danger" as StatusTone, change: "较昨日 ↑ 2 条" },
  ];

  const switchView = (view: "overview" | "production" | "environment") => {
    setActiveView(view);
    setFocusedRoomId(null);
    if (view === "production") setSelectedRoomId("R02");
    if (view === "environment") setSelectedRoomId("R14");
  };

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

  const zoomMap = (direction: "in" | "out") => {
    if (mapMode === "3d") {
      if (direction === "in") model3DRef.current?.zoomIn();
      else model3DRef.current?.zoomOut();
      return;
    }
    setZoom((value) => direction === "in"
      ? Math.min(1.8, Number((value + 0.2).toFixed(1)))
      : Math.max(0.8, Number((value - 0.2).toFixed(1))));
  };

  const resetMap = () => {
    setZoom(1);
    setFocusedRoomId(null);
    model3DRef.current?.reset();
  };

  const enterFullscreen = async () => {
    if (mapRef.current?.requestFullscreen) await mapRef.current.requestFullscreen();
  };

  return <>
    <PageHeader title="数字孪生 / 呆大厨工厂" actions={<><Button variant="secondary" size="sm" onClick={enterFullscreen}><Maximize2 size={15} />全屏</Button><Button variant="secondary" size="sm" onClick={() => setLastRefresh(new Date().toLocaleTimeString("zh-CN", { hour12: false }))}><RefreshCw size={15} />刷新 {lastRefresh}</Button></>} />
    <div className="mb-3 flex gap-1 border-b border-[#e3e8ef] text-sm">{([{ id: "overview", label: "工厂总览" }, { id: "production", label: "生产监控" }, { id: "environment", label: "环境监控" }] as const).map((view) => <button key={view.id} aria-pressed={activeView === view.id} onClick={() => switchView(view.id)} className={cn("focus-ring relative rounded-t-[10px] px-3 pb-3 pt-1 font-medium transition", activeView === view.id ? "text-[#0a68dc] after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#0a68dc]" : "text-[#667085] hover:bg-[#f0f3f7] hover:text-[#344054]")}>{view.label}</button>)}</div>
    <div className={cn("horizontal-snap -mx-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0", metricCards.length > 4 ? "xl:grid-cols-6" : "xl:grid-cols-4")}>
      {metricCards.map((metric) => <MetricCard key={metric.label} compact label={metric.label} value={metric.value} suffix={metric.suffix} icon={metric.icon} tone={metric.tone} change={metric.change} />)}
    </div>

    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <div className="order-3 grid gap-3 xl:col-span-2 xl:grid-cols-2 2xl:order-1 2xl:col-span-1 2xl:block 2xl:space-y-3">
        <Card><SectionTitle title="任务与工单" action={<Link href="/production/work-orders" className="text-xs font-medium text-[#1768f2]">查看全部</Link>} /><div className="grid grid-cols-3 gap-2 p-3">{[{ label: "运行中", value: 16, tone: "info" as StatusTone }, { label: "待开始", value: 6, tone: "warning" as StatusTone }, { label: "即将到期", value: 3, tone: "danger" as StatusTone }].map((item) => <div key={item.label} className="rounded-xl bg-[#f7f9fc] p-2 text-center"><strong className="block text-lg text-[#23314d]">{item.value}</strong><span className="text-[10px] text-[#7f8a9e]">{item.label}</span></div>)}</div><div className="divide-y divide-[#edf0f4] px-3 pb-2">{workOrders.slice(0, 3).map((item) => <button key={item.id} onClick={() => selectZone(item.zoneId)} className="w-full py-3 text-left"><div className="flex items-center justify-between"><span className="text-[11px] font-medium text-[#42506d]">{item.code}</span><Badge tone={workOrderStatus[item.status].tone}>{item.progress}%</Badge></div><Progress value={item.progress} className="mt-2" /></button>)}</div></Card>
        <Card><SectionTitle title={activeView === "environment" ? "重点环境区域" : activeView === "production" ? "生产区域状态" : "房间实时状态"} /><div className="nora-scrollbar max-h-[326px] overflow-y-auto p-2">{visibleRooms.map((room) => <button key={room.id} onClick={() => { selectRoom(room.id); setFocusedRoomId(null); }} className={cn("focus-ring flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left", selectedRoomId === room.id ? "bg-[#edf4ff]" : "hover:bg-[#f6f8fb]")}><span className={cn("h-2 w-2 shrink-0 rounded-full", room.status === "normal" ? "bg-[#08a879]" : room.status === "running" ? "bg-[#1768f2]" : room.status === "critical" ? "bg-[#e5484d]" : room.status === "offline" ? "bg-[#8b96a8]" : "bg-[#f59e0b]")} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-[#4f5e78]">{room.name}</span><span className="mt-0.5 block truncate text-[10px] text-[#667085]">{room.id}</span></span><span className="max-w-[92px] truncate text-[10px] font-medium text-[#667085]">{room.mapMetric}</span></button>)}</div></Card>
      </div>

      <Card ref={mapRef} className="order-1 min-w-0 overflow-hidden bg-white 2xl:order-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-[#44526c]">{activeView === "production" ? "生产区域监控" : activeView === "environment" ? "温湿度环境监控" : "工厂房间总览"}</span>
            <span className="text-[10px] text-[#7b879b]">17 个 CAD 分区 · 15 个业务区域</span>
            <Badge tone="info">{focusedRoomId ? `聚焦 · ${selectedRoom.name}` : `当前 ${selectedRoom.name}`}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center rounded-lg border border-[#dfe6ef] bg-[#f7f9fc] p-0.5" role="group" aria-label="地图显示模式">
              <button type="button" aria-pressed={mapMode === "2d"} onClick={() => { setMapMode("2d"); setFocusedRoomId(null); }} className={cn("focus-ring flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition", mapMode === "2d" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d] hover:text-[#34425e]")}><Map size={13} />2D</button>
              <button type="button" aria-pressed={mapMode === "3d"} onClick={() => { setMapMode("3d"); setFocusedRoomId(null); }} className={cn("focus-ring flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition", mapMode === "3d" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d] hover:text-[#34425e]")}><Box size={13} />3D</button>
            </div>
            <Button variant="ghost" size="sm" aria-label={showRooms ? "隐藏房间遮罩" : "显示房间遮罩"} onClick={() => setShowRooms((value) => !value)}>{showRooms ? <Eye size={15} /> : <EyeOff size={15} />}</Button>
            <Button variant={focusedRoomId ? "secondary" : "ghost"} size="sm" aria-label={focusedRoomId ? "返回工厂总览" : "聚焦当前房间"} onClick={toggleSelectedRoomFocus}>{focusedRoomId ? <Minimize2 size={15} /> : <Focus size={15} />}<span className="hidden xl:inline">{focusedRoomId ? "返回总览" : "聚焦房间"}</span></Button>
            <Button variant="ghost" size="sm" aria-label="缩小地图" disabled={Boolean(focusedRoomId)} onClick={() => zoomMap("out")}><Minus size={15} /></Button>
            <span className="w-10 text-center text-[10px] font-semibold text-[#68758d]">{focusedRoomId ? "聚焦" : mapMode === "3d" ? "3D" : `${Math.round(zoom * 100)}%`}</span>
            <Button variant="ghost" size="sm" aria-label="放大地图" disabled={Boolean(focusedRoomId)} onClick={() => zoomMap("in")}><Plus size={15} /></Button>
            <Button variant="ghost" size="sm" aria-label="重置地图" onClick={resetMap}><RotateCcw size={15} /></Button>
            <Button variant="ghost" size="sm" aria-label="切换房间遮罩" onClick={() => setShowRooms((value) => !value)}><Layers3 size={15} /></Button>
          </div>
        </div>
        {mapMode === "2d" ? <div className={cn("nora-scrollbar bg-white p-1.5 sm:p-2.5", focusedRoomId ? "overflow-hidden" : "overflow-auto")}>
          <div className="mx-auto min-w-[900px]" style={{ width: `${focusedRoomId ? 100 : zoom * 100}%` }}>
            <FactorySchematic rooms={rooms} selectedId={selectedRoomId} focusedId={focusedRoomId} showRooms={showRooms} onSelect={selectRoom} onMonitorRoom={openRoomCamera} onOpenRoom={openRoomMonitor} />
          </div>
        </div> : <FactoryModel3D ref={model3DRef} rooms={rooms} selectedId={selectedRoomId} focusedId={focusedRoomId} showRooms={showRooms} onSelect={selectRoom} onOpenRoom={openRoomMonitor} />}
        <div className="border-t border-[#e8edf3] p-3">
          {activeView === "environment" ? <>
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[#34425e]">环境监测重点</p><p className="mt-0.5 text-[10px] text-[#667085]">冷藏、冷冻与临界温区</p></div><Badge tone="warning">1 处需复核</Badge></div>
            <div className="horizontal-snap flex gap-2 overflow-x-auto pb-1">{visibleRooms.map((room) => <button key={room.id} onClick={() => selectRoom(room.id)} className={cn("focus-ring min-w-[160px] rounded-xl border px-3 py-2.5 text-left", selectedRoom.id === room.id ? "border-[#0a68dc] bg-[#edf4ff]" : "border-[#e3e8f0] bg-white hover:bg-[#fafcff]")}><span className="block text-[11px] font-semibold text-[#34425f]">{room.name}</span><span className={cn("mt-1 block text-[10px]", room.alert ? "text-[#c77800]" : "text-[#667085]")}>{room.temperature} · {room.humidity}</span></button>)}</div>
          </> : <>
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold text-[#34425e]">蔬菜批次流转路径</p><p className="mt-0.5 text-[10px] text-[#667085]">PK202607140018 · 从收货到发货</p></div><Badge tone="info">实时联动</Badge></div>
            <div className="horizontal-snap flex min-w-0 items-center gap-2 overflow-x-auto pb-1">{route.map((zone, index) => <div key={zone.id} className="flex min-w-fit items-center gap-2"><button onClick={() => selectZone(zone.id)} className={cn("focus-ring min-w-[112px] rounded-xl border px-3 py-2 text-left", selectedRoom.zoneId === zone.id ? "border-[#0a68dc] bg-[#edf4ff]" : "border-[#e3e8f0] bg-white hover:bg-[#fafcff]")}><span className="block text-[11px] font-medium text-[#34425f]">{zone.shortName}</span><span className={cn("mt-1 block text-[10px]", zone.status === "running" ? "text-[#0a68dc]" : zone.status === "warning" ? "text-[#c77800]" : "text-[#667085]")}>{zone.status === "normal" ? "已完成" : zone.status === "running" ? `进行中 ${zone.progress}%` : zone.status === "warning" ? "温控关注" : "待开始"}</span></button>{index < route.length - 1 ? <span className="text-[#98a2b3]">→</span> : null}</div>)}</div>
          </>}
        </div>
      </Card>

      <div className="order-2 2xl:order-3"><RoomDetailPanel room={selectedRoom} focused={focusedRoomId === selectedRoom.id} onToggleFocus={toggleSelectedRoomFocus} onOpenMonitor={() => openRoomMonitor(selectedRoom.id)} onOpenCamera={() => openRoomCamera(selectedRoom.id)} /></div>
    </div>

    <Card className="mt-3"><SectionTitle title="异常与告警" action={<Badge tone="danger">{activities.length}</Badge>} /><div className="grid divide-y divide-[#edf0f4] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">{activities.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 p-4"><IconBox icon={item.tone === "danger" ? AlertTriangle : CheckCircle2} tone={item.tone} size="sm" /><div><p className="text-xs font-semibold text-[#34425f]">{item.title}</p><p className="mt-1 text-[11px] text-[#7f8a9e]">{item.detail}</p><span className="mt-1 block text-[10px] text-[#a0a9b8]">今天 {item.time}</span></div></div>)}</div></Card>
    <RoomCameraDialog key={`camera-${cameraRoom.id}`} room={cameraRoom} open={Boolean(cameraRoomId)} onOpenChange={(nextOpen) => { if (!nextOpen) setCameraRoomId(null); }} />
    <RoomMonitorDialog key={`monitor-${monitorRoom.id}`} room={monitorRoom} open={Boolean(monitorRoomId)} onOpenChange={(nextOpen) => { if (!nextOpen) setMonitorRoomId(null); }} />
  </>;
}
