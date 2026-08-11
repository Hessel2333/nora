import type { Bom, SalesOrder, WorkOrderStatus } from "./types";

export function calculateBomCost(bom: Bom) {
  return bom.items.reduce((total, item) => total + (item.netQuantity / item.yieldRate) * item.unitCost, 0);
}

export function calculateGrossRequirement(netQuantity: number, yieldRate: number) {
  if (yieldRate <= 0 || yieldRate > 1) throw new Error("出成率必须大于 0 且不超过 1");
  return netQuantity / yieldRate;
}

export function aggregateApprovedDemand(orders: SalesOrder[]) {
  const demand = new Map<string, { productId: string; productName: string; quantity: number; unit: string; orderIds: string[] }>();
  orders.filter((order) => order.status === "approved" || order.status === "in_production").forEach((order) => {
    order.lines.forEach((line) => {
      const current = demand.get(line.productId);
      demand.set(line.productId, current ? { ...current, quantity: current.quantity + line.quantity, orderIds: [...current.orderIds, order.id] } : { productId: line.productId, productName: line.productName, quantity: line.quantity, unit: line.unit, orderIds: [order.id] });
    });
  });
  return [...demand.values()];
}

const transitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  scheduled: ["released"], released: ["in_progress"], in_progress: ["paused", "completed"],
  paused: ["in_progress"], completed: ["closed"], closed: [],
};

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus) {
  return transitions[from].includes(to);
}

export function formatSequence(prefix: string, date: string, serial: number, width = 4) {
  return `${prefix}${date.replaceAll("-", "")}${String(serial).padStart(width, "0")}`;
}
