"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Layers3,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
} from "lucide-react";
import { Badge, ButtonLink, Card, PageHeader, inputClass } from "@/components/ui";
import { getOrderBomCoverage } from "@/lib/bom-structure";
import { useNoraStore } from "@/lib/store";
import type { OrderStatus, SalesOrder, StatusTone } from "@/lib/types";
import { cn, formatCurrency, formatNumber, orderStatusLabel, statusTone } from "@/lib/utils";

type OrderFilter = "attention" | "all" | OrderStatus;

const filterOptions: Array<{ id: OrderFilter; label: string }> = [
  { id: "attention", label: "需要处理" },
  { id: "all", label: "全部订单" },
  { id: "pending", label: "待审核" },
  { id: "approved", label: "已审核" },
  { id: "draft", label: "草稿" },
  { id: "in_production", label: "生产中" },
  { id: "completed", label: "已完成" },
];

const totalOf = (order: SalesOrder) => order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

function parseDelivery(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function deliverySignal(order: SalesOrder, now = new Date()) {
  if (["completed", "reconciled"].includes(order.status)) return { label: "已完成", tone: "success" as StatusTone };
  const hours = (parseDelivery(order.deliveryAt).getTime() - now.getTime()) / 3_600_000;
  if (hours < 0) return { label: "已过交付时间", tone: "danger" as StatusTone };
  if (hours <= 12) return { label: `${Math.max(1, Math.ceil(hours))} 小时内交付`, tone: "warning" as StatusTone };
  if (hours <= 36) return { label: "明日交付", tone: "info" as StatusTone };
  return { label: order.deliveryAt, tone: "neutral" as StatusTone };
}

function isAttentionOrder(order: SalesOrder) {
  return order.status === "pending" || order.status === "draft" || deliverySignal(order).tone === "danger";
}

export function OrderCenterPage() {
  const orders = useNoraStore((state) => state.orders);
  const boms = useNoraStore((state) => state.boms);
  const mode = useNoraStore((state) => state.mode);
  const backendStatus = useNoraStore((state) => state.backendStatus);
  const sortedOrders = useMemo(() => [...orders].sort((left, right) => parseDelivery(left.deliveryAt).getTime() - parseDelivery(right.deliveryAt).getTime()), [orders]);
  const initialOrder = sortedOrders.find((order) => order.status === "pending") ?? sortedOrders[0];
  const [selectedId, setSelectedId] = useState(initialOrder?.id ?? "");
  const [filter, setFilter] = useState<OrderFilter>("attention");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sortedOrders.filter((order) => {
      const matchesFilter = filter === "all" ? true : filter === "attention" ? isAttentionOrder(order) : order.status === filter;
      const searchText = `${order.code}${order.customerName}${order.lines.map((line) => `${line.productCode}${line.productName}`).join("")}`.toLowerCase();
      return matchesFilter && (!normalized || searchText.includes(normalized));
    });
  }, [filter, query, sortedOrders]);
  const selectedOrder = orders.find((order) => order.id === selectedId) ?? rows[0] ?? sortedOrders[0];
  const selectedCoverage = selectedOrder ? getOrderBomCoverage(selectedOrder, boms) : undefined;
  const missingBomOrders = orders.filter((order) => !getOrderBomCoverage(order, boms).ready).length;
  const attentionCount = orders.filter(isAttentionOrder).length;
  const approvedCount = orders.filter((order) => order.status === "approved").length;
  const orderAmount = orders.reduce((sum, order) => sum + totalOf(order), 0);

  return (
    <>
      <PageHeader
        title="订单中心"
        actions={mode !== "production" ? <ButtonLink href="/orders/new"><Plus size={16} />新建订单</ButtonLink> : undefined}
      />

      <Card className="mb-4 overflow-hidden">
        <div className="grid divide-y divide-[var(--stroke-subtle)] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <OverviewMetric icon={ClipboardCheck} label="需要处理" value={`${attentionCount} 单`} detail="待审核、草稿或已超时" tone="warning" />
          <OverviewMetric icon={PackageCheck} label="已审核订单" value={`${approvedCount} 单`} detail="前往生产准备核对" tone="success" />
          <OverviewMetric icon={Layers3} label="配方缺口" value={`${missingBomOrders} 单`} detail={missingBomOrders ? "审核前需要补齐" : "当前商品均有有效配方"} tone={missingBomOrders ? "danger" : "info"} />
          <OverviewMetric icon={ShoppingCart} label="订单金额" value={formatCurrency(orderAmount)} detail={`${orders.length} 张订单`} tone="info" />
        </div>
      </Card>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="space-y-3 border-b border-[var(--stroke-subtle)] p-3 sm:p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索订单号、客户或商品" aria-label="搜索订单" />
              </div>
              <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-xs text-[var(--text-secondary)]">
                <span className={cn("h-2 w-2 rounded-full", backendStatus === "ready" || backendStatus === "demo" ? "bg-[var(--status-success)]" : "bg-[var(--status-warning)]")} />
                {backendStatus === "demo" ? "数据已载入" : backendStatus === "ready" ? "服务已连接" : "正在连接"}
              </div>
            </div>
            <div className="horizontal-snap flex overflow-x-auto" role="tablist" aria-label="订单筛选">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === option.id}
                  onClick={() => setFilter(option.id)}
                  className={cn(
                    "focus-ring relative h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition",
                    filter === option.id ? "bg-[var(--interactive-soft)] text-[var(--interactive)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {rows.length ? (
            <>
              <div className="divide-y divide-[var(--stroke-subtle)] lg:hidden">
                {rows.map((order) => <OrderMobileRow key={order.id} order={order} selected={selectedOrder?.id === order.id} boms={boms} onSelect={() => setSelectedId(order.id)} />)}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)]">
                    <tr><th className="px-5 py-3">订单与客户</th><th className="px-5 py-3">商品需求</th><th className="px-5 py-3">交付窗口</th><th className="px-5 py-3">配方准备</th><th className="px-5 py-3 text-right">金额</th><th className="w-14"><span className="sr-only">选择</span></th></tr>
                  </thead>
                  <tbody>
                    {rows.map((order) => <OrderTableRow key={order.id} order={order} selected={selectedOrder?.id === order.id} boms={boms} onSelect={() => setSelectedId(order.id)} />)}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="px-6 py-16 text-center"><Search className="mx-auto text-[var(--text-tertiary)]" /><h2 className="mt-3 font-semibold">没有匹配的订单</h2><p className="mt-1 text-sm text-[var(--text-tertiary)]">调整关键词或筛选条件后再试。</p></div>
          )}
        </Card>

        {selectedOrder && selectedCoverage && (
          <OrderHandoffPanel order={selectedOrder} coverage={selectedCoverage} />
        )}
      </div>
    </>
  );
}

