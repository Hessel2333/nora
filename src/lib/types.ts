export type UserRole = "owner" | "supervisor" | "worker" | "customer";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger" | "purple";

export type ProductType = "raw" | "semi" | "processed" | "finished" | "combo";

export interface Product {
  id: string;
  code: string;
  name: string;
  type: ProductType;
  category: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  safetyStock: number;
  taxRate: number;
  tags: string[];
  status: "active" | "draft";
}

export interface BomItem {
  id: string;
  componentId: string;
  name: string;
  unit: string;
  netQuantity: number;
  yieldRate: number;
  unitCost: number;
  level: number;
}

export interface Bom {
  id: string;
  productId: string;
  productName: string;
  version: string;
  previousVersion: string;
  outputQuantity: number;
  outputUnit: string;
  status: "effective" | "draft" | "retired";
  effectiveAt: string;
  items: BomItem[];
}

export type OrderStatus = "draft" | "pending" | "approved" | "in_production" | "delivering" | "completed" | "reconciled";

export interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface SalesOrder {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  deliveryAt: string;
  status: OrderStatus;
  source: "客户下单" | "手工录入" | "AI预测" | "Excel导入";
  createdAt: string;
  contact: string;
  phone: string;
  address: string;
  notes?: string;
  lines: OrderLine[];
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: "A类" | "B类" | "C类" | "D类";
  contact: string;
  phone: string;
  address: string;
  settlement: string;
  tags: string[];
  status: "active" | "pending";
  orderCount: number;
  revenue: number;
}

export type WorkOrderStatus = "scheduled" | "released" | "in_progress" | "paused" | "completed" | "closed";

export interface WorkOrder {
  id: string;
  code: string;
  productId: string;
  productName: string;
  line: string;
  zoneId: string;
  plannedQuantity: number;
  completedQuantity: number;
  unit: string;
  startAt: string;
  endAt: string;
  owner: string;
  priority: "high" | "normal";
  status: WorkOrderStatus;
  progress: number;
  operations: Array<{
    id: string;
    name: string;
    status: "completed" | "in_progress" | "waiting";
    at?: string;
  }>;
}

export type ZoneStatus = "normal" | "running" | "waiting" | "warning" | "critical" | "offline";

export interface TwinZone {
  id: string;
  name: string;
  shortName: string;
  status: ZoneStatus;
  progress: number;
  temperature: string;
  humidity: string;
  workOrderId?: string;
  equipment: string;
  owner: string;
}

export interface ActivityEvent {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: StatusTone;
}

export interface MasterRecord {
  id: string;
  name: string;
  code: string;
  meta: string;
  status: "正常" | "待审核" | "停用";
}
