import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus, StatusTone, WorkOrderStatus, ZoneStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const currency = (value: number) => new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
export const number = (value: number) => new Intl.NumberFormat("zh-CN").format(value);
export const formatCurrency = currency;
export const formatNumber = number;

export const orderStatus: Record<OrderStatus, { label: string; tone: StatusTone }> = {
  draft: { label: "草稿", tone: "neutral" },
  pending: { label: "待审核", tone: "warning" },
  approved: { label: "已审核", tone: "info" },
  in_production: { label: "生产中", tone: "info" },
  delivering: { label: "配送中", tone: "success" },
  completed: { label: "已完成", tone: "neutral" },
  reconciled: { label: "已对账", tone: "purple" },
};
export const orderStatusLabel = Object.fromEntries(Object.entries(orderStatus).map(([key, value]) => [key, value.label])) as Record<OrderStatus, string>;
export const statusTone = Object.fromEntries(Object.entries(orderStatus).map(([key, value]) => [key, value.tone])) as Record<OrderStatus, StatusTone>;

export const workOrderStatus: Record<WorkOrderStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: "已排程", tone: "neutral" },
  released: { label: "待开工", tone: "purple" },
  in_progress: { label: "生产中", tone: "warning" },
  paused: { label: "已暂停", tone: "danger" },
  completed: { label: "已完成", tone: "success" },
  closed: { label: "已结案", tone: "neutral" },
};

export const zoneStatus: Record<ZoneStatus, { label: string; tone: StatusTone }> = {
  normal: { label: "正常", tone: "success" },
  running: { label: "运行中", tone: "info" },
  waiting: { label: "待开工", tone: "warning" },
  warning: { label: "预警", tone: "warning" },
  critical: { label: "异常", tone: "danger" },
  offline: { label: "离线", tone: "neutral" },
};
