"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Play,
  RefreshCw,
  Search,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { Badge, Button, Card, Field, Modal, PageHeader, Progress, inputClass } from "@/components/ui";
import { NoraApiError, noraApi } from "@/lib/nora-api";
import { useNoraStore } from "@/lib/store";
import type {
  ProductionWorkOrder,
  ProductionWorkOrderCommand,
  StatusTone,
  WorkOrder,
} from "@/lib/types";
import { formatNumber, workOrderStatus } from "@/lib/utils";
import {
  workOrderActions,
  workOrderCommandSuccessLabel,
  type WorkOrderAction,
} from "./work-order-actions";

const productionWorkOrderStatus: Record<ProductionWorkOrder["status"], { label: string; tone: StatusTone }> = {
  pending: { label: "待开工", tone: "purple" },
  running: { label: "生产中", tone: "warning" },
  paused: { label: "已暂停", tone: "danger" },
  completed: { label: "已完成", tone: "success" },
  exception: { label: "异常", tone: "danger" },
  cancelled: { label: "已取消", tone: "neutral" },
};

interface CommandDraft {
  workOrder: ProductionWorkOrder;
  action: WorkOrderAction;
}

interface ActionFeedback {
  tone: "success" | "error";
  message: string;
}

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
  const [actionId, setActionId] = useState("");
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [commandDraft, setCommandDraft] = useState<CommandDraft | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const commandKeys = useRef(new Map<string, string>());

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
      .catch((reasonValue) => {
        if (active) setError(reasonValue instanceof Error ? reasonValue.message : "生产工单加载失败，请稍后重试。");
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

  const runCommand = async (
    workOrder: ProductionWorkOrder,
    command: ProductionWorkOrderCommand,
    commandReason?: string,
  ) => {
    if (mode === "production") return;
    const operationId = `${workOrder.id}:${workOrder.revision}:${command}`;
    const idempotencyKey = commandKeys.current.get(operationId) ?? `work-order:${crypto.randomUUID()}`;
    commandKeys.current.set(operationId, idempotencyKey);
    setActionId(operationId);
    setFeedback(null);
    try {
      const updated = await noraApi.transitionWorkOrder(workOrder.id, command, {
        revision: workOrder.revision,
        workstationCode: workOrder.workCenter,
        deviceId: "WEB-DEVELOPMENT",
        reason: commandReason,
      }, idempotencyKey);
      setApiWorkOrders((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      commandKeys.current.delete(operationId);
      setCommandDraft(null);
      setReason("");
      setReasonError("");
      setFeedback({ tone: "success", message: `${updated.code}：${workOrderCommandSuccessLabel(command)}` });
    } catch (cause) {
      if (cause instanceof NoraApiError && cause.status === 409) {
        setFeedback({ tone: "error", message: `${cause.message}；已重新加载最新工单。` });
        setRequestVersion((version) => version + 1);
      } else {
        setFeedback({
          tone: "error",
          message: cause instanceof Error ? cause.message : "工单操作失败，请保留当前页面后重试。",
        });
      }
    } finally {
      setActionId("");
    }
  };

  const requestAction = (workOrder: ProductionWorkOrder, action: WorkOrderAction) => {
    if (action.requiresReason) {
      setReason("");
      setReasonError("");
      setCommandDraft({ workOrder, action });
      return;
    }
    void runCommand(workOrder, action.command);
  };

  const submitReasonCommand = () => {
    const normalized = reason.trim();
    if (!normalized) {
      setReasonError("请填写原因或处置说明");
      return;
    }
    if (!commandDraft) return;
    void runCommand(commandDraft.workOrder, commandDraft.action.command, normalized);
  };

  return (
    <>
      <PageHeader
        title="生产工单"
        metadata={(
          <HelpTip title="工单说明">
            {mode === "demo"
              ? "当前为演示工单，可体验开工、暂停和完工交互。"
              : "工单由已确认生产批次释放；现场命令会同步更新生产批次并写入审计记录。"}
          </HelpTip>
        )}
      />

      {mode === "production" ? (
        <Card className="mb-4 border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] px-4 py-3 text-sm" role="note">
          <b>当前仅可查看。</b>
          <span className="ml-1 text-[var(--text-secondary)]">生产身份与工位权限接入后，才能开始、暂停或上报异常。</span>
        </Card>
      ) : null}

      {feedback ? (
        <div
          className={`mb-4 flex items-start gap-2 rounded-[var(--radius-control)] border px-4 py-3 text-sm ${feedback.tone === "success" ? "border-[var(--status-success)]/25 bg-[var(--status-success-soft)] text-[var(--status-success)]" : "border-[var(--status-danger)]/25 bg-[var(--status-danger-soft)] text-[var(--status-danger)]"}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.tone === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

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
        <RealWorkOrderList
          rows={realRows}
          query={query}
          onQueryChange={setQuery}
          hasAny={apiWorkOrders.length > 0}
          actionId={actionId}
          canWrite={mode !== "production"}
          onAction={requestAction}
        />
      )}

      <ReasonCommandModal
        draft={commandDraft}
        reason={reason}
        reasonError={reasonError}
        busy={Boolean(actionId)}
        onReasonChange={(value) => {
          setReason(value);
          if (value.trim()) setReasonError("");
        }}
        onClose={() => {
          if (actionId) return;
          setCommandDraft(null);
          setReason("");
          setReasonError("");
        }}
        onSubmit={submitReasonCommand}
      />
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
  actionId,
  canWrite,
  onAction,
}: {
  rows: ProductionWorkOrder[];
  query: string;
  onQueryChange: (query: string) => void;
  hasAny: boolean;
  actionId: string;
  canWrite: boolean;
  onAction: (workOrder: ProductionWorkOrder, action: WorkOrderAction) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <WorkOrderSearch query={query} onQueryChange={onQueryChange} />
      {rows.length ? (
        <>
          <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
            {rows.map((workOrder) => {
              const status = productionWorkOrderStatus[workOrder.status];
              const latestEvent = workOrder.events[0];
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
                  {latestEvent ? (
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                      最近操作：{latestEvent.actor} · {latestEvent.createdAt}{latestEvent.reason ? ` · ${latestEvent.reason}` : ""}
                    </p>
                  ) : null}
                  <WorkOrderActionButtons
                    workOrder={workOrder}
                    actionId={actionId}
                    canWrite={canWrite}
                    mobile
                    onAction={onAction}
                  />
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1120px] text-left">
              <thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]">
                <tr><th className="px-5 py-3">工单与批次</th><th className="px-5 py-3">商品与工作中心</th><th className="px-5 py-3">计划数量</th><th className="px-5 py-3">计划开工</th><th className="px-5 py-3">冻结工序</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">现场操作</th></tr>
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
                      <td className="px-5 py-4">
                        <WorkOrderActionButtons workOrder={workOrder} actionId={actionId} canWrite={canWrite} onAction={onAction} />
                      </td>
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

function WorkOrderActionButtons({
  workOrder,
  actionId,
  canWrite,
  mobile = false,
  onAction,
}: {
  workOrder: ProductionWorkOrder;
  actionId: string;
  canWrite: boolean;
  mobile?: boolean;
  onAction: (workOrder: ProductionWorkOrder, action: WorkOrderAction) => void;
}) {
  const actions = workOrderActions(workOrder.status);
  if (!actions.length) return <span className="text-xs text-[var(--text-tertiary)]">无需操作</span>;
  return (
    <div className={`flex flex-wrap gap-2 ${mobile ? "mt-4 [&>button]:flex-1" : "min-w-[176px]"}`}>
      {actions.map((action) => {
        const operationId = `${workOrder.id}:${workOrder.revision}:${action.command}`;
        return (
          <Button
            key={action.command}
            size="sm"
            variant={action.tone}
            disabled={!canWrite || Boolean(actionId)}
            title={!canWrite ? "生产身份与工位权限接入后可操作" : undefined}
            aria-label={`${workOrder.code} ${action.label}`}
            onClick={() => onAction(workOrder, action)}
          >
            {actionId === operationId ? <RefreshCw className="animate-spin" size={14} /> : null}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

function ReasonCommandModal({
  draft,
  reason,
  reasonError,
  busy,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  draft: CommandDraft | null;
  reason: string;
  reasonError: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const title = draft?.action.command === "pause" ? "暂停工单"
    : draft?.action.command === "report-exception" ? "上报工单异常"
      : "恢复工单";
  const fieldLabel = draft?.action.command === "pause" ? "暂停原因"
    : draft?.action.command === "report-exception" ? "异常说明"
      : "处置说明";
  return (
    <Modal
      open={Boolean(draft)}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title={title}
      description={draft ? `${draft.workOrder.code} · ${draft.workOrder.productName}` : undefined}
      footer={(
        <>
          <Button variant="secondary" disabled={busy} onClick={onClose}>取消</Button>
          <Button variant={draft?.action.tone ?? "primary"} disabled={busy} onClick={onSubmit}>
            {busy ? <RefreshCw className="animate-spin" size={15} /> : null}
            确认{draft?.action.label ?? "操作"}
          </Button>
        </>
      )}
    >
      <Field label={fieldLabel} required hint="该说明会写入工单与生产批次审计记录。">
        <textarea
          autoFocus
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          className={`${inputClass} min-h-28 resize-y py-3`}
          maxLength={500}
          aria-invalid={Boolean(reasonError)}
          aria-describedby={reasonError ? "work-order-reason-error" : undefined}
          placeholder={draft?.action.command === "pause" ? "例如：等待原料补充" : "简要说明现场情况和处理结果"}
        />
      </Field>
      {reasonError ? <p id="work-order-reason-error" className="mt-2 text-sm text-[var(--status-danger)]" role="alert">{reasonError}</p> : null}
    </Modal>
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
    return <Link href={`/mes/stations/${workOrder.id}`} className={`focus-ring inline-flex items-center justify-center gap-1 rounded-[9px] text-xs font-semibold text-[var(--interactive)] ${mobile ? "h-11 w-full border border-[var(--stroke)]" : ""}`}>进入工位<ArrowRight size={13} /></Link>;
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
