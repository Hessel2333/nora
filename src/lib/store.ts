"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { activityEvents, boms, customers, orders, products, twinZones, workOrders } from "./mock-data";
import { noraApi } from "./nora-api";
import { assertLocalDemoWrite, getNoraRuntimeMode, type NoraRuntimeMode } from "./runtime-mode";
import type { ActivityEvent, Bom, Customer, DocumentEvent, Product, SalesOrder, TwinZone, UserRole, WorkOrder, WorkOrderStatus } from "./types";

interface NoraState {
  runtimeMode: NoraRuntimeMode;
  mode: NoraRuntimeMode;
  demoPreview: boolean;
  backendStatus: "idle" | "loading" | "ready" | "offline" | "demo";
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
  setDemoPreview: (enabled: boolean) => Promise<void>;
  hydrateBackend: () => Promise<void>;
  addOrder: (order: SalesOrder) => Promise<SalesOrder>;
  updateOrder: (order: SalesOrder) => Promise<SalesOrder>;
  submitOrder: (id: string) => Promise<SalesOrder>;
  approveOrder: (id: string, comment?: string) => Promise<SalesOrder>;
  returnOrder: (id: string, comment: string) => Promise<SalesOrder>;
  copyBomVersion: (id: string, version: string, sourceVersionId?: string) => Promise<Bom>;
  updateBomVersion: (versionId: string, bom: Bom) => Promise<Bom>;
  publishBomVersion: (versionId: string, revision: number, effectiveAt?: string) => Promise<Bom>;
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

const mode = getNoraRuntimeMode();
const demoPreviewStorageKey = `nora-${mode}-demo-preview`;
const unavailableStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function demoPreviewRequested() {
  return typeof window !== "undefined"
    && window.sessionStorage.getItem(demoPreviewStorageKey) === "true";
}

function rememberDemoPreview(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) window.sessionStorage.setItem(demoPreviewStorageKey, "true");
  else window.sessionStorage.removeItem(demoPreviewStorageKey);
}

const emptyState = () => ({
  products: [],
  boms: [],
  customers: [],
  orders: [],
  workOrders: [],
  zones: [],
  activities: [],
});

