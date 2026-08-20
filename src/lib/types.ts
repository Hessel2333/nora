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
  componentCode?: string;
  operationId?: string;
  operationCode: string;
  name: string;
  type?: ProductType;
  unit: string;
  netQuantity: number;
  yieldRate: number;
  unitCost: number;
  level: number;
}

export type BomOperationKind = "receive" | "wash" | "cut" | "marinate" | "mix" | "cool" | "pack" | "quality";

export interface BomOperation {
  id: string;
  code: string;
  name: string;
  kind: BomOperationKind;
  sequence: number;
  workCenter?: string;
  durationMinutes: number;
  waitMinutes: number;
  temperatureMin?: number;
  temperatureMax?: number;
  instructions?: string;
}

export type BomVersionValidityState = "draft" | "scheduled" | "current" | "historical";

export interface BomVersionEvent {
  id: string;
  type: "created" | "updated" | "published" | "superseded" | "retired";
  actor: string;
  revision: number;
  effectiveAt: string | null;
  createdAt: string;
}

export interface Bom {
  id: string;
  code?: string;
  productId: string;
  productName: string;
  versionId?: string;
  version: string;
  previousVersion: string;
  outputQuantity: number;
  outputUnit: string;
  status: "effective" | "draft" | "retired";
  validityState?: BomVersionValidityState;
  effectiveAt: string;
  effectiveTo?: string | null;
  revision?: number;
  operations: BomOperation[];
  items: BomItem[];
  versions?: Array<{
    id: string;
    version: string;
    previousVersion?: string;
    outputQuantity?: number;
    outputUnit?: string;
    status: "effective" | "draft" | "retired";
    validityState?: BomVersionValidityState;
    effectiveAt: string | null;
    effectiveTo?: string | null;
    publishedAt?: string | null;
    revision: number;
    operationCount?: number;
    operations?: BomOperation[];
    items?: BomItem[];
    events?: BomVersionEvent[];
  }>;
}

export type OrderStatus = "draft" | "pending" | "approved" | "in_production" | "delivering" | "completed" | "reconciled";

export interface DocumentEvent {
  id: string;
  type: "created" | "submitted" | "approved" | "returned" | "status_changed";
  label: string;
  actor: string;
  at: string;
  comment?: string;
}

export interface OrderLine {
  id: string;
  productId: string;
  productCode?: string;
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
  revision?: number;
  lines: OrderLine[];
  events?: DocumentEvent[];
}

export type ProductionDemandStatus =
  | "pending_planning"
  | "partially_planned"
  | "planned"
  | "completed"
  | "cancelled";

export interface ProductionDemandLine {
  id: string;
  salesOrderLineId: string;
  productId: string;
  productCode: string;
  productName: string;
  requiredQuantity: number;
  unit: string;
  bomReady: boolean;
  snapshotComplete: boolean;
  snapshotSchemaVersion?: number;
  processStepCount: number;
  allocatedQuantity?: string;
  remainingQuantity?: string;
  selectedBomVersionId?: string;
  selectedBomVersion?: string;
}

export type ProductionBatchStatus =
  | "draft"
  | "confirmed"
  | "released"
  | "running"
  | "paused"
  | "awaiting_quality"
  | "completed"
  | "exception"
  | "cancelled";

export interface ProductionBatch {
  id: string;
  code: string;
  factoryCode: string;
  factoryName: string;
  productId: string;
  productCode: string;
  productName: string;
  plannedQuantity: string;
  unit: string;
  selectedBomVersionId: string;
  bomVersionSnapshot: string;
  snapshotSchemaVersion?: number;
  processStepCount: number;
  releaseReady: boolean;
  scheduledFor: string;
  status: ProductionBatchStatus;
  revision: number;
  createdBy: string;
  createdAt: string;
  workOrder?: ProductionWorkOrder | null;
  allocations: Array<{
    id: string;
    productionDemandLineId: string;
    productionDemandId: string;
    productionDemandCode: string;
    salesOrderId: string;
    salesOrderCode: string;
    customerName: string;
    allocatedQuantity: string;
  }>;
  events: Array<{
    id: string;
    type: "created" | "confirmed" | "released" | "cancelled" | "status_changed";
    actor: string;
    revision: number;
    createdAt: string;
  }>;
}

export type ProductionWorkOrderStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "exception"
  | "cancelled";

export interface ProductionWorkOrder {
  id: string;
  code: string;
  productionBatchId: string;
  productionBatchCode: string;
  factoryCode: string;
  factoryName: string;
  productId: string;
  productCode: string;
  productName: string;
  plannedQuantity: string;
  unit: string;
  selectedBomVersionId: string;
  bomVersionSnapshot: string;
  snapshotSchemaVersion?: number;
  scheduledStartAt: string;
  workCenter: string;
  status: ProductionWorkOrderStatus;
  revision: number;
  createdBy: string;
  createdAt: string;
  operations: Array<{
    code: string;
    name: string;
    kind: BomOperationKind;
    sequence: number;
    workCenter: string | null;
    durationMinutes: number;
    waitMinutes: number;
    temperatureMin: number | null;
    temperatureMax: number | null;
    instructions: string | null;
  }>;
  events: Array<{
    id: string;
    type: string;
    actor: string;
    status: ProductionWorkOrderStatus;
    revision: number;
    createdAt: string;
  }>;
}

export interface ProductionDemand {
  id: string;
  code: string;
  salesOrderId: string;
  factoryCode: string;
  factoryName: string;
  requiredAt: string;
  status: ProductionDemandStatus;
  approvedAt: string;
  createdAt: string;
  salesOrder?: {
    id: string;
    code: string;
    customerName: string;
    deliveryAt: string;
  };
  lines: ProductionDemandLine[];
  lineCount: number;
  readyLineCount: number;
  missingBomCount: number;
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
