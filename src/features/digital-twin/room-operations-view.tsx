"use client";

import ReactECharts from "echarts-for-react";
import { Activity, CheckCircle2, Clock3, Gauge, Package, Radio } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getRoomOperationsProfile } from "./room-operations";
import type { FactoryRoomSnapshot } from "./room-monitoring";

const METRIC_ICONS = [Gauge, Package, Clock3] as const;

const METRIC_TONES = {
  neutral: "bg-[#f0f3f7] text-[#68758d]",
  info: "bg-[#eaf2ff] text-[#1768f2]",
  success: "bg-[#e7f8f2] text-[#078663]",
  warning: "bg-[#fff3dc] text-[#d98200]",
  danger: "bg-[#ffebeb] text-[#dc3c3c]",
  purple: "bg-[#efedff] text-[#6554dd]",
} as const;

export function RoomOperationsView({ room }: { room: FactoryRoomSnapshot }) {
  const profile = useMemo(() => getRoomOperationsProfile(room), [room]);
  const chart = profile.chart;
  const eventsHeading = profile.kind === "inventory" ? "库存动态" : profile.kind === "fulfillment" ? "履约动态" : profile.kind === "environment" ? "巡检动态" : profile.kind === "occupancy" ? "现场动态" : "作业动态";
  const eventsDescription = profile.kind === "inventory" ? "入库、领用与补货记录" : profile.kind === "fulfillment" ? "复核、齐套与装车节点" : profile.kind === "environment" ? "设备、巡检与门禁记录" : profile.kind === "occupancy" ? "人员、消毒与通行记录" : "任务、设备与现场状态记录";
  const chartOption = useMemo(() => chart ? ({
    animation: false,
    aria: { enabled: true },
    color: ["#aab6c8", "#1768f2"],
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(255,255,255,.98)",
      borderColor: "#dfe5ee",
      textStyle: { color: "#34425e", fontSize: 11 },
    },
    legend: {
      right: 8,
      top: 0,
      itemWidth: 14,
      itemHeight: 3,
      textStyle: { color: "#6f7d94", fontSize: 11 },
      data: [chart.targetLabel, chart.actualLabel],
    },
    grid: { left: 44, right: 24, top: 42, bottom: 34 },
    xAxis: {
      type: "category",
      data: chart.labels,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: "#dfe5ed" } },
      axisLabel: { color: "#8490a4", fontSize: 10 },
    },
    yAxis: {
      type: "value",
      name: chart.unit,
      min: 0,
      max: 100,
      nameTextStyle: { color: "#8490a4", fontSize: 10 },
      axisLabel: { color: "#8490a4", fontSize: 10 },
      splitLine: { lineStyle: { color: "#edf1f5" } },
    },
    series: [
      {
        name: chart.targetLabel,
        type: "line",
        smooth: 0.2,
        symbol: "none",
        data: chart.target,
        lineStyle: { width: 1.5, type: "dashed", color: "#aab6c8" },
      },
      {
        name: chart.actualLabel,
        type: chart.type,
        smooth: chart.type === "line" ? 0.25 : undefined,
        symbol: chart.type === "line" ? "circle" : undefined,
        symbolSize: 5,
        showSymbol: false,
        barMaxWidth: 34,
        data: chart.actual,
        lineStyle: { width: 2.4, color: "#1768f2" },
        itemStyle: { color: "#1768f2", borderRadius: chart.type === "bar" ? [5, 5, 0, 0] : 0 },
        areaStyle: chart.type === "line" ? { color: "rgba(23,104,242,.08)" } : undefined,
      },
    ],
  }) : null, [chart]);

  return (
    <div className="space-y-3">
      <section className="grid gap-3 sm:grid-cols-3">
        {profile.metrics.map((metric, index) => {
          const Icon = METRIC_ICONS[index] ?? Activity;
          return <div key={metric.label} className="rounded-xl border border-[#e2e7ef] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-xs font-medium text-[#748198]">{metric.label}</p><strong className="mt-1 block truncate text-xl tracking-[-0.03em] text-[#23314d]">{metric.value}</strong></div>
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", METRIC_TONES[metric.tone])}><Icon size={18} /></span>
            </div>
            <p className="mt-3 truncate text-[10px] text-[#8793a7]">{metric.detail}</p>
          </div>;
        })}
      </section>

      {chart && chartOption ? <section className="overflow-hidden rounded-xl border border-[#e2e7ef] bg-white">
        <div className="border-b border-[#edf0f4] px-4 py-3"><h3 className="text-sm font-semibold text-[#243250]">{chart.title}</h3><p className="mt-1 text-[11px] text-[#728099]">{chart.insight}</p></div>
        <div className="px-2 pb-2 pt-1 sm:px-3"><ReactECharts option={chartOption} style={{ height: 270 }} notMerge lazyUpdate /></div>
        <table className="sr-only"><caption>{room.name}{chart.title}</caption><thead><tr><th>节点</th><th>{chart.targetLabel}</th><th>{chart.actualLabel}</th></tr></thead><tbody>{chart.labels.map((label, index) => <tr key={label}><td>{label}</td><td>{chart.target[index]}{chart.unit}</td><td>{chart.actual[index]}{chart.unit}</td></tr>)}</tbody></table>
      </section> : null}

      <section className="rounded-xl border border-[#e2e7ef] bg-white p-4">
        <div><h3 className="text-sm font-semibold text-[#243250]">{eventsHeading}</h3><p className="mt-1 text-[11px] text-[#7b879b]">{eventsDescription}</p></div>
        <div className="mt-4 space-y-0">
          {profile.events.map((event, index) => <div key={`${event.time}-${event.title}`} className="relative flex gap-3 pb-4 last:pb-0">
            {index < profile.events.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-[#e1e7ef]" /> : null}
            <span className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", event.status === "completed" ? "bg-[#e7f8f2] text-[#078663]" : event.status === "active" ? "bg-[#eaf2ff] text-[#1768f2]" : "bg-[#f0f3f7] text-[#7c899e]")}>{event.status === "completed" ? <CheckCircle2 size={15} /> : event.status === "active" ? <Radio size={15} /> : <Clock3 size={15} />}</span>
            <div className="min-w-0 flex-1 pt-0.5"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-xs text-[#34425e]">{event.title}</strong><span className="text-[10px] text-[#929cad]">{event.time}</span></div><p className="mt-1 text-[11px] leading-5 text-[#758198]">{event.detail}</p></div>
          </div>)}
        </div>
      </section>
    </div>
  );
}
