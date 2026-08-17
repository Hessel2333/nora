"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { activityEvents, boms, customers, orders, products, twinZones, workOrders } from "./mock-data";
import type { ActivityEvent, Bom, Customer, DocumentEvent, Product, SalesOrder, TwinZone, UserRole, WorkOrder, WorkOrderStatus } from "./types";

interface NoraState {
  currentRole: UserRole;
  products: Product[];
  boms: Bom[];
  customers: Customer[];
  orders: SalesOrder[];
  workOrders: WorkOrder[];
  zones: TwinZone[];
  activities: ActivityEvent[];
  setRole: (role: UserRole) => void;
  addOrder: (order: SalesOrder) => void;
  updateOrder: (order: SalesOrder) => void;
  submitOrder: (id: string) => void;
  approveOrder: (id: string, comment?: string) => void;
  returnOrder: (id: string, comment: string) => void;
  reconcileOrder: (id: string) => void;
  transitionWorkOrder: (id: string, status: WorkOrderStatus) => void;
  resetDemo: () => void;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const workflowTime = () =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

const appendEvent = (order: SalesOrder, event: Omit<DocumentEvent, "id" | "at">): SalesOrder => ({
  ...order,
  events: [
    ...(order.events ?? []),
    { ...event, id: `event-${Date.now()}`, at: workflowTime() },
  ],
});

const initialState = () => ({
  products: clone(products),
  boms: clone(boms),
  customers: clone(customers),
  orders: clone(orders),
  workOrders: clone(workOrders),
  zones: clone(twinZones),
  activities: clone(activityEvents),
});

export const useNoraStore = create<NoraState>()(
  persist(
    (set) => ({
      currentRole: "owner",
      ...initialState(),
      setRole: (currentRole) => set({ currentRole }),
      addOrder: (order) => set((state) => ({
        orders: [order, ...state.orders],
        activities: [{ id: `a-${Date.now()}`, title: "新订单", detail: `${order.code} 已创建`, time: "刚刚", tone: "info" }, ...state.activities],
      })),
      updateOrder: (updatedOrder) => set((state) => ({
        orders: state.orders.map((order) => order.id === updatedOrder.id ? updatedOrder : order),
        activities: [{ id: `a-${Date.now()}`, title: "订单已更新", detail: `${updatedOrder.code} · ${updatedOrder.status === "pending" ? "已重新提交审核" : "草稿已保存"}`, time: "刚刚", tone: updatedOrder.status === "pending" ? "info" : "neutral" }, ...state.activities],
      })),
      submitOrder: (id) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id
            ? appendEvent(
                { ...order, status: "pending" },
                { type: "submitted", label: "提交审核", actor: "老板" },
              )
            : order,
        ),
        activities: [{ id: `a-${Date.now()}`, title: "订单待审核", detail: `${state.orders.find((order) => order.id === id)?.code ?? "订单"} 已提交审核`, time: "刚刚", tone: "warning" }, ...state.activities],
      })),
      approveOrder: (id, comment) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id
            ? appendEvent(
                { ...order, status: "approved" },
                { type: "approved", label: "审核通过", actor: "老板", comment },
              )
            : order,
        ),
        activities: [{ id: `a-${Date.now()}`, title: "订单已审核", detail: `${state.orders.find((order) => order.id === id)?.code ?? "订单"} 已进入生产需求`, time: "刚刚", tone: "success" }, ...state.activities],
      })),
      returnOrder: (id, comment) => set((state) => ({
        orders: state.orders.map((order) =>
          order.id === id
            ? appendEvent(
                { ...order, status: "draft" },
                { type: "returned", label: "退回修改", actor: "老板", comment },
              )
            : order,
        ),
        activities: [{ id: `a-${Date.now()}`, title: "订单已退回", detail: `${state.orders.find((order) => order.id === id)?.code ?? "订单"} · ${comment}`, time: "刚刚", tone: "warning" }, ...state.activities],
      })),
      reconcileOrder: (id) => set((state) => ({
        orders: state.orders.map((order) => order.id === id ? { ...order, status: "reconciled" } : order),
      })),
      transitionWorkOrder: (id, status) => set((state) => {
        const workOrder = state.workOrders.find((item) => item.id === id);
        if (!workOrder) return state;
        const progress = status === "completed" || status === "closed" ? 100 : status === "in_progress" ? Math.max(workOrder.progress, 8) : workOrder.progress;
        const completedQuantity = progress === 100 ? workOrder.plannedQuantity : workOrder.completedQuantity;
        const zoneStatus = status === "in_progress" ? "running" : status === "paused" ? "waiting" : "normal";
        return {
          workOrders: state.workOrders.map((item) => item.id === id ? { ...item, status, progress, completedQuantity } : item),
          zones: state.zones.map((zone) => zone.id === workOrder.zoneId ? { ...zone, status: zoneStatus, progress } : zone),
          activities: [{ id: `a-${Date.now()}`, title: status === "completed" ? "工单已完成" : "工单状态更新", detail: `${workOrder.code} · ${workOrder.productName}`, time: "刚刚", tone: status === "completed" ? "success" : "info" }, ...state.activities],
        };
      }),
      resetDemo: () => set({ currentRole: "owner", ...initialState() }),
    }),
    {
      name: "nora-demo-v1",
      version: 3,
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<NoraState>;
        if (version < 3) {
          return {
            ...persisted,
            workOrders: clone(workOrders),
            zones: clone(twinZones),
          } as NoraState;
        }
        return persistedState as NoraState;
      },
      partialize: (state) => ({ currentRole: state.currentRole, products: state.products, boms: state.boms, customers: state.customers, orders: state.orders, workOrders: state.workOrders, zones: state.zones, activities: state.activities }),
    },
  ),
);