function OverviewMetric({ icon: Icon, label, value, detail, tone }: { icon: typeof ShoppingCart; label: string; value: string; detail: string; tone: StatusTone }) {
  const colors: Record<StatusTone, string> = {
    neutral: "bg-[var(--surface-muted)] text-[var(--text-secondary)]",
    info: "bg-[var(--interactive-soft)] text-[var(--interactive)]",
    success: "bg-[var(--status-success-soft)] text-[var(--status-success)]",
    warning: "bg-[var(--status-warning-soft)] text-[var(--status-warning)]",
    danger: "bg-[var(--status-danger-soft)] text-[var(--status-danger)]",
    purple: "bg-[var(--status-ai-soft)] text-[var(--status-ai)]",
  };
  return (
    <div className="flex min-h-[116px] items-center gap-3 p-4">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", colors[tone])}><Icon size={18} /></span>
      <div className="min-w-0"><span className="block text-[11px] font-medium text-[var(--text-tertiary)]">{label}</span><b className="mt-1 block truncate text-[22px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{value}</b><span className="mt-2 block truncate text-[10px] text-[var(--text-tertiary)]">{detail}</span></div>
    </div>
  );
}

function OrderTableRow({ order, selected, boms, onSelect }: { order: SalesOrder; selected: boolean; boms: ReturnType<typeof useNoraStore.getState>["boms"]; onSelect: () => void }) {
  const coverage = getOrderBomCoverage(order, boms);
  const signal = deliverySignal(order);
  const snapshot = !["draft", "pending"].includes(order.status);
  return (
    <tr className={cn("border-t border-[var(--stroke-subtle)] transition", selected ? "bg-[var(--interactive-soft)]" : "hover:bg-[var(--surface-subtle)]")}>
      <td className="px-5 py-4"><Link href={`/orders/${order.id}`} className="font-mono text-xs font-semibold text-[var(--interactive)] hover:underline">{order.code}</Link><span className="mt-1 block max-w-[220px] truncate text-sm font-medium">{order.customerName}</span></td>
      <td className="max-w-[260px] px-5 py-4"><p className="line-clamp-1 text-sm text-[var(--text-secondary)]">{order.lines.map((line) => `${line.productName} ${formatNumber(line.quantity)}${line.unit}`).join("、")}</p><span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">共 {order.lines.length} 项</span></td>
      <td className="px-5 py-4"><span className="block text-xs tabular-nums">{order.deliveryAt}</span><Badge tone={signal.tone} className="mt-1.5">{signal.label}</Badge></td>
      <td className="px-5 py-4"><div className="flex items-center gap-2">{snapshot || coverage.ready ? <CheckCircle2 size={16} className="text-[var(--status-success)]" /> : <AlertTriangle size={16} className="text-[var(--status-warning)]" />}<span><b className="block text-xs">{snapshot ? "审批快照已冻结" : coverage.ready ? "配方可用" : `${coverage.missing.length} 项缺配方`}</b><span className="text-[10px] text-[var(--text-tertiary)]">{snapshot ? "生产按快照展开" : `${coverage.readyCount}/${coverage.totalCount} 商品已匹配`}</span></span></div></td>
      <td className="px-5 py-4 text-right font-semibold tabular-nums">{formatCurrency(totalOf(order))}</td>
      <td className="pr-3 text-right"><button type="button" className={cn("focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-[var(--interactive)] text-white" : "text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]")} onClick={onSelect} aria-label={`在侧栏查看 ${order.code}`}><ChevronRight size={16} /></button></td>
    </tr>
  );
}

