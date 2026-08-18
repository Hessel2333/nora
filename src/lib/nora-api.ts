import type { Bom, Customer, Product, ProductionDemand, SalesOrder } from "./types";

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
    return request<SalesOrder>(`/orders/${id}/submit`, { method: "POST", body: JSON.stringify({ actor: "演示用户" }) });
  },

  approveOrder(id: string, comment?: string) {
    return request<SalesOrder>(`/orders/${id}/approve`, { method: "POST", body: JSON.stringify({ actor: "演示用户", comment }) });
  },

  returnOrder(id: string, comment: string) {
    return request<SalesOrder>(`/orders/${id}/return`, { method: "POST", body: JSON.stringify({ actor: "演示用户", comment }) });
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

  copyBomVersion(id: string, version: string, sourceVersionId?: string) {
    return request<Bom>(`/boms/${id}/versions`, { method: "POST", body: JSON.stringify({ version, sourceVersionId }) });
  },

  publishBomVersion(versionId: string) {
    return request<Bom>(`/boms/versions/${versionId}/publish`, { method: "POST", body: JSON.stringify({}) });
  },
};
