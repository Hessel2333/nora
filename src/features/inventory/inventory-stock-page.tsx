"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Boxes,
  Clock3,
  History,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { useNoraIdentity } from "@/features/auth/nora-identity-provider";
import { Badge, Button, Card, Field, MetricCard, Modal, PageHeader, inputClass } from "@/components/ui";
import { noraApi } from "@/lib/nora-api";
import { useNoraStore } from "@/lib/store";
import type {
  InventoryLocation,
  InventoryLotQualityStatus,
  InventoryStockBalance,
  InventoryTransaction,
  Product,
  StatusTone,
} from "@/lib/types";
import { filterInventoryStock, inventoryExpirySignal, inventoryStockMetrics } from "./inventory-view";

const qualityMeta: Record<InventoryLotQualityStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "待检", tone: "warning" },
  released: { label: "已放行", tone: "success" },
  quarantined: { label: "已隔离", tone: "danger" },
  rejected: { label: "不合格", tone: "danger" },
};

const transactionTypeLabel: Record<InventoryTransaction["type"], string> = {
  opening_balance: "期初入账",
  receipt: "收货入库",
  issue: "生产领料",
  return: "生产退料",
  produce: "生产入库",
  transfer_in: "调拨入库",
  transfer_out: "调拨出库",
  adjust_in: "盘盈调整",
  adjust_out: "盘亏调整",
  scrap: "报废",
  reversal: "冲销",
};

const demoLocations: InventoryLocation[] = [
  { id: "demo-raw-cold", factoryCode: "SZ-CENTRAL", code: "RAW-COLD-01", name: "原料冷藏库", type: "cold_storage", active: true },
  { id: "demo-raw-frozen", factoryCode: "SZ-CENTRAL", code: "RAW-FROZEN-01", name: "原料冷冻库", type: "frozen_storage", active: true },
  { id: "demo-quarantine", factoryCode: "SZ-CENTRAL", code: "QUARANTINE-01", name: "待检隔离区", type: "quarantine", active: true },
];

function localInputValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function displayInputValue(value: string) {
  return value.replace("T", " ");
}

function demoStock(products: Product[]): InventoryStockBalance[] {
  return products.filter((product) => product.stock > 0).map((product, index) => {
    const location = product.name.includes("冷冻") ? demoLocations[1] : demoLocations[0];
    const expires = new Date(Date.now() + (index + 3) * 86_400_000);
    return {
      id: `demo-balance-${product.id}`,
      location,
      product: { id: product.id, code: product.code, name: product.name, category: product.category },
      lot: {
        id: `demo-lot-${product.id}`,
        code: `DEMO-${product.code}-01`,
        supplierLotCode: `SUP-${String(index + 1).padStart(3, "0")}`,
        qualityStatus: index === 2 ? "pending" : "released",
        receivedAt: "2026-08-20 08:00",
        productionAt: null,
        expiresAt: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short" }).format(expires),
      },
      onHandQuantity: product.stock.toFixed(3),
      availableQuantity: index === 2 ? "0.000" : product.stock.toFixed(3),
      unit: product.unit,
      revision: 1,
      updatedAt: "2026-08-20 08:00",
    };
  });
}