const demoState = () => ({
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
      runtimeMode: mode,
      mode,
      demoPreview: false,
      currentRole: "owner",
      backendStatus: mode === "demo" ? "demo" : "idle",
      ...(mode === "demo" ? demoState() : emptyState()),
      setRole: (currentRole) => set({ currentRole }),
      setDemoPreview: async (enabled) => {
        const state = get();
        if (state.runtimeMode !== "development" || state.demoPreview === enabled) return;
        if (enabled) {
          rememberDemoPreview(true);
          set({
            mode: "demo",
            demoPreview: true,
            backendStatus: "demo",
            backendError: undefined,
            ...demoState(),
          });
          return;
        }
        rememberDemoPreview(false);
        set({
          mode: state.runtimeMode,
          demoPreview: false,
          backendStatus: "idle",
          backendError: undefined,
          ...emptyState(),
        });
        await get().hydrateBackend();
      },
      hydrateBackend: async () => {
        const current = get();
        if (current.runtimeMode === "development" && demoPreviewRequested()) {
          set({
            mode: "demo",
            demoPreview: true,
            backendStatus: "demo",
            backendError: undefined,
            ...demoState(),
          });
          return;
        }
        if (current.mode === "demo") return;
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
        const state = get();
        if (state.backendStatus !== "ready") assertLocalDemoWrite(state.mode, "创建订单");
        const persisted = state.backendStatus === "ready" ? await noraApi.createOrder(order) : order;
        set((state) => ({
          orders: [persisted, ...state.orders],
          activities: [{ id: `a-${Date.now()}`, title: "新订单", detail: `${persisted.code} 已创建`, time: "刚刚", tone: "info" }, ...state.activities],
        }));
        return persisted;
      },
      updateOrder: async (updatedOrder) => {
        const state = get();
        if (state.backendStatus !== "ready") assertLocalDemoWrite(state.mode, "更新订单");
        const persisted = state.backendStatus === "ready" ? await noraApi.updateOrder(updatedOrder) : updatedOrder;
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
        if (state.backendStatus !== "ready") assertLocalDemoWrite(state.mode, "提交订单");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.submitOrder(id)
          : appendEvent({ ...local, status: "pending" }, { type: "submitted", label: "提交审核", actor: "演示用户" });
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
        if (state.backendStatus !== "ready") assertLocalDemoWrite(state.mode, "审核订单");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.approveOrder(id, comment)
          : appendEvent({ ...local, status: "approved" }, { type: "approved", label: "审核通过", actor: "演示用户", comment });
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
        if (state.backendStatus !== "ready") assertLocalDemoWrite(state.mode, "退回订单");
        const persisted = state.backendStatus === "ready"
          ? await noraApi.returnOrder(id, comment)
          : appendEvent({ ...local, status: "draft" }, { type: "returned", label: "退回修改", actor: "演示用户", comment });
        set((current) => ({
          orders: current.orders.map((order) => order.id === id ? persisted : order),
          activities: [{ id: `a-${Date.now()}`, title: "订单已退回", detail: `${persisted.code} · ${comment}`, time: "刚刚", tone: "warning" }, ...current.activities],
        }));
        return persisted;
      },
      copyBomVersion: async (id, version, sourceVersionId) => {
        const state = get();
        const updated = state.backendStatus === "ready"
          ? await noraApi.copyBomVersion(id, version, sourceVersionId)
          : copyDemoBomVersion(state.mode, state.boms, id, version);
        set((state) => ({ boms: state.boms.map((bom) => bom.id === id ? updated : bom) }));
        return updated;
      },
      updateBomVersion: async (versionId, bom) => {
        const state = get();
        const updated = state.backendStatus === "ready"
          ? await noraApi.updateBomVersion(versionId, bom)
          : updateDemoBomVersion(state.mode, state.boms, versionId, bom);
        set((state) => ({ boms: state.boms.map((item) => item.id === updated.id ? updated : item) }));
        return updated;
      },
      publishBomVersion: async (versionId, revision, effectiveAt) => {
        const state = get();
        const updated = state.backendStatus === "ready"
          ? await noraApi.publishBomVersion(versionId, revision, effectiveAt)
          : publishDemoBomVersion(state.mode, state.boms, versionId, revision, effectiveAt);
        set((state) => ({ boms: state.boms.map((bom) => bom.id === updated.id ? updated : bom) }));
        return updated;
      },
      reconcileOrder: (id) => {
        assertLocalDemoWrite(get().mode, "订单对账");
        set((state) => ({
          orders: state.orders.map((order) => order.id === id ? { ...order, status: "reconciled" } : order),
        }));
      },
      transitionWorkOrder: (id, status) => {
        assertLocalDemoWrite(get().mode, "工单状态更新");
        set((state) => {
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
        });
      },
      resetDemo: () => {
        if (get().mode !== "demo") {
          set({ backendStatus: "loading", backendError: undefined });
          void noraApi.bootstrap()
            .then((data) => set({ ...data, currentRole: "owner", backendStatus: "ready", backendError: undefined }))
            .catch((error) => set({ backendStatus: "offline", backendError: error instanceof Error ? error.message : "后端服务不可用" }));
          return;
        }
        set({ currentRole: "owner", backendStatus: "demo", backendError: undefined, ...demoState() });
      },
    }),
    {
      name: `nora-${mode}-v1`,
      storage: createJSONStorage(() => typeof window === "undefined" ? unavailableStorage : window.localStorage),
      version: 5,
      migrate: (persistedState, version) => {
        const persisted = persistedState as Partial<NoraState>;
        if (mode !== "demo") {
          return { ...emptyState(), currentRole: persisted.currentRole ?? "owner" } as unknown as NoraState;
        }
        if (version < 5) {
          return {
            ...demoState(),
            currentRole: persisted.currentRole ?? "owner",
          } as NoraState;
        }
        return persistedState as NoraState;
      },
      partialize: (state) => mode === "demo"
        ? { currentRole: state.currentRole, products: state.products, boms: state.boms, customers: state.customers, orders: state.orders, workOrders: state.workOrders, zones: state.zones, activities: state.activities }
        : { currentRole: state.currentRole },
    },
  ),
);

function copyDemoBomVersion(mode: NoraRuntimeMode, currentBoms: Bom[], id: string, version: string) {
  assertLocalDemoWrite(mode, "复制生产配方版本");
  const bom = currentBoms.find((item) => item.id === id);
  if (!bom) throw new Error("生产配方不存在");
  const versionId = `demo-bom-version-${Date.now()}`;
  const versions = demoBomVersions(bom);
  return {
    ...clone(bom),
    versionId,
    previousVersion: bom.version,
    version,
    status: "draft" as const,
    revision: 1,
    versions: [
      ...versions,
      {
        id: versionId,
        version,
        status: "draft" as const,
        effectiveAt: null,
        effectiveTo: null,
        publishedAt: null,
        revision: 1,
        events: [{
          id: `demo-bom-event-${Date.now()}`,
          type: "created" as const,
          actor: "演示用户",
          revision: 1,
          effectiveAt: null,
          createdAt: new Date().toISOString(),
        }],
      },
    ],
  };
}

