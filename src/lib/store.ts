"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { activityEvents, boms, customers, orders, products, twinZones, workOrders } from "./mock-data";
import { noraApi } from "./nora-api";
import type { ActivityEvent, Bom, Customer, DocumentEvent, Product, SalesOrder, TwinZone, UserRole, WorkOrder, WorkOrderStatus } from "./types";

interface NoraState {
  backendStatus: "idle" | "loading" | "ready" | "offline";
  backendError?: string;
  currentRole: UserRole;
  products: Product[];
  boms: Bom[];
  customers: Customer[];
  orders: SalesOrder[];
  workOrders: WorkOrder[];
  zones: TwinZone[];
  activities: ActivityEvent[];
  setRole: (role: UserRole) => void;
  hydrateBackend: () => Promise<void>;
  addOrder: (order: SalesOrder) => Promise<SalesOrder>;
  updateOrder: (order: SalesOrder) => Promise<SalesOrder>;
  submitOrder: (id: string) => Promise<SalesOrder>;
  approveOrder: (id: string, comment?: string) => Promise<SalesOrder>;
  returnOrder: (id: string, comment: string) => Promise<SalesOrder>;
  copyBomVersion: (id: string, version: string, sourceVersionId?: string) => Promise<Bom>;
  publishBomVersion: (versionId: string) => Promise<Bom>;
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
    (set, get) => ({
      currentRole: "owner",
      backendStatus: "idle",
      ...initialState(),
      setRole: (currentRole) => set({ currentRole }),
      hydrateBackend: async () => {
        const current = get();
        if (current.backendStatus === "loading" || current.backendStatus === "ready") return;
        set({ backendStatus: "loading", backendError: undefined });
        try {
          const data = await noraApi.bootstrap();
          set({ ...data, backendStatus: "ready", backendError: undefined });
        } catch (error) {
          set({ backendStatus: "offline", backendError: error instanceof Error ? error.message : "后端服务不可用" });
        }
      },
      addOrder: async (order) => {
        const persisted = get().backendStatus === "ready" ? await noraApi.createOrder(order) : order;
        set((state) => ({
          orders: [persisted, ...state.orders],
          activities: [{ id: `a-${Date.now()}`, title: "新订单", detail: `${persisted.code} 已创建`, time: "刚刚", tone: "info" }, ...state.activities],
        }));
        return persisted;
      },
      updateOrder: async (updatedOrder) => {
        const persisted = get().backendStatus === "ready" ? await noraApi.updateOrder(updatedOrder) : updatedOrder;
        set((state) => ({
          orders: state.orders.map((order) => order.id === persisted.id ? persisted : order),
          activities: [{ id: `a-${Date.now()}`, title: "订单已更新", detail: `${persisted.code} · ${persisted.status === "pending" ? "已重新提交审核" : "草稿已保存"}`, time: "刚刚", tone: persisted.status === "pending" ? "info" : "neutral" }, ...state.activities],
        }));
        return persisted;
      },
      submitOrder: async (id) => {
        const state = get();
        const local = state.orders.find((order) => order.id === id);
        if (!local) throw new Error("订单不存在");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.submitOrder(id)
          : appendEvent({ ...local, status: "pending" }, { type: "submitted", label: "提交审核", actor: "老板" });
        set((current) => ({
          orders: current.orders.map((order) => order.id === id ? persisted : order),
          activities: [{ id: `a-${Date.now()}`, title: "订单待审核", detail: `${persisted.code} 已提交审核`, time: "刚刚", tone: "warning" }, ...current.activities],
        }));
        return persisted;
      },
      approveOrder: async (id, comment) => {
        const state = get();
        const local = state.orders.find((order) => order.id === id);
        if (!local) throw new Error("订单不存在");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.approveOrder(id, comment)
          : appendEvent({ ...local, status: "approved" }, { type: "approved", label: "审核通过", actor: "老板", comment });
        set((current) => ({
          orders: current.orders.map((order) => order.id === id ? persisted : order),
          activities: [{ id: `a-${Date.now()}`, title: "订单已审核", detail: `${persisted.code} 已进入生产需求`, time: "刚刚", tone: "success" }, ...current.activities],
        }));
        return persisted;
      },
      returnOrder: async (id, comment) => {
        const state = get();
        const local = state.orders.find((order) => order.id === id);
        if (!local) throw new Error("订单不存在");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.returnOrder(id, comment)
          : appendEvent({ ...local, status: "draft" }, { type: "returned", label: "退回修改", actor: "老板", comment });
        set((current) => ({
          orders: current.orders.map((order) => order.id === id ? persisted : order),
          activities: [{ id: `a-${Date.now()}`, title: "订单已退回", detail: `${persisted.code} · ${comment}`, time: "刚刚", tone: "warning" }, ...current.activities],
        }));
        return persisted;
      },
      copyBomVersion: async (id, version, sourceVersionId) => {
        const updated = await noraApi.copyBomVersion(id, version, sourceVersionId);
        set((state) => ({ boms: state.boms.map((bom) => bom.id === id ? updated : bom) }));
        return updated;
      },
      publishBomVersion: async (versionId) => {
        const updated = await noraApi.publishBomVersion(versionId);
        set((state) => ({ boms: state.boms.map((bom) => bom.id === updated.id ? updated : bom) }));
        return updated;
      },
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
      resetDemo: () => {
        if (get().backendStatus === "ready") {
          set({ backendStatus: "loading", backendError: undefined });
          void noraApi.bootstrap()
            .then((data) => set({ ...data, currentRole: "owner", backendStatus: "ready", backendError: undefined }))
            .catch((error) => set({ backendStatus: "offline", backendError: error instanceof Error ? error.message : "后端服务不可用" }));
          return;
        }
        set({ currentRole: "owner", backendStatus: "idle", backendError: undefined, ...initialState() });
      },
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
