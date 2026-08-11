"use client";

import * as Dialog from "@radix-ui/react-dialog";
import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Radio, ThermometerSun, UserRound, Waves, Wrench, X } from "lucide-react";
import { Badge, IconBox, Progress } from "@/components/ui";
import { cn, zoneStatus } from "@/lib/utils";
import type { EnvironmentAnomaly, EnvironmentRange } from "./room-environment";
import { getRoomEnvironmentProfile } from "./room-environment";
import type { FactoryRoomSnapshot } from "./room-monitoring";
import { getRoomOperationsProfile } from "./room-operations";
import { RoomOperationsView } from "./room-operations-view";

type MonitorView = "operations" | "environment";

const METRIC_LABELS = {
  temperature: "温度",
  humidity: "湿度",
} as const;

function AnomalyRow({ anomaly }: { anomaly: EnvironmentAnomaly }) {
  const active = anomaly.status === "active";

  return (
    <article className={cn("grid gap-3 rounded-xl border p-3 sm:grid-cols-[minmax(0,1fr)_auto]", active ? "border-[#f2cf8c] bg-[#fff9ec]" : "border-[#e4e9f1] bg-white")}>
      <div className="flex min-w-0 gap-3">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", active ? "bg-[#fff0cf] text-[#d98200]" : "bg-[#eef8f5] text-[#078663]")}>
          {active ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-xs text-[#2c3a57]">{METRIC_LABELS[anomaly.metric]} {anomaly.reading}</strong>
            <Badge tone={active ? "warning" : "success"}>{active ? "处理中" : "已恢复"}</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-5 text-[#758198]">{anomaly.note}</p>
        </div>
      </div>
      <div className="text-left text-[10px] leading-5 text-[#8a95a8] sm:text-right">
        <p>{anomaly.startedAt}{anomaly.endedAt ? ` – ${anomaly.endedAt}` : ""}</p>
        <p>{anomaly.threshold}</p>
      </div>
    </article>
  );
}

export function RoomMonitorDialog({ room, open, onOpenChange }: {
  room: FactoryRoomSnapshot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [range, setRange] = useState<EnvironmentRange>("24h");
  const [view, setView] = useState<MonitorView>(room.primaryMetric === "environment" ? "environment" : "operations");
  const profile = useMemo(() => getRoomEnvironmentProfile(room), [room]);
  const operationsProfile = useMemo(() => getRoomOperationsProfile(room), [room]);
  const status = zoneStatus[room.status];
  const points = profile.history[range];
  const currentTemperature = points.at(-1)?.temperature ?? Number.parseFloat(room.temperature);
  const temperatureAboveLimit = currentTemperature > profile.temperatureRange[1];
  const activeAnomaly = profile.anomalies.find((item) => item.status === "active");
  const insight = activeAnomaly
    ? `${METRIC_LABELS[activeAnomaly.metric]} ${activeAnomaly.reading}，已超过${activeAnomaly.threshold}`
    : "温湿度维持在设定范围内";
  const option = useMemo(() => ({
    animation: false,
    aria: { enabled: true },
    color: ["#1768f2", "#08a879"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,.98)",
      borderColor: "#dfe5ee",
      textStyle: { color: "#34425e", fontSize: 11 },
      valueFormatter: (value: number | string) => String(value),
    },
    legend: {
      right: 8,
      top: 0,
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: "#6f7d94", fontSize: 11 },
      data: ["温度 °C", "湿度 %RH"],
    },
    grid: { left: 46, right: 50, top: 42, bottom: 34 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: points.map((point) => point.label),
      axisLine: { lineStyle: { color: "#dfe5ed" } },
      axisTick: { show: false },
      axisLabel: { color: "#8490a4", fontSize: 10, interval: range === "24h" ? 1 : 0 },
    },
    yAxis: [
      {
        type: "value",
        name: "°C",
        min: (value: { min: number }) => Math.floor(Math.min(value.min - 1, profile.temperatureRange[0] - 1)),
        max: (value: { max: number }) => Math.ceil(Math.max(value.max + 1, profile.temperatureRange[1] + 1)),
        nameTextStyle: { color: "#8490a4", fontSize: 10 },
        axisLabel: { color: "#8490a4", fontSize: 10 },
        splitLine: { lineStyle: { color: "#edf1f5" } },
      },
      {
        type: "value",
        name: "%RH",
        min: 20,
        max: 80,
        nameTextStyle: { color: "#8490a4", fontSize: 10 },
        axisLabel: { color: "#8490a4", fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "温度 °C",
        type: "line",
        yAxisIndex: 0,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        data: points.map((point) => point.temperature),
        lineStyle: { width: 2.4 },
        areaStyle: { color: "rgba(23,104,242,.08)" },
        markArea: {
          silent: true,
          itemStyle: { color: "rgba(8,168,121,.055)" },
          data: [[{ yAxis: profile.temperatureRange[0] }, { yAxis: profile.temperatureRange[1] }]],
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: true, formatter: `上限 ${profile.temperatureRange[1]}°C`, color: temperatureAboveLimit ? "#c77800" : "#7c899e", fontSize: 10 },
          lineStyle: { color: temperatureAboveLimit ? "#f59e0b" : "#aab4c3", type: "dashed", width: 1 },
          data: [{ yAxis: profile.temperatureRange[1] }],
        },
      },
      {
        name: "湿度 %RH",
        type: "line",
        yAxisIndex: 1,
        smooth: 0.25,
        symbol: "circle",
        symbolSize: 5,
        showSymbol: false,
        data: points.map((point) => point.humidity),
        lineStyle: { width: 2, type: "dashed" },
      },
    ],
  }), [points, profile.temperatureRange, range, temperatureAboveLimit]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0d1833]/38 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-24px)] w-[min(1180px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-[0_24px_80px_rgba(28,52,91,.22)] focus:outline-none">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e7ebf2] px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.09em] text-[#7d899e]">{room.id}</span>
                <Badge tone={status.tone}>{status.label}</Badge>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#078663]"><Radio size={12} />实时监测</span>
              </div>
              <Dialog.Title className="truncate text-lg font-semibold tracking-[-0.02em] text-[#17213d] sm:text-xl">{room.name}运行详情</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-[#7c889e]">任务、环境、设备与异常记录</Dialog.Description>
            </div>
            <Dialog.Close className="focus-ring rounded-lg p-2 text-[#74809a] hover:bg-[#f2f5f9]" aria-label="关闭房间运行详情"><X size={19} /></Dialog.Close>
          </header>

          <div className="nora-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#f7f9fc] p-3 sm:p-4">
            <div className="grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
              <aside className="space-y-3">
                {room.alert ? (
                  <section className="flex gap-3 rounded-xl border border-[#f1cf8f] bg-[#fff8e8] p-3.5">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#d98200]" />
                    <div><h3 className="text-xs font-semibold text-[#965c00]">{room.alert.title}</h3><p className="mt-1 text-[11px] leading-5 text-[#927142]">{room.alert.detail}</p></div>
                  </section>
                ) : null}

                <section className="rounded-xl border border-[#e2e7ef] bg-white p-4">
                  <h3 className="text-xs font-semibold text-[#53617b]">当前任务</h3>
                  {room.task ? (
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#52617b]">{room.task.code}</span><Badge tone={room.task.tone}>{room.task.statusLabel}</Badge></div>
                      <p className="mt-2 text-sm font-semibold leading-5 text-[#283754]">{room.task.name}</p>
                      <Progress value={room.task.progress} tone={room.task.tone} className="mt-3" />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-[#7f8a9e]"><span>{room.task.quantity ?? "任务进度"}</span><strong className="text-[#35435f]">{room.task.progress}%</strong></div>
                      {room.task.eta ? <div className="mt-3 flex items-center gap-2 border-t border-[#edf0f4] pt-3 text-[11px] text-[#6f7d94]"><Clock3 size={14} className="text-[#1768f2]" /><span>预计完成</span><strong className="ml-auto text-[#34425e]">{room.task.eta}</strong></div> : null}
                    </div>
                  ) : <p className="mt-3 rounded-lg bg-[#f7f9fc] px-3 py-4 text-center text-xs text-[#8793a7]">当前暂无生产任务</p>}
                </section>

                <section className="rounded-xl border border-[#e2e7ef] bg-white p-4">
                  <h3 className="text-xs font-semibold text-[#53617b]">房间信息</h3>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-3"><IconBox icon={UserRound} tone="neutral" size="sm" /><div><span className="block text-[10px] text-[#8b96a8]">负责人</span><strong className="text-xs text-[#34425e]">{room.owner}</strong></div></div>
                    <div className="flex items-start gap-3"><IconBox icon={Wrench} tone="neutral" size="sm" /><div><span className="block text-[10px] text-[#8b96a8]">主要设备</span><strong className="text-xs leading-5 text-[#34425e]">{room.equipment}</strong></div></div>
                  </div>
                </section>

                <section className="rounded-xl border border-[#dfe9f7] bg-[#f4f8ff] p-4">
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-[#405274]">传感器 {profile.sensorName}</span><Badge tone="success">在线</Badge></div>
                  <p className="mt-2 text-[11px] text-[#75839a]">每 {profile.samplingInterval}采样 · 最近同步 {room.updatedAt}</p>
                </section>
              </aside>

              <main className="min-w-0 space-y-3">
                <div role="tablist" aria-label={`${room.name}监控视图`} className="inline-flex max-w-full rounded-xl border border-[#e1e7ef] bg-white p-1 shadow-sm">
                  <button type="button" role="tab" aria-selected={view === "operations"} onClick={() => setView("operations")} className={cn("focus-ring h-8 rounded-lg px-4 text-xs font-semibold transition-colors", view === "operations" ? "bg-[#1768f2] text-white shadow-sm" : "text-[#6d7990] hover:bg-[#f4f7fb] hover:text-[#34425e]")}>{operationsProfile.viewLabel}</button>
                  <button type="button" role="tab" aria-selected={view === "environment"} onClick={() => setView("environment")} className={cn("focus-ring h-8 rounded-lg px-4 text-xs font-semibold transition-colors", view === "environment" ? "bg-[#1768f2] text-white shadow-sm" : "text-[#6d7990] hover:bg-[#f4f7fb] hover:text-[#34425e]")}>环境监测</button>
                </div>

                {view === "operations" ? <RoomOperationsView room={room} /> : <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <section className={cn("rounded-xl border bg-white p-4", temperatureAboveLimit ? "border-[#f0cc87]" : "border-[#e2e7ef]")}>
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#748198]">当前温度</p><strong className={cn("mt-1 block text-2xl tracking-[-0.03em]", temperatureAboveLimit ? "text-[#c77800]" : "text-[#23314d]")}>{room.temperature}</strong></div><span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", temperatureAboveLimit ? "bg-[#fff3dc] text-[#e18b00]" : "bg-[#eaf2ff] text-[#1768f2]")}><ThermometerSun size={19} /></span></div>
                    <p className="mt-3 text-[10px] text-[#8793a7]">设定范围 {profile.temperatureRange[0]} 至 {profile.temperatureRange[1]}°C</p>
                  </section>
                  <section className="rounded-xl border border-[#e2e7ef] bg-white p-4">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-[#748198]">当前湿度</p><strong className="mt-1 block text-2xl tracking-[-0.03em] text-[#23314d]">{room.humidity}</strong></div><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f8f3] text-[#08a879]"><Waves size={19} /></span></div>
                    <p className="mt-3 text-[10px] text-[#8793a7]">设定范围 {profile.humidityRange[0]} 至 {profile.humidityRange[1]}%RH</p>
                  </section>
                </div>

                <section className="overflow-hidden rounded-xl border border-[#e2e7ef] bg-white">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#edf0f4] px-4 py-3">
                    <div><h3 className="text-sm font-semibold text-[#243250]">温湿度历史趋势</h3><p className={cn("mt-1 text-[11px]", activeAnomaly ? "font-medium text-[#c77800]" : "text-[#728099]")}>{insight}</p></div>
                    <div className="flex rounded-lg bg-[#f0f3f7] p-0.5" aria-label="选择历史范围">{(["24h", "7d"] as const).map((item) => <button key={item} type="button" aria-pressed={range === item} onClick={() => setRange(item)} className={cn("focus-ring h-7 rounded-md px-3 text-[11px] font-semibold", range === item ? "bg-white text-[#1768f2] shadow-sm" : "text-[#748198] hover:text-[#45536d]")}>{item === "24h" ? "24 小时" : "7 天"}</button>)}</div>
                  </div>
                  <div className="px-2 pb-2 pt-1 sm:px-3"><ReactECharts option={option} style={{ height: 285 }} notMerge lazyUpdate /></div>
                  <table className="sr-only"><caption>{room.name}{range === "24h" ? "24小时" : "7天"}温湿度历史</caption><thead><tr><th>时间</th><th>温度</th><th>湿度</th></tr></thead><tbody>{points.map((point) => <tr key={point.label}><td>{point.label}</td><td>{point.temperature}°C</td><td>{point.humidity}%RH</td></tr>)}</tbody></table>
                </section>

                <section className="rounded-xl border border-[#e2e7ef] bg-white p-4">
                  <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-[#243250]">异常记录</h3><p className="mt-1 text-[11px] text-[#7b879b]">近 7 天温湿度越限与处理结果</p></div><Badge tone={activeAnomaly ? "warning" : "success"}>{activeAnomaly ? "1 条处理中" : "当前无异常"}</Badge></div>
                  <div className="mt-3 space-y-2">{profile.anomalies.length > 0 ? profile.anomalies.map((anomaly) => <AnomalyRow key={anomaly.id} anomaly={anomaly} />) : <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f7faf9] px-4 py-8 text-xs text-[#6f827d]"><CheckCircle2 size={16} className="text-[#08a879]" />近 7 天未发生温湿度异常</div>}</div>
                </section>
                </>}
              </main>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
