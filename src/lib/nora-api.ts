import type {
  Bom,
  Customer,
  Product,
  ProductionBatch,
  ProductionDemand,
  ProductionWorkOrder,
  ProductionWorkOrderCommand,
  SalesOrder,
  InventoryLocation,
  InventoryLotQualityStatus,
  InventoryStockBalance,
  InventoryTransaction,
  WorkOrderMaterialsView,
} from "./types";
import { frontendAuditActor, getNoraRuntimeMode } from "./runtime-mode";

export interface MaterialRequirements {
  orderId: string;
  orderCode: string;
  items: Array<{
    productId: string;
    productCode: string;
    productName: string;
    productType: Product["type"];
    unit: string;
    grossQuantity: number;
    unitCost: number;
    estimatedCost: number;
    sources: string[];
  }>;
  missingBoms: Array<{ productId: string; productCode: string; productName: string }>;
  totalEstimatedCost: number;
}

export interface ProductionReadiness {
  orderId: string;
  deliveryAt: string;
  ready: boolean;
  readyLineCount: number;
  missingBomCount: number;
  lines: Array<{
    salesOrderLineId: string;
    productId: string;
    productCode: string;
    productName: string;
    requiredQuantity: number;
    unit: string;
    bomReady: boolean;
    selectedBomVersionId?: string;
    selectedBomVersion?: string;
  }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3100/api/v1";
const auditActor = frontendAuditActor(getNoraRuntimeMode());

export class NoraApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message) ? body.message.join("；") : body?.message;
    throw new NoraApiError(message ?? `请求失败（${response.status}）`, response.status);
  }
  return response.json() as Promise<T>;
}

function asIsoDateTime(value: string) {
  if (value.includes("T")) return new Date(value).toISOString();
  return new Date(`${value.replace(" ", "T")}:00+08:00`).toISOString();
}

function orderPayload(order: SalesOrder) {
  return {
    customerId: order.customerId,
    deliveryAt: asIsoDateTime(order.deliveryAt),
    source: order.source,
    notes: order.notes,
    status: order.status === "pending" ? "pending" : "draft",
    lines: order.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
  };
}

