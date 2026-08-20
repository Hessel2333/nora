"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock3,
  Factory,
  Layers3,
  Send,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { Badge, Button, ButtonLink, Card, Field, MetricCard, Modal, PageHeader, inputClass } from "@/components/ui";
import { noraApi } from "@/lib/nora-api";
import { useNoraStore } from "@/lib/store";
import type { Bom, ProductionBatch, ProductionDemand, ProductionDemandLine, StatusTone } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";
import {
  applyDemoDemandAllocations,
  buildDemoProductionDemands,
  demandDeliverySignal,
  filterProductionDemands,
  productionDemandMetrics,
  productionDemandStatusMeta,
  type ProductionDemandFilter,
} from "./production-demand-view";

const filterOptions: Array<{ id: ProductionDemandFilter; label: string }> = [
  { id: "all", label: "全部需求" },
  { id: "attention", label: "优先处理" },
  { id: "ready", label: "快照就绪" },
  { id: "blocked", label: "存在阻断" },
  { id: "pending_planning", label: "待计划" },
  { id: "planned", label: "已分配" },
  { id: "completed", label: "已完成" },
];

const batchStatusMeta: Record<ProductionBatch["status"], { label: string; tone: StatusTone }> = {
  draft: { label: "草稿", tone: "neutral" },
  confirmed: { label: "已确认", tone: "info" },
  released: { label: "已释放", tone: "purple" },
  running: { label: "生产中", tone: "warning" },
  paused: { label: "已暂停", tone: "danger" },
  awaiting_quality: { label: "待质检", tone: "warning" },
  completed: { label: "已完成", tone: "success" },
  exception: { label: "异常", tone: "danger" },
  cancelled: { label: "已取消", tone: "neutral" },
};