function OrderMobileRow({ order, selected, boms, onSelect }: { order: SalesOrder; selected: boolean; boms: ReturnType<typeof useNoraStore.getState>["boms"]; onSelect: () => void }) {
  const coverage = getOrderBomCoverage(order, boms);
  const signal = deliverySignal(order);
  return (
    <button type="button" onClick={onSelect} className={cn("focus-ring block w-full p-4 text-left", selected && "bg-[var(--interactive-soft)]")}>
      <div className="flex items-start justify-between gap-3"><span><span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{order.code}</span><b className="mt-1 block text-sm">{order.customerName}</b></span><Badge tone={statusTone[order.status]}>{orderStatusLabel[order.status]}</Badge></div>
      <p className="mt-3 line-clamp-1 text-sm text-[var(--text-secondary)]">{order.lines.map((line) => `${line.productName} ${formatNumber(line.quantity)}${line.unit}`).join("、")}</p>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--stroke-subtle)] pt-3 text-xs"><span className={cn(signal.tone === "danger" ? "text-[var(--status-danger)]" : "text-[var(--text-tertiary)]")}>{signal.label}</span><span className={coverage.ready ? "text-[var(--status-success)]" : "text-[var(--status-warning)]"}>{coverage.ready ? "配方已匹配" : `${coverage.missing.length} 项缺配方`}</span></div>
    </button>
  );
}

function OrderHandoffPanel({ order, coverage }: { order: SalesOrder; coverage: ReturnType<typeof getOrderBomCoverage> }) {
  const snapshot = !["draft", "pending"].includes(order.status);
  const signal = deliverySignal(order);
  const steps = [
    { label: "订单已创建", complete: true },
    { label: order.status === "draft" ? "等待提交审核" : "订单已提交", complete: order.status !== "draft" },
    { label: snapshot ? "配方快照已冻结" : coverage.ready ? "配方检查通过" : "存在配方缺口", complete: snapshot || coverage.ready, warning: !snapshot && !coverage.ready },
    { label: snapshot ? "生产需求已建立" : "审核后建立生产需求", complete: snapshot },
  ];
  return (
    <aside aria-label="订单生产交接" className="min-w-0 xl:sticky xl:top-24 xl:self-start">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-5">
          <div className="flex items-start justify-between gap-3"><span><span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-[var(--text-tertiary)]">{order.code}</span><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">生产交接</h2></span><Badge tone={statusTone[order.status]}>{orderStatusLabel[order.status]}</Badge></div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{order.customerName}</p>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--stroke-subtle)] pt-4"><span className="text-xs text-[var(--text-tertiary)]">订单金额</span><b className="text-lg tabular-nums text-[var(--text-primary)]">{formatCurrency(totalOf(order))}</b></div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[var(--text-secondary)]">交付窗口</span><Badge tone={signal.tone}>{signal.label}</Badge></div>
          <p className="mt-2 text-sm font-semibold tabular-nums">{order.deliveryAt}</p>
          <div className="mt-5 space-y-0">
            {steps.map((step, index) => (
              <div key={step.label} className="grid grid-cols-[24px_1fr] gap-2">
                <span className="flex flex-col items-center">{step.warning ? <AlertTriangle size={16} className="text-[var(--status-warning)]" /> : step.complete ? <CheckCircle2 size={16} className="text-[var(--status-success)]" /> : <Circle size={16} className="text-[var(--stroke)]" />}{index < steps.length - 1 && <span className="my-1 h-6 w-px bg-[var(--stroke)]" />}</span>
                <span className={cn("text-xs font-medium", step.warning ? "text-[var(--status-warning)]" : step.complete ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[var(--stroke-subtle)] pt-4">
            <div className="flex items-center justify-between"><span className="text-xs font-semibold text-[var(--text-secondary)]">商品与配方</span><span className="text-[11px] text-[var(--text-tertiary)]">{coverage.readyCount}/{coverage.totalCount}</span></div>
            <div className="mt-2 space-y-2">
              {coverage.lines.map(({ line, bom }) => (
                <div key={line.id} className="rounded-xl bg-[var(--surface-muted)] p-3"><div className="flex items-start justify-between gap-2"><span><b className="block text-xs">{line.productName}</b><span className="mt-0.5 block text-[10px] text-[var(--text-tertiary)]">{formatNumber(line.quantity)} {line.unit}</span></span><Badge tone={bom ? "success" : "warning"}>{snapshot && bom ? `${bom.version} 快照` : bom ? bom.version : "待补配方"}</Badge></div></div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <Link href={`/orders/${order.id}`} className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--stroke)] text-sm font-medium hover:bg-[var(--surface-muted)]">查看订单详情 <ArrowRight size={15} /></Link>
            <Link href={`/orders/${order.id}#production-requirements`} className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--interactive)] text-sm font-medium text-white hover:bg-[var(--interactive-hover)]"><Layers3 size={15} />查看订单物料</Link>
          </div>
        </div>
      </Card>
    </aside>
  );
}