export const noraApi = {
  async bootstrap() {
    const [orders, boms, customers, products] = await Promise.all([
      request<{ data: SalesOrder[] }>("/orders?pageSize=100"),
      request<{ data: Bom[] }>("/boms"),
      request<Customer[]>("/catalog/customers"),
      request<Product[]>("/catalog/products"),
    ]);
    return { orders: orders.data, boms: boms.data, customers, products };
  },

  createOrder(order: SalesOrder) {
    return request<SalesOrder>("/orders", { method: "POST", body: JSON.stringify(orderPayload(order)) });
  },

  updateOrder(order: SalesOrder) {
    return request<SalesOrder>(`/orders/${order.id}`, {
      method: "PUT",
      body: JSON.stringify({ ...orderPayload(order), revision: order.revision ?? 1 }),
    });
  },

  submitOrder(id: string) {
    return request<SalesOrder>(`/orders/${id}/submit`, { method: "POST", body: JSON.stringify({ actor: auditActor }) });
  },

  approveOrder(id: string, comment?: string) {
    return request<SalesOrder>(`/orders/${id}/approve`, { method: "POST", body: JSON.stringify({ actor: auditActor, comment }) });
  },

  returnOrder(id: string, comment: string) {
    return request<SalesOrder>(`/orders/${id}/return`, { method: "POST", body: JSON.stringify({ actor: auditActor, comment }) });
  },

  materialRequirements(id: string) {
    return request<MaterialRequirements>(`/orders/${id}/material-requirements`);
  },

  productionReadiness(id: string) {
    return request<ProductionReadiness>(`/orders/${id}/production-readiness`);
  },

  productionDemand(id: string) {
    return request<ProductionDemand>(`/orders/${id}/production-demand`);
  },

  productionDemands() {
    return request<{ data: ProductionDemand[]; page: number; pageSize: number; total: number }>(
      "/production-demands?pageSize=100",
    );
  },

  productionBatches() {
    return request<{ data: ProductionBatch[] }>("/production-batches");
  },

  createProductionBatch(
    input: {
      scheduledFor: string;
      allocations: Array<{ productionDemandLineId: string; quantity: string }>;
    },
    idempotencyKey: string,
  ) {
    return request<ProductionBatch>("/production-batches", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ ...input, actor: auditActor }),
    });
  },

  confirmProductionBatch(id: string, revision: number, idempotencyKey: string) {
    return request<ProductionBatch>(`/production-batches/${id}/confirm`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ revision, actor: auditActor }),
    });
  },

  releaseProductionBatch(id: string, revision: number, idempotencyKey: string) {
    return request<ProductionBatch>(`/production-batches/${id}/release`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ revision, actor: auditActor }),
    });
  },

  workOrders() {
    return request<{ data: ProductionWorkOrder[] }>("/work-orders");
  },

  transitionWorkOrder(
    id: string,
    command: ProductionWorkOrderCommand,
    input: {
      revision: number;
      workstationCode: string;
      deviceId: string;
      reason?: string;
    },
    idempotencyKey: string,
  ) {
    const targetStatus = command === "recover-pending" ? "pending"
      : command === "recover-running" ? "running"
        : undefined;
    const path = command.startsWith("recover-") ? "recover" : command;
    return request<ProductionWorkOrder>(`/work-orders/${id}/${path}`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ ...input, targetStatus, actor: auditActor }),
    });
  },

  inventoryLocations() {
    return request<{ data: InventoryLocation[] }>("/inventory/locations");
  },

  inventoryStock() {
    return request<{ data: InventoryStockBalance[] }>("/inventory/stock");
  },

  inventoryTransactions() {
    return request<{ data: InventoryTransaction[] }>("/inventory/transactions");
  },

  workOrderMaterials(id: string) {
    return request<WorkOrderMaterialsView>(`/inventory/work-orders/${id}/materials`);
  },

  moveWorkOrderMaterial(
    id: string,
    movement: "issue" | "return",
    input: {
      stockBalanceId: string;
      expectedBalanceRevision: number;
      quantity: string;
      unit: string;
      workstationCode: string;
      deviceId: string;
      note?: string;
    },
    idempotencyKey: string,
  ) {
    return request<{
      transaction: InventoryTransaction;
      balance: InventoryStockBalance;
      materials: WorkOrderMaterialsView;
    }>(`/inventory/work-orders/${id}/${movement === "issue" ? "issues" : "returns"}`, {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ ...input, actor: auditActor }),
    });
  },

  createOpeningBalance(
    input: {
      locationId: string;
      productId: string;
      lotCode: string;
      supplierLotCode?: string;
      quantity: string;
      unit: string;
      qualityStatus: InventoryLotQualityStatus;
      receivedAt: string;
      productionAt?: string;
      expiresAt?: string;
      note?: string;
    },
    idempotencyKey: string,
  ) {
    return request<{ transaction: InventoryTransaction; balance: InventoryStockBalance }>(
      "/inventory/opening-balances",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ ...input, actor: auditActor }),
      },
    );
  },

  copyBomVersion(id: string, version: string, sourceVersionId?: string) {
    return request<Bom>(`/boms/${id}/versions`, { method: "POST", body: JSON.stringify({ version, sourceVersionId }) });
  },

  updateBomVersion(versionId: string, bom: Bom) {
    return request<Bom>(`/boms/versions/${versionId}`, {
      method: "PUT",
      body: JSON.stringify({
        revision: bom.revision ?? 1,
        outputQuantity: bom.outputQuantity,
        outputUnit: bom.outputUnit,
        operations: bom.operations.map((operation) => ({
          code: operation.code,
          name: operation.name,
          kind: operation.kind,
          sequence: operation.sequence,
          workCenter: operation.workCenter,
          durationMinutes: operation.durationMinutes,
          waitMinutes: operation.waitMinutes,
          temperatureMin: operation.temperatureMin,
          temperatureMax: operation.temperatureMax,
          instructions: operation.instructions,
        })),
        items: bom.items.map((item) => ({
          componentProductId: item.componentId,
          operationCode: item.operationCode,
          netQuantity: item.netQuantity,
          yieldRate: item.yieldRate,
          unit: item.unit,
        })),
      }),
    });
  },

  publishBomVersion(versionId: string, revision: number, effectiveAt?: string) {
    return request<Bom>(`/boms/versions/${versionId}/publish`, {
      method: "POST",
      body: JSON.stringify({ revision, effectiveAt }),
    });
  },
};