export function InventoryStockPage() {
  const mode = useNoraStore((state) => state.mode);
  const { can } = useNoraIdentity();
  const canManageInventory = can("inventory:write");
  const backendStatus = useNoraStore((state) => state.backendStatus);
  const backendError = useNoraStore((state) => state.backendError);
  const products = useNoraStore((state) => state.products);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [stock, setStock] = useState<InventoryStockBalance[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(mode !== "demo");
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [openingOpen, setOpeningOpen] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    locationId: "",
    productId: "",
    lotCode: "",
    supplierLotCode: "",
    quantity: "",
    qualityStatus: "released" as InventoryLotQualityStatus,
    receivedAt: localInputValue(),
    expiresAt: "",
    note: "上线盘点期初库存",
  });
  const commandKey = useRef("");

  useEffect(() => {
    if (mode === "demo") {
      setLocations(demoLocations);
      setStock(demoStock(products));
      setTransactions([]);
      setLoading(false);
      setError("");
      return;
    }
    if (backendStatus === "offline") {
      setLoading(false);
      setError(backendError ?? "后端服务不可用，请检查连接后重试。");
      return;
    }
    if (backendStatus !== "ready") return;
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([noraApi.inventoryLocations(), noraApi.inventoryStock(), noraApi.inventoryTransactions()])
      .then(([locationResult, stockResult, transactionResult]) => {
        if (!active) return;
        setLocations(locationResult.data);
        setStock(stockResult.data);
        setTransactions(transactionResult.data);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "库存台账加载失败，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backendError, backendStatus, mode, products, requestVersion]);

  const rows = useMemo(() => filterInventoryStock(stock, query, locationFilter), [locationFilter, query, stock]);
  const metrics = useMemo(() => inventoryStockMetrics(stock), [stock]);
  const activeProducts = useMemo(() => products.filter((product) => product.status === "active"), [products]);
  const selectedProduct = activeProducts.find((product) => product.id === form.productId);

  function openOpeningBalance() {
    if (!canManageInventory) return;
    setSubmitError("");
    setForm((current) => ({
      ...current,
      locationId: current.locationId || locations[0]?.id || "",
      productId: current.productId || activeProducts[0]?.id || "",
      receivedAt: localInputValue(),
    }));
    setOpeningOpen(true);
  }

  async function submitOpeningBalance(event: FormEvent) {
    event.preventDefault();
    const product = activeProducts.find((item) => item.id === form.productId);
    const location = locations.find((item) => item.id === form.locationId);
    const quantity = Number(form.quantity);
    if (!product || !location || !form.lotCode.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      setSubmitError("请选择库位和产品，并填写有效批次号与正数数量。");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      if (mode === "demo") {
        const created: InventoryStockBalance = {
          id: `demo-balance-${crypto.randomUUID()}`,
          location,
          product: { id: product.id, code: product.code, name: product.name, category: product.category },
          lot: {
            id: `demo-lot-${crypto.randomUUID()}`,
            code: form.lotCode.trim().toUpperCase(),
            supplierLotCode: form.supplierLotCode.trim() || null,
            qualityStatus: form.qualityStatus,
            receivedAt: displayInputValue(form.receivedAt),
            productionAt: null,
            expiresAt: form.expiresAt ? displayInputValue(form.expiresAt) : null,
          },
          onHandQuantity: quantity.toFixed(3),
          availableQuantity: form.qualityStatus === "released" ? quantity.toFixed(3) : "0.000",
          unit: product.unit,
          revision: 1,
          updatedAt: displayInputValue(localInputValue()),
        };
        setStock((current) => [created, ...current]);
      } else {
        const idempotencyKey = commandKey.current || `inventory-opening:${crypto.randomUUID()}`;
        commandKey.current = idempotencyKey;
        const result = await noraApi.createOpeningBalance({
          locationId: location.id,
          productId: product.id,
          lotCode: form.lotCode.trim(),
          supplierLotCode: form.supplierLotCode.trim() || undefined,
          quantity: quantity.toFixed(3),
          unit: product.unit,
          qualityStatus: form.qualityStatus,
          receivedAt: new Date(form.receivedAt).toISOString(),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          note: form.note.trim() || undefined,
        }, idempotencyKey);
        commandKey.current = "";
        setStock((current) => [result.balance, ...current.filter((item) => item.id !== result.balance.id)]);
        setTransactions((current) => [result.transaction, ...current.filter((item) => item.id !== result.transaction.id)]);
      }
      setOpeningOpen(false);
      setForm((current) => ({ ...current, lotCode: "", supplierLotCode: "", quantity: "", expiresAt: "" }));
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : "期初库存登记失败，请保留当前内容后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="库存台账"
        metadata={(
          <HelpTip title="库存依据" href="/help/execution/execution-and-traceability">
            {mode === "demo"
              ? "当前为演示批次库存，可体验筛选和期初入账，不会写入正式台账。"
              : "账面数量来自不可变库存流水；产品档案中的库存数字不参与这里的计算。"}
          </HelpTip>
        )}
        actions={(
          <span className="flex items-center gap-2">
            {!canManageInventory ? <span className="text-xs text-[var(--text-tertiary)]">当前身份没有库存登记权限</span> : null}
            <Button onClick={openOpeningBalance} disabled={!canManageInventory || locations.length === 0}>
              <PackagePlus size={16} />登记期初库存
            </Button>
          </span>
        )}
      />

      {error ? (
        <Card className="px-6 py-14 text-center" role="alert">
          <AlertTriangle className="mx-auto text-[var(--status-danger)]" />
          <h2 className="mt-3 font-semibold">库存台账暂时无法加载</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--text-tertiary)]">{error}</p>
          <Button className="mt-5" variant="secondary" onClick={() => setRequestVersion((version) => version + 1)}>
            <RefreshCw size={15} />重新加载
          </Button>
        </Card>
      ) : loading ? (
        <InventoryLoading />
      ) : (
        <>
          <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
            <MetricCard label="有账面库存" value={String(metrics.lotCount)} suffix="批" icon={Boxes} />
            <MetricCard label="可用批次" value={String(metrics.availableLotCount)} suffix="批" icon={ShieldCheck} tone="success" />
            <MetricCard label="待检或隔离" value={String(metrics.heldLotCount)} suffix="批" icon={Warehouse} tone="warning" />
            <MetricCard label="过期或近效期" value={String(metrics.expiringLotCount)} suffix="批" icon={Clock3} tone={metrics.expiringLotCount ? "danger" : "neutral"} />
          </div>

          <Card className="overflow-hidden">
            <div className="grid gap-3 border-b border-[var(--stroke-subtle)] p-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input aria-label="搜索库存" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="搜索产品、批次、供应商批次或库位" />
              </div>
              <select aria-label="筛选库位" value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className={inputClass}>
                <option value="">全部库位</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </div>
            {rows.length ? <InventoryRows rows={rows} /> : <InventoryEmpty filtered={stock.length > 0} canCreate={canManageInventory && locations.length > 0} onCreate={openOpeningBalance} />}
          </Card>

          <Card className="mt-4 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-[var(--stroke-subtle)] px-4 py-3">
              <History size={16} className="text-[var(--text-tertiary)]" />
              <h2 className="text-sm font-semibold">最近库存流水</h2>
            </div>
            {transactions.length ? (
              <div className="divide-y divide-[var(--stroke-subtle)]">
                {transactions.slice(0, 8).map((transaction) => (
                  <div key={transaction.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span><b>{transactionTypeLabel[transaction.type]}</b><span className="ml-2 text-[var(--text-tertiary)]">{transaction.product.name} · {transaction.lot.code}</span></span>
                    <span className="flex items-center gap-3 tabular-nums"><b className={transaction.direction === "inbound" ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}>{transaction.direction === "inbound" ? "+" : "−"}{transaction.quantity} {transaction.unit}</b><span className="text-xs text-[var(--text-tertiary)]">{transaction.occurredAt} · {transaction.actor}</span></span>
                  </div>
                ))}
              </div>
            ) : <p className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">还没有正式库存流水。完成首次期初入账后，这里会保留不可修改的记录。</p>}
          </Card>
        </>
      )}

      <Modal
        open={openingOpen}
        onOpenChange={(open) => { if (!submitting) setOpeningOpen(open); }}
        title="登记期初库存"
        description="用于系统上线时盘点已有实物库存。提交后流水不可修改，请先核对批次和数量。"
        footer={(
          <><Button type="button" variant="secondary" disabled={submitting} onClick={() => setOpeningOpen(false)}>取消</Button><Button type="submit" form="opening-balance-form" disabled={submitting}>{submitting ? "正在入账…" : "确认入账"}</Button></>
        )}
      >
        <form id="opening-balance-form" onSubmit={submitOpeningBalance} className="space-y-4">
          {submitError ? <div className="rounded-xl bg-[var(--status-danger-soft)] px-4 py-3 text-sm text-[var(--status-danger)]" role="alert">{submitError}</div> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="库存库位" required><select value={form.locationId} onChange={(event) => setForm({ ...form, locationId: event.target.value })} className={inputClass} required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
            <Field label="产品" required><select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })} className={inputClass} required>{activeProducts.map((product) => <option key={product.id} value={product.id}>{product.code} · {product.name}</option>)}</select></Field>
            <Field label="内部批次号" required><input value={form.lotCode} onChange={(event) => setForm({ ...form, lotCode: event.target.value })} className={inputClass} maxLength={64} placeholder="例如 OPEN-20260820-001" required /></Field>
            <Field label="供应商批次"><input value={form.supplierLotCode} onChange={(event) => setForm({ ...form, supplierLotCode: event.target.value })} className={inputClass} maxLength={80} placeholder="选填" /></Field>
            <Field label={`数量${selectedProduct ? `（${selectedProduct.unit}）` : ""}`} required><input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className={inputClass} inputMode="decimal" required /></Field>
            <Field label="质量状态" required><select value={form.qualityStatus} onChange={(event) => setForm({ ...form, qualityStatus: event.target.value as InventoryLotQualityStatus })} className={inputClass}><option value="released">已放行</option><option value="pending">待检</option><option value="quarantined">已隔离</option><option value="rejected">不合格</option></select></Field>
            <Field label="收货时间" required><input type="datetime-local" value={form.receivedAt} onChange={(event) => setForm({ ...form, receivedAt: event.target.value })} className={inputClass} required /></Field>
            <Field label="失效时间"><input type="datetime-local" value={form.expiresAt} min={form.receivedAt} onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} className={inputClass} /></Field>
          </div>
          <Field label="盘点备注"><textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className={`${inputClass} min-h-24 py-3`} maxLength={500} /></Field>
        </form>
      </Modal>
    </>
  );
}

function InventoryRows({ rows }: { rows: InventoryStockBalance[] }) {
  return (
    <>
      <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
        {rows.map((row) => {
          const quality = qualityMeta[row.lot.qualityStatus];
          const expiry = inventoryExpirySignal(row.lot.expiresAt);
          return <article key={row.id} className="p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{row.product.code}</span><h2 className="mt-1 truncate font-semibold">{row.product.name}</h2><p className="mt-1 text-xs text-[var(--text-tertiary)]">{row.location.name} · {row.lot.code}</p></span><Badge tone={quality.tone}>{quality.label}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-muted)] p-3 text-xs"><span><span className="block text-[var(--text-tertiary)]">账面数量</span><b className="mt-1 block tabular-nums">{row.onHandQuantity} {row.unit}</b></span><span><span className="block text-[var(--text-tertiary)]">可用数量</span><b className="mt-1 block tabular-nums">{row.availableQuantity} {row.unit}</b></span></div><p className={`mt-3 text-xs ${expiry === "expired" || expiry === "near" ? "text-[var(--status-danger)]" : "text-[var(--text-tertiary)]"}`}>失效时间：{row.lot.expiresAt ?? "未设置"}</p></article>;
        })}
      </div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1040px] text-left"><thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]"><tr><th className="px-5 py-3">产品</th><th className="px-5 py-3">库存批次</th><th className="px-5 py-3">库位</th><th className="px-5 py-3">账面数量</th><th className="px-5 py-3">可用数量</th><th className="px-5 py-3">质量状态</th><th className="px-5 py-3">失效时间</th><th className="px-5 py-3">更新时间</th></tr></thead><tbody>{rows.map((row) => { const quality = qualityMeta[row.lot.qualityStatus]; const expiry = inventoryExpirySignal(row.lot.expiresAt); return <tr key={row.id} className="border-t border-[var(--stroke-subtle)] hover:bg-[var(--surface-subtle)]"><td className="px-5 py-4"><b className="text-sm">{row.product.name}</b><p className="mt-1 font-mono text-[10px] text-[var(--text-tertiary)]">{row.product.code} · {row.product.category}</p></td><td className="px-5 py-4"><b className="font-mono text-xs">{row.lot.code}</b><p className="mt-1 text-[10px] text-[var(--text-tertiary)]">{row.lot.supplierLotCode ?? "无供应商批次"}</p></td><td className="px-5 py-4 text-sm">{row.location.name}<p className="mt-1 font-mono text-[10px] text-[var(--text-tertiary)]">{row.location.code}</p></td><td className="px-5 py-4 font-semibold tabular-nums">{row.onHandQuantity} {row.unit}</td><td className="px-5 py-4 font-semibold tabular-nums text-[var(--status-success)]">{row.availableQuantity} {row.unit}</td><td className="px-5 py-4"><Badge tone={quality.tone}>{quality.label}</Badge></td><td className={`px-5 py-4 text-xs tabular-nums ${expiry === "expired" || expiry === "near" ? "font-semibold text-[var(--status-danger)]" : "text-[var(--text-secondary)]"}`}>{row.lot.expiresAt ?? "—"}</td><td className="px-5 py-4 text-xs tabular-nums text-[var(--text-tertiary)]">{row.updatedAt}</td></tr>; })}</tbody></table></div>
    </>
  );
}

function InventoryEmpty({ filtered, canCreate, onCreate }: { filtered: boolean; canCreate: boolean; onCreate: () => void }) {
  return <div className="px-6 py-14 text-center"><Warehouse className="mx-auto text-[var(--text-tertiary)]" /><h2 className="mt-3 font-semibold">{filtered ? "没有匹配的库存批次" : "还没有正式库存余额"}</h2><p className="mx-auto mt-1 max-w-lg text-sm text-[var(--text-tertiary)]">{filtered ? "调整搜索条件或库位筛选后再试。" : "完成上线盘点后，按库位和实物批次登记期初库存。"}</p>{canCreate && !filtered ? <Button className="mt-5" variant="secondary" onClick={onCreate}><PackagePlus size={15} />登记第一批库存</Button> : null}</div>;
}

function InventoryLoading() {
  return <Card className="overflow-hidden" aria-busy="true"><div className="h-16 animate-pulse bg-[var(--surface-muted)]" /><div className="space-y-px">{[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse bg-[var(--surface-subtle)]" />)}</div></Card>;
}
