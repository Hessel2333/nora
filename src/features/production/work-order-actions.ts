import type {
  ProductionWorkOrderCommand,
  ProductionWorkOrderStatus,
} from "@/lib/types";

export interface WorkOrderAction {
  command: ProductionWorkOrderCommand;
  label: string;
  requiresReason: boolean;
  tone: "primary" | "secondary" | "danger";
}

const actionByStatus: Record<ProductionWorkOrderStatus, WorkOrderAction[]> = {
  pending: [
    { command: "start", label: "开始", requiresReason: false, tone: "primary" },
    { command: "report-exception", label: "上报异常", requiresReason: true, tone: "danger" },
  ],
  running: [
    { command: "pause", label: "暂停", requiresReason: true, tone: "secondary" },
    { command: "report-exception", label: "上报异常", requiresReason: true, tone: "danger" },
  ],
  paused: [
    { command: "resume", label: "继续", requiresReason: false, tone: "primary" },
    { command: "report-exception", label: "上报异常", requiresReason: true, tone: "danger" },
  ],
  awaiting_quality: [],
  exception: [
    { command: "recover-running", label: "恢复生产", requiresReason: true, tone: "primary" },
    { command: "recover-pending", label: "退回待开工", requiresReason: true, tone: "secondary" },
  ],
  completed: [],
  cancelled: [],
};

export function workOrderActions(status: ProductionWorkOrderStatus) {
  return actionByStatus[status];
}

export function workOrderCommandSuccessLabel(command: ProductionWorkOrderCommand) {
  const labels: Record<ProductionWorkOrderCommand, string> = {
    start: "工单已开始",
    pause: "工单已暂停",
    resume: "工单已继续",
    "report-exception": "异常已上报",
    "recover-pending": "工单已退回待开工",
    "recover-running": "工单已恢复生产",
  };
  return labels[command];
}