export function ProductionDemandWorkbenchPage() {
  const mode = useNoraStore((state) => state.mode);
  const backendStatus = useNoraStore((state) => state.backendStatus);
  const orders = useNoraStore((state) => state.orders);
  const boms = useNoraStore((state) => state.boms);
  const [apiDemands, setApiDemands] = useState<ProductionDemand[]>([]);
  const [apiBatches, setApiBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(mode !== "demo");
  const [error, setError] = useState("");
  const [batchError, setBatchError] = useState("");
  const [batchAction, setBatchAction] = useState("");
  const commandKeys = useRef<Record<string, string>>({});
  const [requestVersion, setRequestVersion] = useState(0);
  const [filter, setFilter] = useState<ProductionDemandFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [allocationSeed, setAllocationSeed] = useState<{ demandId: string; lineId: string }>();
  const [createdBatch, setCreatedBatch] = useState<{ batch: ProductionBatch; mode: typeof mode }>();
  const [demoAllocatedQuantities, setDemoAllocatedQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (mode === "demo" || backendStatus !== "ready") return;
    let active = true;
    setLoading(true);
    setError("");
    void Promise.all([noraApi.productionDemands(), noraApi.productionBatches()])
      .then(([demandResult, batchResult]) => {
        if (active) {
          setApiDemands(demandResult.data);
          setApiBatches(batchResult.data);
        }
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "生产需求加载失败，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backendStatus, mode, requestVersion]);

  const demoDemands = useMemo(
    () => applyDemoDemandAllocations(buildDemoProductionDemands(orders, boms), demoAllocatedQuantities),
    [boms, demoAllocatedQuantities, orders],
  );
  const demands = mode === "demo" ? demoDemands : apiDemands;
  const rows = useMemo(() => filterProductionDemands(demands, filter, query), [demands, filter, query]);
  const metrics = useMemo(() => productionDemandMetrics(demands), [demands]);
  const selectedDemand = rows.find((demand) => demand.id === selectedId) ?? rows[0];
  const batches = mode === "demo"
    ? createdBatch?.mode === mode ? [createdBatch.batch] : []
    : apiBatches;

  async function runBatchCommand(batch: ProductionBatch, command: "confirm" | "release") {
    if (mode === "production" || batchAction) return;
    const actionId = `${batch.id}:${command}`;
    const idempotencyKey = commandKeys.current[actionId] ?? crypto.randomUUID();
    commandKeys.current[actionId] = idempotencyKey;
    setBatchAction(actionId);
    setBatchError("");
    try {
      const updated = mode === "demo"
        ? {
            ...batch,
            status: command === "confirm" ? "confirmed" as const : "released" as const,
            revision: batch.revision + 1,
          }
        : command === "confirm"
          ? await noraApi.confirmProductionBatch(batch.id, batch.revision, idempotencyKey)
          : await noraApi.releaseProductionBatch(batch.id, batch.revision, idempotencyKey);
      delete commandKeys.current[actionId];
      if (mode === "demo") setCreatedBatch({ batch: updated, mode });
      else setApiBatches((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setBatchError(reason instanceof Error ? reason.message : "生产批次状态更新失败，请刷新后重试。");
    } finally {
      setBatchAction("");
    }
  }

  return (
    <>
      <PageHeader
        title="生产准备"
        metadata={
          <span className="inline-flex items-center gap-1.5">
            <HelpTip title="生产准备说明" href="/help/planning/production-demand">
              {mode === "demo"
                ? "当前需求用于体验审核、配方核对和批次分配，不会下达正式批次或工单。"
                : "在这里核对交期、配方快照和生产依据，再进入批次分配。"}
            </HelpTip>
          </span>
        }
        actions={<ButtonLink href="/orders/approvals" variant="secondary"><ShieldCheck size={16} />查看订单审核</ButtonLink>}
      />

      <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[78%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:auto-cols-[44%] sm:px-0 lg:grid-flow-row lg:auto-cols-auto lg:grid-cols-4">
        <MetricCard label="待计划需求" value={String(metrics.pending)} suffix="张" icon={ClipboardList} tone="warning" />
        <MetricCard label="快照就绪" value={String(metrics.ready)} suffix="张" icon={CheckCircle2} tone="success" />
        <MetricCard label="配方阻断" value={String(metrics.blocked)} suffix="张" icon={AlertTriangle} tone={metrics.blocked ? "danger" : "neutral"} />
        <MetricCard label="临近或超时" value={String(metrics.urgent)} suffix="张" icon={Clock3} tone={metrics.urgent ? "warning" : "neutral"} />
      </div>

      <ProductionBatchQueue
        batches={batches}
        mode={mode}
        actionId={batchAction}
        error={batchError}
        onCommand={runBatchCommand}
      />

      {createdBatch?.mode === mode ? (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-[var(--status-success)]/25 bg-[var(--status-success-soft)] px-4 py-3" role="status">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--status-success)]"><CheckCircle2 size={18} /></span>
            <span className="min-w-0">
              <b className="block text-sm text-[var(--text-primary)]">
                {createdBatch.batch.status === "released" ? "工单已释放" : createdBatch.batch.status === "confirmed" ? "生产批次已确认" : "草稿生产批次已建立"} · {createdBatch.batch.code}
              </b>
              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                {createdBatch.batch.productName} · {createdBatch.batch.plannedQuantity} {createdBatch.batch.unit} · {batchStatusMeta[createdBatch.batch.status].label}
              </span>
            </span>
          </span>
          <Badge tone={mode === "demo" ? "purple" : "success"}>{mode === "demo" ? "草稿" : "创建成功"}</Badge>
        </Card>
      ) : null}

      {error ? (
        <Card className="px-6 py-14 text-center" role="alert">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--status-danger-soft)] text-[var(--status-danger)]">
            <AlertTriangle size={23} />
          </span>
          <h2 className="mt-4 font-semibold text-[var(--text-primary)]">生产需求暂时无法加载</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-[var(--text-tertiary)]">{error}</p>
          <Button className="mt-5" variant="secondary" onClick={() => setRequestVersion((version) => version + 1)}>
            <RefreshCw size={15} />重新加载
          </Button>
        </Card>
      ) : loading ? (
        <ProductionDemandLoading />
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="min-w-0 overflow-hidden">
            <div className="space-y-3 border-b border-[var(--stroke-subtle)] p-3 sm:p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[220px] flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                  <input
                    aria-label="搜索生产需求"
                    className={`${inputClass} pl-9`}
                    placeholder="搜索需求号、订单、客户或商品"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <div className="flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-xs text-[var(--text-secondary)]">
                  <span className={cn("h-2 w-2 rounded-full", mode === "demo" ? "bg-[var(--status-ai)]" : "bg-[var(--status-success)]")} />
                  {demands.length} 张需求
                </div>
              </div>
              <div className="horizontal-snap flex overflow-x-auto" role="tablist" aria-label="生产需求筛选">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={filter === option.id}
                    onClick={() => setFilter(option.id)}
                    className={cn(
                      "focus-ring relative h-9 shrink-0 rounded-lg px-3 text-xs font-medium transition",
                      filter === option.id
                        ? "bg-[var(--interactive-soft)] text-[var(--interactive)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
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
                  {rows.map((demand) => (
                    <DemandMobileRow
                      key={demand.id}
                      demand={demand}
                      selected={selectedDemand?.id === demand.id}
                      onSelect={() => setSelectedId(demand.id)}
                    />
                  ))}
                </div>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[940px] text-left">
                    <thead className="bg-[var(--surface-subtle)] text-[11px] font-semibold text-[var(--text-tertiary)]">
                      <tr>
                        <th className="px-5 py-3">需求与来源</th>
                        <th className="px-5 py-3">商品需求</th>
                        <th className="px-5 py-3">需求时间</th>
                        <th className="px-5 py-3">生产依据</th>
                        <th className="px-5 py-3">状态</th>
                        <th className="w-14"><span className="sr-only">选择</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((demand) => (
                        <DemandTableRow
                          key={demand.id}
                          demand={demand}
                          selected={selectedDemand?.id === demand.id}
                          onSelect={() => setSelectedId(demand.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <ProductionDemandEmpty hasAny={demands.length > 0} />
            )}
          </Card>

          {selectedDemand ? (
            <DemandPreparationPanel
              demand={selectedDemand}
              boms={boms}
              canAllocate={mode !== "production"}
              onCreateBatch={(line) => setAllocationSeed({ demandId: selectedDemand.id, lineId: line.id })}
            />
          ) : null}
        </div>
      )}

      <BatchAllocationModal
        open={Boolean(allocationSeed)}
        onOpenChange={(open) => {
          if (!open) setAllocationSeed(undefined);
        }}
        demands={demands}
        seed={allocationSeed}
        mode={mode}
        onCreated={(batch) => {
          setCreatedBatch({ batch, mode });
          setAllocationSeed(undefined);
          if (mode === "demo") {
            setDemoAllocatedQuantities((current) => {
              const next = { ...current };
              batch.allocations.forEach((allocation) => {
                next[allocation.productionDemandLineId] = (next[allocation.productionDemandLineId] ?? 0)
                  + Number(allocation.allocatedQuantity);
              });
              return next;
            });
          } else {
            setRequestVersion((version) => version + 1);
          }
        }}
      />
    </>
  );
}

function ProductionBatchQueue({
  batches,
  mode,
  actionId,
  error,
  onCommand,
}: {
  batches: ProductionBatch[];
  mode: "demo" | "development" | "production";
  actionId: string;
  error: string;
  onCommand: (batch: ProductionBatch, command: "confirm" | "release") => void;
}) {
  return (
    <Card className="mb-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--stroke-subtle)] px-4 py-3.5">
        <span>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">生产批次</h2>
          <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">先确认来源与生产依据，再释放工单。</p>
        </span>
        <Badge tone={mode === "demo" ? "purple" : "neutral"}>{batches.length} 张</Badge>
      </div>

      {error ? <div role="alert" className="border-b border-[var(--stroke-subtle)] bg-[var(--status-danger-soft)] px-4 py-3 text-sm text-[var(--status-danger)]">{error}</div> : null}

      {batches.length ? (
        <div className="divide-y divide-[var(--stroke-subtle)]">
          {batches.map((batch) => {
            const status = batchStatusMeta[batch.status];
            const confirming = actionId === `${batch.id}:confirm`;
            const releasing = actionId === `${batch.id}:release`;
            return (
              <article key={batch.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(160px,.7fr)_minmax(190px,.8fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[var(--interactive)]">{batch.code}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold">{batch.productName}</h3>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">{batch.factoryName} · {batch.bomVersionSnapshot}</p>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--text-tertiary)]">计划数量</span>
                  <b className="mt-1 block text-sm tabular-nums">{batch.plannedQuantity} {batch.unit}</b>
                </div>
                <div>
                  <span className="block text-[11px] text-[var(--text-tertiary)]">计划时间与来源</span>
                  <b className="mt-1 block text-xs tabular-nums">{batch.scheduledFor}</b>
                  <span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">{batch.allocations.length} 个订单分配</span>
                </div>
                <div className="flex min-w-[132px] flex-col gap-2 sm:flex-row lg:justify-end">
                  {batch.status === "draft" ? (
                    <Button
                      size="sm"
                      disabled={mode === "production" || Boolean(actionId)}
                      title={mode === "production" ? "当前未登录生产身份，不能确认批次" : undefined}
                      onClick={() => onCommand(batch, "confirm")}
                    >
                      <CheckCircle2 size={14} />{confirming ? "确认中…" : "确认批次"}
                    </Button>
                  ) : null}
                  {batch.status === "confirmed" && batch.releaseReady ? (
                    <Button
                      size="sm"
                      disabled={mode === "production" || Boolean(actionId)}
                      title={mode === "production" ? "当前未登录生产身份，不能释放工单" : undefined}
                      onClick={() => onCommand(batch, "release")}
                    >
                      <Send size={14} />{releasing ? "释放中…" : "释放工单"}
                    </Button>
                  ) : null}
                  {batch.status === "confirmed" && !batch.releaseReady ? (
                    <span className="max-w-[180px] text-xs leading-5 text-[var(--status-warning)]" title="冻结快照不是带完整工序和工作中心的 v2 配方，不能用于工艺下发">
                      历史快照缺少可执行工艺
                    </span>
                  ) : null}
                  {batch.status === "released" && batch.workOrder ? (
                    <ButtonLink href="/production/work-orders" size="sm" variant="secondary">
                      <ClipboardList size={14} />查看 {batch.workOrder.code}
                    </ButtonLink>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <Boxes className="mx-auto text-[var(--text-tertiary)]" />
          <h3 className="mt-3 text-sm font-semibold">还没有生产批次</h3>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">从下方生产需求选择商品并分配计划量。</p>
        </div>
      )}
    </Card>
  );
}

function DemandTableRow({ demand, selected, onSelect }: { demand: ProductionDemand; selected: boolean; onSelect: () => void }) {
  const delivery = demandDeliverySignal(demand);
  const status = productionDemandStatusMeta[demand.status];
  return (
    <tr className={cn("border-t border-[var(--stroke-subtle)] transition", selected ? "bg-[var(--interactive-soft)]" : "hover:bg-[var(--surface-subtle)]")}>
      <td className="px-5 py-4">
        <span className="font-mono text-xs font-semibold text-[var(--interactive)]">{demand.code}</span>
        <Link href={`/orders/${demand.salesOrderId}`} className="mt-1 block max-w-[220px] truncate text-sm font-medium hover:underline">
          {demand.salesOrder?.code ?? "来源订单"} · {demand.salesOrder?.customerName ?? "客户"}
        </Link>
      </td>
      <td className="max-w-[280px] px-5 py-4">
        <p className="line-clamp-1 text-sm text-[var(--text-secondary)]">
          {demand.lines.map((line) => `${line.productName} ${formatNumber(line.requiredQuantity)}${line.unit}`).join("、")}
        </p>
        <span className="mt-1 block text-[11px] text-[var(--text-tertiary)]">共 {demand.lineCount} 项</span>
      </td>
      <td className="px-5 py-4">
        <span className="block text-xs tabular-nums">{demand.requiredAt}</span>
        <Badge tone={delivery.tone} className="mt-1.5">{delivery.label}</Badge>
      </td>
      <td className="px-5 py-4">
        <ReadinessSummary demand={demand} />
      </td>
      <td className="px-5 py-4"><Badge tone={status.tone}>{status.label}</Badge></td>
      <td className="pr-3 text-right">
        <button
          type="button"
          className={cn("focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-[var(--interactive)] text-white" : "text-[var(--text-tertiary)] hover:bg-[var(--surface-muted)]")}
          onClick={onSelect}
          aria-label={`在侧栏查看 ${demand.code}`}
        >
          <ChevronRight size={16} />
        </button>
      </td>
    </tr>
  );
}

function DemandMobileRow({ demand, selected, onSelect }: { demand: ProductionDemand; selected: boolean; onSelect: () => void }) {
  const delivery = demandDeliverySignal(demand);
  const status = productionDemandStatusMeta[demand.status];
  return (
    <button type="button" onClick={onSelect} className={cn("focus-ring block w-full p-4 text-left", selected && "bg-[var(--interactive-soft)]")}>
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{demand.code}</span>
          <b className="mt-1 block text-sm">{demand.salesOrder?.customerName ?? demand.salesOrder?.code ?? "来源订单"}</b>
        </span>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="mt-3 line-clamp-1 text-sm text-[var(--text-secondary)]">
        {demand.lines.map((line) => `${line.productName} ${formatNumber(line.requiredQuantity)}${line.unit}`).join("、")}
      </p>
      <div className="mt-3 flex items-center justify-between border-t border-[var(--stroke-subtle)] pt-3 text-xs">
        <span className={delivery.tone === "danger" ? "text-[var(--status-danger)]" : "text-[var(--text-tertiary)]"}>{delivery.label}</span>
        <span className={demand.missingBomCount ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}>
          {demand.missingBomCount ? `${demand.missingBomCount} 项阻断` : "快照完整"}
        </span>
      </div>
    </button>
  );
}

function ReadinessSummary({ demand }: { demand: ProductionDemand }) {
  const ready = demand.lineCount > 0 && demand.readyLineCount === demand.lineCount;
  return (
    <div className="flex items-center gap-2">
      {ready
        ? <CheckCircle2 size={16} className="text-[var(--status-success)]" />
        : <AlertTriangle size={16} className="text-[var(--status-warning)]" />}
      <span>
        <b className="block text-xs">{ready ? "快照完整" : `${demand.missingBomCount} 项缺少快照`}</b>
        <span className="text-[10px] text-[var(--text-tertiary)]">{demand.readyLineCount}/{demand.lineCount} 项就绪</span>
      </span>
    </div>
  );
}

function DemandPreparationPanel({
  demand,
  boms,
  canAllocate,
  onCreateBatch,
}: {
  demand: ProductionDemand;
  boms: Bom[];
  canAllocate: boolean;
  onCreateBatch: (line: ProductionDemandLine) => void;
}) {
  const status = productionDemandStatusMeta[demand.status];
  const delivery = demandDeliverySignal(demand);
  const ready = demand.lineCount > 0 && demand.readyLineCount === demand.lineCount;
  const firstBom = boms.find((bom) => demand.lines.some((line) => line.productId === bom.productId));
  const allocationComplete = ["planned", "completed"].includes(demand.status);
  const steps = [
    { label: "来源订单已审核", complete: true },
    { label: ready ? "配方快照已冻结" : "配方快照存在阻断", complete: ready, warning: !ready },
    { label: allocationComplete ? "生产需求已分配" : "等待批次分配", complete: allocationComplete },
  ];
  return (
    <aside aria-label="生产需求准备" className="min-w-0 xl:sticky xl:top-24 xl:self-start">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-5">
          <div className="flex items-start justify-between gap-3">
            <span>
              <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-[var(--text-tertiary)]">{demand.code}</span>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">生产需求核对</h2>
            </span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{demand.salesOrder?.customerName ?? demand.factoryName}</p>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--stroke-subtle)] pt-4">
            <span className="text-xs text-[var(--text-tertiary)]">需求时间</span>
            <Badge tone={delivery.tone}>{delivery.label}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold tabular-nums">{demand.requiredAt}</p>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Factory size={14} />{demand.factoryName}
          </div>
          <div className="mt-5 space-y-0">
            {steps.map((step, index) => (
              <div key={step.label} className="grid grid-cols-[24px_1fr] gap-2">
                <span className="flex flex-col items-center">
                  {step.warning
                    ? <AlertTriangle size={16} className="text-[var(--status-warning)]" />
                    : step.complete
                      ? <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                      : <Circle size={16} className="text-[var(--stroke)]" />}
                  {index < steps.length - 1 ? <span className="my-1 h-6 w-px bg-[var(--stroke)]" /> : null}
                </span>
                <span className={cn("text-xs font-medium", step.warning ? "text-[var(--status-warning)]" : step.complete ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{step.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-[var(--stroke-subtle)] pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">商品与配方</span>
              <span className="text-[11px] text-[var(--text-tertiary)]">{demand.readyLineCount}/{demand.lineCount}</span>
            </div>
            <div className="mt-2 space-y-2">
              {demand.lines.map((line) => (
                <div key={line.id} className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <b className="block truncate text-xs">{line.productName}</b>
                      <span className="mt-0.5 block text-[10px] text-[var(--text-tertiary)]">
                        需求 {formatNumber(line.requiredQuantity)} {line.unit} · 剩余 {formatNumber(remainingQuantity(line))} {line.unit}
                      </span>
                    </span>
                    <Badge tone={line.bomReady ? "success" : "warning"}>{line.bomReady ? line.selectedBomVersion ?? "快照完整" : "待补配方"}</Badge>
                  </div>
                  {line.bomReady && remainingQuantity(line) > 0 && ["pending_planning", "partially_planned"].includes(demand.status) ? (
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      variant="secondary"
                      disabled={!canAllocate}
                      title={canAllocate ? undefined : "当前账号没有创建生产批次的权限"}
                      onClick={() => onCreateBatch(line)}
                    >
                      <Boxes size={14} />分配到生产批次
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className={cn(
            "mt-5 flex items-center justify-between gap-2 rounded-[var(--radius-control)] p-3 text-xs leading-5",
            ready
              ? "bg-[var(--interactive-soft)] text-[var(--text-secondary)]"
              : "bg-[var(--status-warning-soft)] text-[var(--text-secondary)]",
          )}>
            <span>
              {ready
                ? allocationComplete
                  ? "批次分配已完成"
                  : canAllocate
                    ? "可建立生产批次"
                    : "当前账号无批次创建权限"
                : `先补齐 ${demand.missingBomCount} 项配方快照`}
            </span>
            {ready ? (
              <HelpTip title={allocationComplete ? "批次下一步" : "批次分配说明"}>
                {allocationComplete
                  ? "批次确认后才能进入工单释放。"
                  : "生产计划可按商品、配方版本和工厂合批或拆批；新建批次为草稿，不会直接生成工单。"}
              </HelpTip>
            ) : null}
          </div>

          <div className="mt-5 grid gap-2">
            <Link href={`/orders/${demand.salesOrderId}`} className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--stroke)] text-sm font-medium hover:bg-[var(--surface-muted)]">
              查看来源订单 <ArrowRight size={15} />
            </Link>
            <Link href={firstBom ? `/catalog/boms/${firstBom.id}?view=explosion` : "/catalog/boms"} className="focus-ring flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--interactive)] text-sm font-medium text-white hover:bg-[var(--interactive-hover)]">
              <Layers3 size={15} />{firstBom ? "核对配方与物料" : "前往补齐配方"}
            </Link>
          </div>
        </div>
      </Card>
    </aside>
  );
}

function BatchAllocationModal({
  open,
  onOpenChange,
  demands,
  seed,
  mode,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demands: ProductionDemand[];
  seed?: { demandId: string; lineId: string };
  mode: "demo" | "development" | "production";
  onCreated: (batch: ProductionBatch) => void;
}) {
  const candidates = useMemo(() => {
    if (!seed) return [];
    const seedDemand = demands.find((demand) => demand.id === seed.demandId);
    const seedLine = seedDemand?.lines.find((line) => line.id === seed.lineId);
    if (!seedDemand || !seedLine?.selectedBomVersionId) return [];
    return demands.flatMap((demand) => {
      if (!["pending_planning", "partially_planned"].includes(demand.status)) return [];
      return demand.lines
        .filter((line) => (
          demand.factoryCode === seedDemand.factoryCode
          && line.productId === seedLine.productId
          && line.unit === seedLine.unit
          && line.selectedBomVersionId === seedLine.selectedBomVersionId
          && line.bomReady
          && line.snapshotComplete
          && remainingQuantity(line) > 0
        ))
        .map((line) => ({ demand, line }));
    });
  }, [demands, seed]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="建立草稿生产批次"
      description="选择兼容需求并安排生产时段。"
      size="xl"
    >
      {open && seed && candidates.length ? (
        <BatchAllocationForm
          key={`${seed.demandId}:${seed.lineId}`}
          candidates={candidates}
          seedLineId={seed.lineId}
          mode={mode}
          onCancel={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      ) : (
        <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">没有可分配的兼容生产需求。</div>
      )}
    </Modal>
  );
}

function BatchAllocationForm({
  candidates,
  seedLineId,
  mode,
  onCancel,
  onCreated,
}: {
  candidates: Array<{ demand: ProductionDemand; line: ProductionDemandLine }>;
  seedLineId: string;
  mode: "demo" | "development" | "production";
  onCancel: () => void;
  onCreated: (batch: ProductionBatch) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set([seedLineId]));
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(
    candidates.map(({ line }) => [line.id, String(remainingQuantity(line))]),
  ));
  const [scheduledFor, setScheduledFor] = useState(defaultScheduledFor);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const selectedCandidates = useMemo(
    () => candidates.filter(({ line }) => selected.has(line.id)),
    [candidates, selected],
  );
  const total = useMemo(
    () => selectedCandidates.reduce((sum, { line }) => sum + (Number(quantities[line.id]) || 0), 0),
    [quantities, selectedCandidates],
  );
  const invalidQuantity = selectedCandidates.some(({ line }) => {
    const quantity = Number(quantities[line.id]);
    return !Number.isFinite(quantity) || quantity <= 0 || quantity > remainingQuantity(line);
  });
  const base = candidates[0];

  async function submit() {
    if (!scheduledFor || !selectedCandidates.length || invalidQuantity || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const allocations = selectedCandidates.map(({ line }) => ({
        productionDemandLineId: line.id,
        quantity: Number(quantities[line.id]).toFixed(3),
      }));
      const batch = mode === "demo"
        ? buildDemoBatch(selectedCandidates, scheduledFor, allocations)
        : await noraApi.createProductionBatch({
          scheduledFor: new Date(scheduledFor).toISOString(),
          allocations,
        }, idempotencyKey);
      onCreated(batch);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "批次创建失败，请核对剩余量后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <span className="text-[11px] text-[var(--text-tertiary)]">生产商品</span>
          <b className="mt-1 block text-sm">{base.line.productName}</b>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <span className="text-[11px] text-[var(--text-tertiary)]">冻结依据</span>
          <b className="mt-1 block text-sm">{base.line.selectedBomVersion ?? "已冻结版本"}</b>
        </div>
        <div className="rounded-xl bg-[var(--surface-muted)] p-3">
          <span className="text-[11px] text-[var(--text-tertiary)]">本批计划量</span>
          <b className="mt-1 block text-sm tabular-nums">{formatNumber(total)} {base.line.unit}</b>
        </div>
      </div>

      <Field label="计划生产时间" required hint="确认批次前仍可调整。">
        <div className="relative">
          <CalendarClock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input type="datetime-local" className={`${inputClass} pl-9`} value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
        </div>
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">选择需求与分配量</span>
          <span className="text-[11px] text-[var(--text-tertiary)]">仅显示同工厂、商品、单位和 BOM 版本</span>
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--stroke-subtle)]">
          {candidates.map(({ demand, line }) => {
            const checked = selected.has(line.id);
            const remaining = remainingQuantity(line);
            const quantity = Number(quantities[line.id]);
            const rowInvalid = checked && (!Number.isFinite(quantity) || quantity <= 0 || quantity > remaining);
            return (
              <div key={line.id} className="grid gap-3 border-t border-[var(--stroke-subtle)] p-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
                <label className="flex min-w-0 cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--interactive)]"
                    checked={checked}
                    onChange={(event) => setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(line.id); else next.delete(line.id);
                      return next;
                    })}
                  />
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{demand.code} · {demand.salesOrder?.customerName ?? "来源订单"}</b>
                    <span className="mt-1 block text-xs text-[var(--text-tertiary)]">订单 {demand.salesOrder?.code ?? demand.salesOrderId} · 剩余 {formatNumber(remaining)} {line.unit}</span>
                  </span>
                </label>
                <label className="block">
                  <span className="sr-only">{demand.code} 分配数量</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.001"
                      max={remaining}
                      step="0.001"
                      disabled={!checked}
                      aria-invalid={rowInvalid}
                      className={cn(inputClass, "pr-12 tabular-nums", rowInvalid && "border-[var(--status-danger)]")}
                      value={quantities[line.id] ?? ""}
                      onChange={(event) => setQuantities((current) => ({ ...current, [line.id]: event.target.value }))}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-tertiary)]">{line.unit}</span>
                  </div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {error ? <div className="rounded-xl bg-[var(--status-danger-soft)] px-3 py-2.5 text-sm text-[var(--status-danger)]" role="alert">{error}</div> : null}

      <div className="flex flex-col-reverse gap-2 border-t border-[var(--stroke-subtle)] pt-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>取消</Button>
        <Button onClick={submit} disabled={!scheduledFor || !selectedCandidates.length || invalidQuantity || submitting}>
          <Boxes size={16} />{submitting ? "正在建立…" : "建立草稿批次"}
        </Button>
      </div>
    </div>
  );
}

function remainingQuantity(line: ProductionDemandLine) {
  const value = Number(line.remainingQuantity ?? line.requiredQuantity);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function defaultScheduledFor() {
  const value = new Date();
  value.setDate(value.getDate() + 1);
  value.setHours(8, 0, 0, 0);
  const localValue = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function buildDemoBatch(
  candidates: Array<{ demand: ProductionDemand; line: ProductionDemandLine }>,
  scheduledFor: string,
  allocations: Array<{ productionDemandLineId: string; quantity: string }>,
): ProductionBatch {
  const now = new Date();
  const base = candidates[0];
  const allocationByLine = new Map(allocations.map((allocation) => [allocation.productionDemandLineId, allocation.quantity]));
  const total = allocations.reduce((sum, allocation) => sum + Number(allocation.quantity), 0);
  return {
    id: `demo-batch-${now.getTime()}`,
    code: `DEMO-PB-${String(now.getTime()).slice(-6)}`,
    factoryCode: base.demand.factoryCode,
    factoryName: base.demand.factoryName,
    productId: base.line.productId,
    productCode: base.line.productCode,
    productName: base.line.productName,
    plannedQuantity: total.toFixed(3),
    unit: base.line.unit,
    selectedBomVersionId: base.line.selectedBomVersionId ?? "demo-version",
    bomVersionSnapshot: base.line.selectedBomVersion ?? "冻结版本",
    snapshotSchemaVersion: 2,
    processStepCount: 1,
    releaseReady: true,
    scheduledFor: scheduledFor.replace("T", " "),
    status: "draft",
    revision: 1,
    createdBy: "计划员",
    createdAt: now.toLocaleString("zh-CN", { hour12: false }),
    allocations: candidates.map(({ demand, line }, index) => ({
      id: `demo-allocation-${index}-${now.getTime()}`,
      productionDemandLineId: line.id,
      productionDemandId: demand.id,
      productionDemandCode: demand.code,
      salesOrderId: demand.salesOrderId,
      salesOrderCode: demand.salesOrder?.code ?? demand.salesOrderId,
      customerName: demand.salesOrder?.customerName ?? "客户",
      allocatedQuantity: allocationByLine.get(line.id) ?? "0.000",
    })),
    events: [{
      id: `demo-batch-event-${now.getTime()}`,
      type: "created",
      actor: "计划员",
      revision: 1,
      createdAt: now.toLocaleString("zh-CN", { hour12: false }),
    }],
  };
}

function ProductionDemandLoading() {
  return (
    <Card className="overflow-hidden" aria-busy="true" aria-label="正在加载生产需求">
      <div className="border-b border-[var(--stroke-subtle)] p-4">
        <div className="h-10 animate-pulse rounded-[var(--radius-control)] bg-[var(--surface-muted)]" />
      </div>
      <div className="space-y-0 divide-y divide-[var(--stroke-subtle)]">
        {[0, 1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse bg-[var(--surface-subtle)] opacity-60" />)}
      </div>
    </Card>
  );
}

function ProductionDemandEmpty({ hasAny }: { hasAny: boolean }) {
  return (
    <div className="px-6 py-16 text-center">
      {hasAny ? <Search className="mx-auto text-[var(--text-tertiary)]" /> : <ClipboardList className="mx-auto text-[var(--text-tertiary)]" />}
      <h2 className="mt-3 font-semibold">{hasAny ? "没有匹配的生产需求" : "还没有生产需求"}</h2>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">
        {hasAny ? "调整关键词或筛选条件后再试。" : "订单审核通过后，生产需求会自动出现在这里。"}
      </p>
      {!hasAny ? <ButtonLink className="mt-5" href="/orders/approvals" variant="secondary">查看待审核订单</ButtonLink> : null}
    </div>
  );
}