function publishDemoBomVersion(
  mode: NoraRuntimeMode,
  currentBoms: Bom[],
  versionId: string,
  revision: number,
  effectiveAtInput?: string,
) {
  assertLocalDemoWrite(mode, "发布生产配方版本");
  const bom = currentBoms.find((item) => item.versionId === versionId || item.versions?.some((version) => version.id === versionId));
  if (!bom) throw new Error("生产配方版本不存在");
  const now = new Date();
  const effectiveAtDate = effectiveAtInput ? new Date(effectiveAtInput) : now;
  if (Number.isNaN(effectiveAtDate.getTime())) throw new Error("配方生效时间无效");
  const effectiveAt = effectiveAtDate.toISOString();
  const versions = demoBomVersions(bom);
  const draft = versions.find((version) => version.id === versionId);
  if (!draft || draft.status !== "draft") throw new Error("只有草稿版本可以发布");
  if (draft.revision !== revision) throw new Error("配方版本已被更新，请刷新后重试");
  const previous = versions
    .filter((version) => version.status !== "draft" && version.effectiveAt)
    .sort((a, b) => new Date(b.effectiveAt ?? 0).getTime() - new Date(a.effectiveAt ?? 0).getTime())[0];
  if (previous?.effectiveAt && new Date(previous.effectiveAt) >= effectiveAtDate) {
    throw new Error("新版本生效时间必须晚于已发布版本");
  }
  if (previous?.effectiveTo && new Date(previous.effectiveTo) > effectiveAtDate) {
    throw new Error("新版本生效时间与已发布版本有效期重叠");
  }
  const eventTime = now.toISOString();
  return {
    ...clone(bom),
    status: "effective" as const,
    effectiveAt,
    effectiveTo: null,
    revision: revision + 1,
    versions: versions.map((version) => {
      if (version.id === versionId) {
        return {
          ...version,
          status: "effective" as const,
          effectiveAt,
          effectiveTo: null,
          publishedAt: eventTime,
          revision: version.revision + 1,
          events: [{
            id: `demo-bom-event-published-${Date.now()}`,
            type: "published" as const,
            actor: "演示用户",
            revision: version.revision + 1,
            effectiveAt,
            createdAt: eventTime,
          }, ...(version.events ?? [])],
        };
      }
      if (version.id === previous?.id && !version.effectiveTo) {
        return {
          ...version,
          status: effectiveAtDate <= now ? "retired" as const : version.status,
          effectiveTo: effectiveAt,
          revision: version.revision + 1,
          events: [{
            id: `demo-bom-event-superseded-${Date.now()}`,
            type: "superseded" as const,
            actor: "演示用户",
            revision: version.revision + 1,
            effectiveAt,
            createdAt: eventTime,
          }, ...(version.events ?? [])],
        };
      }
      return version;
    }),
  };
}

function demoBomVersions(bom: Bom): NonNullable<Bom["versions"]> {
  const versions = clone(bom.versions ?? []);
  const selectedId = bom.versionId ?? `demo-bom-version-current-${bom.id}`;
  if (!versions.some((version) => version.id === selectedId)) {
    versions.unshift({
      id: selectedId,
      version: bom.version,
      status: bom.status,
      effectiveAt: bom.effectiveAt || null,
      effectiveTo: bom.effectiveTo ?? null,
      publishedAt: bom.status === "draft" ? null : bom.effectiveAt || null,
      revision: bom.revision ?? 1,
      events: [],
    });
  }
  return versions;
}

function updateDemoBomVersion(
  runtimeMode: NoraRuntimeMode,
  allBoms: Bom[],
  versionId: string,
  draft: Bom,
) {
  assertLocalDemoWrite(runtimeMode, "更新配方版本");
  const source = allBoms.find((bom) => bom.versionId === versionId || bom.versions?.some((version) => version.id === versionId));
  if (!source) throw new Error("配方版本不存在");
  if (source.status !== "draft" || source.versionId !== versionId) throw new Error("只有当前草稿版本可以修改");
  const revision = (source.revision ?? 1) + 1;
  const eventTime = new Date().toISOString();
  return {
    ...clone(source),
    outputQuantity: draft.outputQuantity,
    outputUnit: draft.outputUnit,
    operations: clone(draft.operations),
    items: clone(draft.items),
    revision,
    versions: demoBomVersions(source).map((version) =>
      version.id === versionId
        ? {
            ...version,
            revision,
            events: [
              {
                id: `demo-bom-event-updated-${Date.now()}`,
                type: "updated" as const,
                actor: "演示用户",
                revision,
                effectiveAt: null,
                createdAt: eventTime,
              },
              ...(version.events ?? []),
            ],
          }
        : version,
    ),
  };
}
