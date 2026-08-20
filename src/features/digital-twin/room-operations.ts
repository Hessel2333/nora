import type { StatusTone } from "@/lib/types";
import type { FactoryRoomSnapshot, RoomMetricKind } from "./room-monitoring";

export interface OperationMetric {
  label: string;
  value: string;
  detail: string;
  tone: StatusTone;
}
export interface OperationEvent {
  time: string;
  title: string;
  detail: string;
  status: "completed" | "active" | "waiting";
}

export interface OperationChart {
  title: string;
  insight: string;
  unit: string;
  labels: string[];
  targetLabel: string;
  actualLabel: string;
  target: number[];
  actual: number[];
  type: "line" | "bar";
}

export interface RoomOperationsProfile {
  kind: RoomMetricKind;
  viewLabel: string;
  summaryTitle: string;
  metrics: OperationMetric[];
  chart?: OperationChart;
  events: OperationEvent[];
}

const ROOM_CYCLE_TIMES: Record<string, string> = {
  R01: "42 分钟/批",
  R02: "36 分钟/批",
  "R03+R06": "28 分钟/批",
  "R05+R07": "30 分钟/批",
  R08: "24 分钟/批",
  R09: "40 分钟/批",
  R10: "18 分钟/批",
  R15: "45 分钟/批",
};

function plannedQuantity(room: FactoryRoomSnapshot): { value: number; unit: string } | undefined {
  const match = room.task?.quantity?.match(/([\d,]+(?:\.\d+)?)\s*(.*)/);
  if (!match) return undefined;
  return { value: Number(match[1].replaceAll(",", "")), unit: match[2] || "" };
}

function progressChart(progress: number, fulfillment = false): OperationChart {
  const plannedEnd = Math.min(100, Math.max(progress, progress + (progress < 85 ? 10 : 4)));
  const ratios = [0, 0.18, 0.38, 0.58, 0.79, 1];
  const actualRatios = [0, 0.16, 0.34, 0.56, 0.78, 1];
  return {
    title: fulfillment ? "订单齐套进度" : "任务进度趋势",
    insight: fulfillment ? `当前齐套率 ${progress}%，待完成复核与装车交接` : `当前完成 ${progress}%，与计划偏差 ${Math.max(0, plannedEnd - progress)} 个百分点`,
    unit: "%",
    labels: ["开始", "+30m", "+60m", "+90m", "+120m", "现在"],
    targetLabel: fulfillment ? "计划齐套" : "计划进度",
    actualLabel: fulfillment ? "实际齐套" : "实际进度",
    target: ratios.map((ratio) => Math.round(plannedEnd * ratio)),
    actual: actualRatios.map((ratio) => Math.round(progress * ratio)),
    type: "line",
  };
}

function taskProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  const progress = room.task?.progress ?? room.progress;
  const planned = plannedQuantity(room);
  const completed = planned ? Math.round(planned.value * progress / 100) : undefined;
  const completedText = completed === undefined ? "--" : `${completed.toLocaleString("zh-CN")} ${planned?.unit ?? ""}`;
  const cycle = ROOM_CYCLE_TIMES[room.id] ?? "32 分钟/批";

  return {
    kind: "task",
    viewLabel: "作业监控",
    summaryTitle: "生产作业概览",
    metrics: [
      { label: "任务进度", value: `${progress}%`, detail: room.task?.statusLabel ?? "暂无任务", tone: room.task?.tone ?? "neutral" },
      { label: "已完成数量", value: completedText, detail: planned ? `计划 ${planned.value.toLocaleString("zh-CN")} ${planned.unit}` : "等待任务数量", tone: "success" },
      { label: "当前节拍", value: cycle, detail: progress > 0 ? "处于标准节拍范围" : "尚未开始计时", tone: progress > 0 ? "info" : "neutral" },
    ],
    chart: progressChart(progress),
    events: room.task ? [
      { time: "08:00", title: "任务已下达", detail: `${room.task.code} · ${room.task.name}`, status: "completed" },
      { time: "08:12", title: "物料与工位就绪", detail: "领料复核完成，设备点检正常", status: "completed" },
      { time: "现在", title: room.task.statusLabel, detail: `当前完成 ${progress}%${room.task.eta ? `，预计 ${room.task.eta} 完成` : ""}`, status: progress >= 100 ? "completed" : progress > 0 ? "active" : "waiting" },
    ] : [
      { time: "--", title: "暂无生产任务", detail: "等待生产计划下达", status: "waiting" },
    ],
  };
}

function inventoryProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  return {
    kind: "inventory",
    viewLabel: "库存监控",
    summaryTitle: "包材库存概览",
    metrics: [
      { label: "库存占用率", value: "68%", detail: "安全容量 40%–85%", tone: "info" },
      { label: "可用库存", value: "12,480 套", detail: "已预留 4,200 套", tone: "success" },
      { label: "今日出库", value: "6,320 套", detail: "3 个备料任务", tone: "neutral" },
    ],
    chart: {
      title: "库存占用趋势",
      insight: "库存余量充足，按当前消耗速度可覆盖未来 2.6 天",
      unit: "%",
      labels: ["08:00", "10:00", "12:00", "14:00", "16:00", "现在"],
      targetLabel: "安全下限",
      actualLabel: "库存占用",
      target: [40, 40, 40, 40, 40, 40],
      actual: [76, 74, 72, 70, 69, 68],
      type: "bar",
    },
    events: [
      { time: "08:20", title: "包材入库", detail: "餐盒与封口膜共 8,000 套", status: "completed" },
      { time: "10:05", title: "午间备料出库", detail: `${room.task?.code ?? "DEMO-PD-013"} · 已出库 2,760 套`, status: "active" },
      { time: "11:30", title: "下一次补货", detail: "供应商车辆预计 11:30 到厂", status: "waiting" },
    ],
  };
}

function fulfillmentProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  const progress = room.task?.progress ?? room.progress;
  return {
    kind: "fulfillment",
    viewLabel: "履约监控",
    summaryTitle: "发货履约概览",
    metrics: [
      { label: "订单齐套率", value: `${progress}%`, detail: "当前批次 2,000 份", tone: "info" },
      { label: "待发订单", value: "3 单", detail: "其中 1 单即将装车", tone: "warning" },
      { label: "下一车次", value: "11:00", detail: "华润万家配送线", tone: "success" },
    ],
    chart: progressChart(progress, true),
    events: [
      { time: "09:10", title: "订单进入缓冲区", detail: `${room.task?.code ?? "DEMO-SO-0048"} · 批次核对完成`, status: "completed" },
      { time: "现在", title: "出库复核进行中", detail: `齐套 ${progress}%，等待最后 600 份到位`, status: "active" },
      { time: "11:00", title: "计划装车发运", detail: "车辆粤B·6K28 已登记", status: "waiting" },
    ],
  };
}

function occupancyProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  const changingRoom = room.id === "R04";
  return {
    kind: "occupancy",
    viewLabel: changingRoom ? "人员与消毒" : "通行监控",
    summaryTitle: changingRoom ? "人员卫生概览" : "安全通行概览",
    metrics: changingRoom ? [
      { label: "当前人数", value: "2 人", detail: "额定容量 8 人", tone: "info" },
      { label: "最近消毒", value: "08:05", detail: "今日已完成 2 次", tone: "success" },
      { label: "门禁状态", value: "正常", detail: "无未授权进入", tone: "success" },
    ] : [
      { label: "通行状态", value: "正常", detail: "通道无占用", tone: "success" },
      { label: "今日通行", value: "46 人次", detail: "高峰 08:00–09:00", tone: "neutral" },
      { label: "消防巡检", value: "已完成", detail: "08:15 完成点检", tone: "success" },
    ],
    events: changingRoom ? [
      { time: "08:05", title: "更衣室消毒完成", detail: "台面、门把手与更衣柜已消毒", status: "completed" },
      { time: "现在", title: "在室人员 2 人", detail: "平均停留 4 分钟", status: "active" },
    ] : [
      { time: "08:15", title: "消防通道巡检完成", detail: "应急照明与疏散标识正常", status: "completed" },
      { time: "现在", title: "通行正常", detail: "未检测到异常停留或占用", status: "active" },
    ],
  };
}

function environmentOperationsProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  const task = room.task;
  return {
    kind: "environment",
    viewLabel: "巡检与设备",
    summaryTitle: "制冷设备与巡检",
    metrics: [
      { label: "巡检完成率", value: `${task?.progress ?? 100}%`, detail: task?.statusLabel ?? "已完成", tone: task?.tone ?? "success" },
      { label: "机组负载", value: room.id === "R14" ? "87%" : "64%", detail: room.id === "R14" ? "负载偏高" : "运行稳定", tone: room.id === "R14" ? "warning" : "success" },
      { label: "今日开门", value: room.id === "R12" ? "7 次" : "12 次", detail: "最长开启 4 分 20 秒", tone: "neutral" },
    ],
    events: [
      { time: "08:30", title: "设备自动巡检", detail: `${room.equipment} · 压力与电流正常`, status: "completed" },
      { time: task?.eta ?? "09:35", title: task?.name ?? "温控人工巡检", detail: task?.statusLabel ?? "已完成", status: task?.progress === 100 ? "completed" : "active" },
      { time: "现在", title: room.id === "R14" ? "等待温控复核" : "设备持续运行", detail: room.id === "R14" ? "检查库门密封与制冷机组" : "当前无设备异常", status: room.id === "R14" ? "waiting" : "active" },
    ],
  };
}

export function getRoomOperationsProfile(room: FactoryRoomSnapshot): RoomOperationsProfile {
  if (room.primaryMetric === "inventory") return inventoryProfile(room);
  if (room.primaryMetric === "fulfillment") return fulfillmentProfile(room);
  if (room.primaryMetric === "occupancy") return occupancyProfile(room);
  if (room.primaryMetric === "environment") return environmentOperationsProfile(room);
  return taskProfile(room);
}
