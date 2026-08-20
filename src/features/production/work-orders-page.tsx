"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ClipboardList, Play, RefreshCw, Search } from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { Badge, Button, Card, PageHeader, Progress, inputClass } from "@/components/ui";
import { noraApi } from "@/lib/nora-api";
import { useNoraStore } from "@/lib/store";
import type { ProductionWorkOrder, StatusTone, WorkOrder } from "@/lib/types";
import { formatNumber, workOrderStatus } from "@/lib/utils";

const productionWorkOrderStatus: Record<ProductionWorkOrder["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "待开工", tone: "purple" },
  running: { label: "生产中", tone: "warning" },
  paused: { label: "已暂停", tone: "danger" },
  completed: { label: "已完成", tone: "success" },
  exception: { label: "异常", tone: "danger" },
  cancelled: { label: "已取消", tone: "neutral" },
};

export function WorkOrdersPage() {
  const mode = useNoraStore((state) => state.mode);
  const backendStatus = useNoraStore((state) => state.backendStatus);
  const backendError = useNoraStore((state) => state.backendError);
  const demoWorkOrders = useNoraStore((state) => state.workOrders);
  const transition = useNoraStore((state) => state.transitionWorkOrder);
  const [apiWorkOrders, setApiWorkOrders] = useState<ProductionWorkOrder[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(mode !== "demo");
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (mode === "demo") {
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
    void noraApi.workOrders()
      .then((result) => {
        if (active) setApiWorkOrders(result.data);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "生产工单加载失败，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backendError, backendStatus, mode, requestVersion]);

  const realRows = useMemo(() => apiWorkOrders.filter((workOrder) => (
    `${workOrder.code}${workOrder.productionBatchCode}${workOrder.productName}${workOrder.workCenter}`.includes(query.trim())
  )), [apiWorkOrders, query]);
  const demoRows = useMemo(() => demoWorkOrders.filter((workOrder) => (
    `${workOrder.code}${workOrder.productName}${workOrder.owner}${workOrder.line}`.includes(query.trim())
  )), [demoWorkOrders, query]);

  return (
    <>
      <PageHeader
        title="生产工单"
        metadata={(
          <HelpTip title="工单说明">
            {mode === "demo"
              ? "当前为演示工单，可体验开工、暂停和完工交互。"
              : "工单由已确认生产批次释放，并保留当时冻结的配方与工序依据。"}
          </HelpTip>
        )}
      />

      {error ? (
        <Card className="px-6 py-14 text-center" role="alert">
          <AlertTriangle className="mx-auto text-[var(--status-danger)]" />
          <h2 className="mt-3 font-semibold">生产工单暂时无法加载</h2>
          <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--text-tertiary)]">{error}</p>
          <Button className="mt-5" variant="secondary" onClick={() => setRequestVersion((version) => version + 1)}>
            <RefreshCw size={15} />重新加载
          </Button>
        </Card>
      ) : loading ? (
        <WorkOrderLoading />
      ) : mode === "demo" ? (
        <DemoWorkOrderList rows={demoRows} query={query} onQueryChange={setQuery} onTransition={transition} />
      ) : (
        <RealWorkOrderList rows={realRows} query={query} onQueryChange={setQuery} hasAny={apiWorkOrders.length > 0} />
      )}
    </>
  );
}

function WorkOrderSearch({ query, onQueryChange }: { query: string; onQueryChange: (query: string) => void }) {
  return (
    <div className="border-b border-[var(--stroke-subtle)] p-3 sm:p-4">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          aria-label="搜索生产工单"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`${inputClass} pl-9`}
          placeholder="搜索工单、生产批次、商品或工作中心"
        />
      </div>
    </div>
  );
}

function RealWorkOrderList({
  rows,
  query,
  onQueryChange,
  hasAny,
}: {
  rows: ProductionWorkOrder[];
  query: string;
  onQueryChange: (query: string) => void;
  hasAny: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <WorkOrderSearch query={query} onQueryChange={onQueryChange} />
      {rows.length ? (
        <>
          <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
            {rows.map((workOrder) => {
              const status = productionWorkOrderStatus[workOrder.status];
              return (
                <article key={workOrder.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{workOrder.code}</span>
                      <h2 className="mt-1 truncate text-base font-semibold">{workOrder.productName}</h2>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">批次 {workOrder.productionBatchCode} · {workOrder.workCenter}</p>
                    </span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[var(--surface-muted)] p-3 text-xs">
                    <span><span className="block text-[var(--text-tertiary)]">计划数量</span><b className="mt-1 block tabular-nums">{workOrder.plannedQuantity} {workOrder.unit}</b></span>
                    <span><span className="block text-[var(--text-tertiary)]">计划开工</span><b className="mt-1 block tabular-nums">{workOrder.scheduledStartAt}</b></span>
                  </div>
                  <p className="mt-3 text-xs text-[var(--text-secondary)]">{workOrder.operations.map((operation) => operation.name).join(" → ")}</p>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[960px] text-left">
              <thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]">
                <tr><th className="px-5 py-3">工单与批次</th><th className="px-5 py-3">商品与工作中心</th><th className="px-5 py-3">计划数量</th><th className="px-5 py-3">计划开工</th><th className="px-5 py-3">冻结工序</th><th className="px-5 py-3">状态</th></tr>
              </thead>
              <tbody>
                {rows.map((workOrder) => {
                  const status = productionWorkOrderStatus[workOrder.status];
                  return (
                    <tr key={workOrder.id} className="border-t border-[var(--stroke-subtle)] hover:bg-[var(--surface-subtle)]">
                      <td className="px-5 py-4"><span className="font-mono text-xs font-semibold text-[var(--interactive)]">{workOrder.code}</span><p className="mt-1 text-xs text-[var(--text-tertiary)]">{workOrder.productionBatchCode}</p></td>
                      <td className="px-5 py-4"><b className="text-sm">{workOrder.productName}</b><p className="mt-1 text-xs text-[var(--text-tertiary)]">{workOrder.workCenter} · {workOrder.bomVersionSnapshot}</p></td>
                      <td className="px-5 py-4 text-sm tabular-nums">{workOrder.plannedQuantity} {workOrder.unit}</td>
                      <td className="px-5 py-4 text-xs tabular-nums">{workOrder.scheduledStartAt}</td>
                      <td className="max-w-[260px] px-5 py-4 text-xs text-[var(--text-secondary)]"><span className="line-clamp-2">{workOrder.operations.map((operation) => operation.name).join(" → ")}</span></td>
                      <td className="px-5 py-4"><Badge tone={status.tone}>{status.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <WorkOrderEmpty filtered={hasAny} />
      )}
    </Card>
  );
}

function DemoWorkOrderList({
  rows,
  query,
  onQueryChange,
  onTransition,
}: {
  rows: WorkOrder[];
  query: string;
  onQueryChange: (query: string) => void;
  onTransition: (id: string, status: WorkOrder["status"]) => void;
}) {
  const action = (workOrder: WorkOrder, mobile = false) => {
    if (workOrder.status === "released") return <Button size="sm" className={mobile ? "w-full" : undefined} onClick={() => onTransition(workOrder.id, "in_progress")}><Play size={14} />开工</Button>;
    if (workOrder.status === "completed") return <Button size="sm" className={mobile ? "w-full" : undefined} variant="secondary" onClick={() => onTransition(workOrder.id, "closed")}>结案</Button>;
    return <Link href={`/mes/stations/${workOrder.id}`} className={`focus-ring inline-flex items-center justify-center gap-1 rounded-[9px] text-xs font-semibold text-[var(--interactive)] ${mobile ? "h-9 w-full border border-[var(--stroke)]" : ""}`}>进入工位<ArrowRight size={13} /></Link>;
  };

  return (
    <Card className="overflow-hidden">
      <WorkOrderSearch query={query} onQueryChange={onQueryChange} />
      <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
        {rows.map((workOrder) => (
          <article key={workOrder.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0"><span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{workOrder.code}</span><h2 className="mt-1 truncate text-base font-semibold">{workOrder.productName}</h2><p className="mt-1 text-xs text-[var(--text-tertiary)]">{workOrder.line} · {workOrder.startAt}—{workOrder.endAt}</p></span>
              <Badge tone={workOrderStatus[workOrder.status].tone}>{workOrderStatus[workOrder.status].label}</Badge>
            </div>
            <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-3"><div className="flex justify-between text-xs"><span>{workOrder.owner}</span><b className="tabular-nums">{formatNumber(workOrder.completedQuantity)} / {formatNumber(workOrder.plannedQuantity)} {workOrder.unit}</b></div><div className="mt-3 flex items-center gap-3"><Progress value={workOrder.progress} className="h-2 flex-1" /><span className="text-xs">{workOrder.progress}%</span></div></div>
            <div className="mt-3">{action(workOrder, true)}</div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left"><thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]"><tr><th className="px-5 py-3">工单</th><th className="px-5 py-3">商品与产线</th><th className="px-5 py-3">计划数量</th><th className="px-5 py-3">进度</th><th className="px-5 py-3">负责人</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">操作</th></tr></thead><tbody>{rows.map((workOrder) => <tr key={workOrder.id} className="border-t border-[var(--stroke-subtle)]"><td className="px-5 py-4 font-mono text-xs font-semibold text-[var(--interactive)]">{workOrder.code}</td><td className="px-5 py-4"><b>{workOrder.productName}</b><p className="text-xs text-[var(--text-tertiary)]">{workOrder.line} · {workOrder.startAt}–{workOrder.endAt}</p></td><td className="px-5 py-4 tabular-nums">{formatNumber(workOrder.plannedQuantity)} {workOrder.unit}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><Progress value={workOrder.progress} className="w-24" /><span className="text-xs">{workOrder.progress}%</span></div></td><td className="px-5 py-4">{workOrder.owner}</td><td className="px-5 py-4"><Badge tone={workOrderStatus[workOrder.status].tone}>{workOrderStatus[workOrder.status].label}</Badge></td><td className="px-5 py-4">{action(workOrder)}</td></tr>)}</tbody></table>
      </div>
      {!rows.length ? <WorkOrderEmpty filtered /> : null}
    </Card>
  );
}

function WorkOrderEmpty({ filtered }: { filtered: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <ClipboardList className="mx-auto text-[var(--text-tertiary)]" />
      <h2 className="mt-3 font-semibold">{filtered ? "没有匹配的生产工单" : "还没有已释放工单"}</h2>
      <p className="mt-1 text-sm text-[var(--text-tertiary)]">{filtered ? "调整搜索关键词后再试。" : "在生产准备中确认批次并释放工单后，这里会显示正式任务。"}</p>
      {!filtered ? <Link href="/production/plans" className="focus-ring mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-[var(--interactive)]">前往生产准备<ArrowRight size={14} className="ml-1" /></Link> : null}
    </div>
  );
}

function WorkOrderLoading() {
  return <Card className="overflow-hidden" aria-busy="true"><div className="h-16 animate-pulse bg-[var(--surface-muted)]" /><div className="space-y-px">{[0, 1, 2].map((item) => <div key={item} className="h-20 animate-pulse bg-[var(--surface-subtle)]" />)}</div></Card>;
}
