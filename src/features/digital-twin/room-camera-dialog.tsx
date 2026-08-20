"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CircleDot, Download, Expand, HardDrive, RefreshCw, Video, Wifi, X } from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { Badge, Button, IconBox } from "@/components/ui";
import { cn } from "@/lib/utils";
import { getRoomCameraFeeds } from "./room-camera";
import type { FactoryRoomSnapshot } from "./room-monitoring";

function formatCameraTime(date: Date) {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function RoomCameraDialog({ room, open, onOpenChange }: {
  room: FactoryRoomSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cameras = useMemo(() => getRoomCameraFeeds(room), [room]);
  const [activeCameraId, setActiveCameraId] = useState(cameras[0].id);
  const [clock, setClock] = useState("--");
  const [reconnecting, setReconnecting] = useState(false);
  const [snapshotSaved, setSnapshotSaved] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const activeCamera = cameras.find((camera) => camera.id === activeCameraId) ?? cameras[0];
  const isDemo = !activeCamera.streamUrl;

  useEffect(() => {
    const updateClock = () => setClock(formatCameraTime(new Date()));
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const reconnect = () => {
    setReconnecting(true);
    window.setTimeout(() => setReconnecting(false), 650);
  };

  const saveSnapshot = () => {
    const link = document.createElement("a");
    link.href = activeCamera.poster;
    link.download = `${activeCamera.id}-${Date.now()}.png`;
    link.click();
    setSnapshotSaved(true);
    window.setTimeout(() => setSnapshotSaved(false), 1400);
  };

  const enterFullscreen = async () => {
    if (playerRef.current?.requestFullscreen) await playerRef.current.requestFullscreen();
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[#071120]/62 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-24px)] w-[min(1240px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-[0_28px_90px_rgba(7,17,32,.32)] focus:outline-none">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e6eaf1] px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold tracking-[0.09em] text-[#7d899e]">{room.id}</span>{isDemo ? <><Badge tone="warning"><CircleDot size={10} />演示画面</Badge><HelpTip title="视频说明">连接工厂摄像头后，此处将显示对应房间的实时画面。</HelpTip></> : <><Badge tone="success"><CircleDot size={10} />摄像头在线</Badge><Badge tone="info">实时画面</Badge></>}</div>
            <Dialog.Title className="truncate text-lg font-semibold tracking-[-0.02em] text-[#17213d] sm:text-xl">{room.name}视频监控</Dialog.Title>
            <Dialog.Description className="mt-1 text-xs text-[#7c889e]">查看房间摄像头画面与录像状态</Dialog.Description>
          </div>
          <Dialog.Close className="focus-ring rounded-lg p-2 text-[#74809a] hover:bg-[#f2f5f9]" aria-label="关闭视频监控"><X size={19} /></Dialog.Close>
        </header>

        <div className="nora-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f6f8fb] p-3 sm:p-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_286px]">
            <main className="min-w-0 overflow-hidden rounded-xl border border-[#172234] bg-[#07101d] shadow-sm">
              <div ref={playerRef} className="relative aspect-video overflow-hidden bg-[#07101d]" style={{ position: "relative" }}>
                {activeCamera.streamUrl ? <video key={activeCamera.streamUrl} className="h-full w-full object-cover" src={activeCamera.streamUrl} autoPlay muted playsInline /> : <Image src={activeCamera.poster} alt={`${room.name}${activeCamera.name}演示监控画面`} fill priority sizes="(min-width:1280px) 900px, 100vw" className={cn("object-cover", reconnecting && "opacity-70")} />}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 text-[11px] text-white sm:p-4">
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-[#07101d]/78 px-2 py-1 font-semibold backdrop-blur-sm"><span className={cn("h-2 w-2 rounded-full", isDemo ? "bg-[#f59e0b]" : "bg-[#ef4444]")} />{isDemo ? "画面" : "实时"}</span>
                  <span className="rounded-md bg-[#07101d]/78 px-2 py-1 font-medium backdrop-blur-sm">{activeCamera.id}</span>
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-[#030812]/78 to-transparent px-3 pb-3 pt-14 text-[11px] text-white sm:px-4 sm:pb-4">
                  <div><p className="font-mono font-semibold tracking-[0.04em]">{clock}</p><p className="mt-1 text-white/72">{room.name} · {activeCamera.name}</p></div>
                  <span className="rounded-md bg-black/45 px-2 py-1 font-semibold">{activeCamera.resolution} · {activeCamera.fps} FPS</span>
                </div>
                {reconnecting ? <div className="absolute inset-0 flex items-center justify-center bg-[#07101d]/34"><span className="inline-flex items-center gap-2 rounded-lg bg-[#07101d]/88 px-3 py-2 text-xs font-semibold text-white"><RefreshCw size={14} className="animate-spin" />正在重新连接</span></div> : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0b1524] px-3 py-3 sm:px-4">
                <div className="flex items-center gap-2 text-[11px] text-white/68"><CircleDot size={13} className={isDemo ? "text-[#f59e0b]" : "text-[#34d399]"} />{isDemo ? "画面已载入" : "视频已连接"}</div>
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="sm" className="border border-white/10 text-white hover:bg-white/10" onClick={reconnect}><RefreshCw size={14} />重连</Button>
                  <Button variant="ghost" size="sm" className="border border-white/10 text-white hover:bg-white/10" onClick={saveSnapshot}><Download size={14} />{snapshotSaved ? "已保存" : "抓拍"}</Button>
                  <Button variant="ghost" size="sm" className="border border-white/10 text-white hover:bg-white/10" onClick={enterFullscreen}><Expand size={14} />全屏</Button>
                </div>
              </div>
            </main>

            <aside className="space-y-3">
              <section className="rounded-xl border border-[#e1e6ee] bg-white p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-[#253451]">摄像头机位</h3><Badge tone={isDemo ? "warning" : "success"}>{cameras.length} 路</Badge></div>
                <div className="mt-3 space-y-2">{cameras.map((camera) => <button key={camera.id} type="button" onClick={() => setActiveCameraId(camera.id)} className={cn("focus-ring w-full rounded-xl border p-3 text-left", camera.id === activeCamera.id ? "border-[#6da1f7] bg-[#edf4ff]" : "border-[#e5e9f0] bg-white hover:bg-[#f8fafc]")}><div className="flex items-center gap-3"><IconBox icon={Camera} tone={camera.id === activeCamera.id ? "info" : "neutral"} size="sm" /><div className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#2d3b57]">{camera.name}</strong><span className="mt-1 block text-[10px] text-[#8691a4]">{camera.id}</span></div><span className="h-2 w-2 rounded-full bg-[#08a879]" /></div></button>)}</div>
              </section>

              <section className="rounded-xl border border-[#e1e6ee] bg-white p-4">
                <h3 className="text-sm font-semibold text-[#253451]">视频状态</h3>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3"><IconBox icon={Wifi} tone={isDemo ? "warning" : "success"} size="sm" /><div><span className="block text-[10px] text-[#8a95a7]">连接状态</span><strong className="text-xs text-[#34425e]">{isDemo ? "未连接" : "稳定 · 38 ms"}</strong></div></div>
                  <div className="flex items-center gap-3"><IconBox icon={Video} tone="info" size="sm" /><div><span className="block text-[10px] text-[#8a95a7]">录像状态</span><strong className="text-xs text-[#34425e]">{isDemo ? "无录像" : activeCamera.recording ? "连续录像中" : "未录像"}</strong></div></div>
                  <div className="flex items-center gap-3"><IconBox icon={HardDrive} tone="neutral" size="sm" /><div><span className="block text-[10px] text-[#8a95a7]">录像保留</span><strong className="text-xs text-[#34425e]">{isDemo ? "未接入存储" : `最近 ${activeCamera.retentionDays} 天`}</strong></div></div>
                </div>
              </section>

            </aside>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
