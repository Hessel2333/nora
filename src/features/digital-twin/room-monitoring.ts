import type { StatusTone, TwinZone, WorkOrder, WorkOrderStatus, ZoneStatus } from "@/lib/types";

export type RoomMetricKind = "task" | "environment" | "inventory" | "fulfillment" | "occupancy";

export interface FactoryRoomTask {
  code: string;
  name: string;
  statusLabel: string;
  tone: StatusTone;
  progress: number;
  quantity?: string;
  eta?: string;
  workOrderId?: string;
}

export interface FactoryRoomAlert {
  title: string;
  detail: string;
  tone: "warning" | "danger";
}

export interface FactoryRoomSnapshot {
  id: string;
  name: string;
  zoneId?: string;
  status: ZoneStatus;
  progress: number;
  temperature: string;
  humidity: string;
  owner: string;
  equipment: string;
  primaryMetric: RoomMetricKind;
  mapMetric: string;
  primaryLabel?: string;
  occupancyLabel?: string;
  task?: FactoryRoomTask;
  alert?: FactoryRoomAlert;
  updatedAt: string;
}

interface FactoryRoomDefinition {
  id: string;
  name: string;
  zoneId?: string;
  workOrderId?: string;
  status?: ZoneStatus;
  temperature: string;
  humidity: string;
  owner: string;
  equipment: string;
  primaryMetric: RoomMetricKind;
  primaryLabel?: string;
  occupancyLabel?: string;
  task?: FactoryRoomTask;
  alert?: FactoryRoomAlert;
}

const staticTask = (
  code: string,
  name: string,
  statusLabel: string,
  tone: StatusTone,
  progress: number,
  quantity?: string,
  eta?: string,
): FactoryRoomTask => ({ code, name, statusLabel, tone, progress, quantity, eta });

const ROOM_DEFINITIONS: FactoryRoomDefinition[] = [
  { id: "R01", name: "蔬菜前处理加工", zoneId: "vegetable-prep", temperature: "14.2°C", humidity: "58%RH", owner: "张伟", equipment: "清洗池、去皮机、脱水机", primaryMetric: "task" },
  { id: "R02", name: "蔬菜切配间", zoneId: "vegetable-cutting", temperature: "12.6°C", humidity: "58%RH", owner: "刘芳", equipment: "双列切配台与刀具架", primaryMetric: "task" },
  { id: "R03+R06", name: "蔬菜内包装间", zoneId: "vegetable-packing", temperature: "12.4°C", humidity: "50%RH", owner: "陈勇", equipment: "双室真空包装机", primaryMetric: "task", task: staticTask("RW20260714-002", "鱼香肉丝内包装", "待到站", "warning", 0, "1,500 份", "11:10") },
  { id: "R04", name: "第二更衣室", status: "normal", temperature: "19.1°C", humidity: "47%RH", owner: "行政值班", equipment: "更衣柜、洗手消毒设施", primaryMetric: "occupancy", occupancyLabel: "当前 2 人" },
  { id: "R05+R07", name: "肉类内包装间", zoneId: "meat-packing", temperature: "12.2°C", humidity: "51%RH", owner: "李娜", equipment: "双室真空包装机", primaryMetric: "task" },
  { id: "R08", name: "综合外包间", zoneId: "outer-packing", temperature: "12.8°C", humidity: "49%RH", owner: "陈勇", equipment: "外包装台与覆膜机", primaryMetric: "task" },
  { id: "R09", name: "肉类切配间", zoneId: "meat-cutting", temperature: "12.6°C", humidity: "55%RH", owner: "王强", equipment: "切肉机、绞肉机、锯骨机", primaryMetric: "task" },
  { id: "R10", name: "配料间", status: "running", temperature: "15.8°C", humidity: "48%RH", owner: "周敏", equipment: "电子秤、调味料架、配料台", primaryMetric: "task", task: staticTask("RW20260714-006", "宫保调味汁称量", "进行中", "info", 42, "320 kg", "10:45") },
  { id: "R11", name: "冷藏库", status: "normal", temperature: "2.8°C", humidity: "46%RH", owner: "李婷", equipment: "冷藏机组 CL-01", primaryMetric: "environment", task: staticTask("XJ20260714-011", "冷藏库温控巡检", "已完成", "success", 100, undefined, "09:30") },
  { id: "R12", name: "冷冻库", status: "normal", temperature: "-18.2°C", humidity: "42%RH", owner: "李婷", equipment: "冷冻机组 FZ-01", primaryMetric: "environment", task: staticTask("XJ20260714-012", "冷冻库温控巡检", "已完成", "success", 100, undefined, "09:35") },
  { id: "R13", name: "包材库", status: "normal", temperature: "21.4°C", humidity: "44%RH", owner: "赵敏", equipment: "货架、除湿机", primaryMetric: "inventory", primaryLabel: "库存 68%", task: staticTask("PD20260714-013", "午间包材备料", "进行中", "info", 66, "4,200 套", "10:50") },
  { id: "R14", name: "0–4°C冷藏库", zoneId: "cold-chain", status: "warning", temperature: "4.8°C", humidity: "54%RH", owner: "李婷", equipment: "冷藏机组 CL-02", primaryMetric: "environment", alert: { title: "温度接近上限", detail: "当前 4.8°C，建议检查库门与制冷机组", tone: "warning" }, task: staticTask("XJ20260714-014", "冷链温控复核", "待处理", "warning", 35, undefined, "10:20") },
  { id: "R15", name: "肉类前处理加工", zoneId: "meat-prep", temperature: "12.4°C", humidity: "55%RH", owner: "王强", equipment: "解冻池、工作台、杀鱼台", primaryMetric: "task", task: staticTask("RW20260714-003", "宫保鸡丁肉类前处理", "进行中", "info", 68, "2,000 份", "10:05") },
  { id: "R20", name: "楼梯间", status: "normal", temperature: "20.4°C", humidity: "50%RH", owner: "物业值班", equipment: "消防通道与应急照明", primaryMetric: "occupancy", occupancyLabel: "通行正常" },
  { id: "R21", name: "发货缓冲区", zoneId: "dispatch", temperature: "18°C", humidity: "52%RH", owner: "陈凯", equipment: "发货缓冲台与货梯", primaryMetric: "fulfillment", task: staticTask("SO202607140048", "华润万家订单出库复核", "进行中", "info", 70, "2,000 份", "11:00") },
];

const WORK_ORDER_LABELS: Record<WorkOrderStatus, { label: string; tone: StatusTone }> = {
  scheduled: { label: "已排程", tone: "neutral" },
  released: { label: "待开工", tone: "warning" },
  in_progress: { label: "进行中", tone: "info" },
  paused: { label: "已暂停", tone: "warning" },
  completed: { label: "已完成", tone: "success" },
  closed: { label: "已结案", tone: "success" },
};

function taskFromWorkOrder(workOrder: WorkOrder): FactoryRoomTask {
  const status = WORK_ORDER_LABELS[workOrder.status];
  return {
    code: workOrder.code,
    name: workOrder.productName,
    statusLabel: status.label,
    tone: status.tone,
    progress: workOrder.progress,
    quantity: `${workOrder.plannedQuantity.toLocaleString("zh-CN")} ${workOrder.unit}`,
    eta: workOrder.endAt,
    workOrderId: workOrder.id,
  };
}

function mapMetric(definition: FactoryRoomDefinition, task: FactoryRoomTask | undefined): string {
  if (definition.primaryMetric === "environment") return `${definition.temperature} · ${definition.humidity}`;
  if (definition.primaryMetric === "inventory") return definition.primaryLabel ?? "库存正常";
  if (definition.primaryMetric === "fulfillment") return task ? `齐套 ${task.progress}%` : "暂无待发订单";
  if (definition.primaryMetric === "occupancy") return definition.occupancyLabel ?? "区域正常";
  return task ? `${task.statusLabel} ${task.progress}%` : "暂无任务";
}

export function buildFactoryRoomSnapshots(zones: TwinZone[], workOrders: WorkOrder[]): FactoryRoomSnapshot[] {
  const zonesById = new Map(zones.map((zone) => [zone.id, zone]));
  const workOrdersById = new Map(workOrders.map((workOrder) => [workOrder.id, workOrder]));

  return ROOM_DEFINITIONS.map((definition) => {
    const zone = definition.zoneId ? zonesById.get(definition.zoneId) : undefined;
    const workOrderId = definition.workOrderId ?? zone?.workOrderId;
    const workOrder = workOrderId ? workOrdersById.get(workOrderId) : undefined;
    const task = workOrder ? taskFromWorkOrder(workOrder) : definition.task;
    const status = definition.status ?? zone?.status ?? "normal";

    return {
      ...definition,
      status,
      progress: task?.progress ?? zone?.progress ?? 0,
      temperature: definition.temperature || zone?.temperature || "--",
      humidity: definition.humidity || zone?.humidity || "--",
      owner: definition.owner || zone?.owner || "未分配",
      equipment: definition.equipment || zone?.equipment || "暂无设备",
      mapMetric: mapMetric(definition, task),
      task,
      updatedAt: "刚刚",
    };
  });
}

const PREFERRED_ROOM_BY_ZONE: Record<string, string> = {
  "vegetable-prep": "R01",
  "vegetable-cutting": "R02",
  "vegetable-packing": "R03+R06",
  "meat-packing": "R05+R07",
  "outer-packing": "R08",
  "meat-cutting": "R09",
  "cold-chain": "R14",
  "meat-prep": "R15",
  dispatch: "R21",
};

export function roomIdForZone(zoneId: string): string | undefined {
  return PREFERRED_ROOM_BY_ZONE[zoneId];
}
