"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ClipboardCheck,
  PackageX,
  RefreshCw,
} from "lucide-react";
import { Badge, Button, Card, Modal, Progress, inputClass } from "@/components/ui";
import { NoraApiError, noraApi } from "@/lib/nora-api";
import type {
  InventoryStockBalance,
  ProductionWorkOrder,
  WorkOrderMaterialsView,
} from "@/lib/types";
import {
  materialIssueProgress,
  materialReconciliationProgress,
  suggestedMovementQuantity,
} from "./work-order-material-view";

type RuntimeMode = "demo" | "development" | "production";
type MaterialRequirement = WorkOrderMaterialsView["requirements"][number];

export function WorkOrderMaterialModal({
  workOrder,
  mode,
  open,
  onOpenChange,
}: {
  workOrder: ProductionWorkOrder | null;
  mode: RuntimeMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [view, setView] = useState<WorkOrderMaterialsView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [actionId, setActionId] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const commandKeys = useRef(new Map<string, string>());

  useEffect(() => {
    if (!open || !workOrder) return;
    let active = true;
    setLoading(true);
    setError("");
    setFeedback(null);
    void noraApi.workOrderMaterials(workOrder.id)
      .then((result) => {
        if (active) setView(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "工单物料加载失败，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, reloadVersion, workOrder]);

  const moveMaterial = async (
    movement: "issue" | "return",
    balance: InventoryStockBalance,
    quantity: string,
  ) => {
    if (!workOrder || !view || mode === "production") return;
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setFeedback({ tone: "error", message: "请输入大于 0 的有效数量。" });
      return;
    }
    const normalizedQuantity = numericQuantity.toFixed(3);
    const operationId = `${movement}:${balance.id}:${balance.revision}:${normalizedQuantity}`;
    const idempotencyKey = commandKeys.current.get(operationId)
      ?? `work-order-${movement}:${crypto.randomUUID()}`;
    commandKeys.current.set(operationId, idempotencyKey);
    setActionId(operationId);
    setFeedback(null);
    try {
      const result = await noraApi.moveWorkOrderMaterial(workOrder.id, movement, {
        stockBalanceId: balance.id,
        expectedBalanceRevision: balance.revision,
        quantity: normalizedQuantity,
        unit: balance.unit,
        workstationCode: view.workOrder.workCenter,
        deviceId: "WEB-DEVELOPMENT",
      }, idempotencyKey);
      setView(result.materials);
      commandKeys.current.delete(operationId);
      setFeedback({
        tone: "success",
        message: `${result.transaction.product.name} ${normalizedQuantity} ${balance.unit} 已${movement === "issue" ? "领出" : "退回"}`,
      });
    } catch (cause) {
      if (cause instanceof NoraApiError && cause.status === 409) {
        setFeedback({ tone: "error", message: `${cause.message}；已刷新最新库存。` });
        setReloadVersion((version) => version + 1);
      } else {
        setFeedback({
          tone: "error",
          message: cause instanceof Error ? cause.message : "领退料失败，请保留当前页面后重试。",
        });
      }
    } finally {
      setActionId("");
    }
  };

  const recordUsage = async (
    disposition: "consumed" | "scrapped",
    issuedLot: MaterialRequirement["issuedLots"][number],
    quantity: string,
    reason?: string,
  ) => {
    if (!workOrder || !view || mode === "production") return;
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
      setFeedback({ tone: "error", message: "请输入大于 0 的有效核销数量。" });
      return;
    }
    if (disposition === "scrapped" && !reason?.trim()) {
      setFeedback({ tone: "error", message: "登记报损时必须填写真实原因。" });
      return;
    }
    const normalizedQuantity = numericQuantity.toFixed(3);
    const normalizedReason = reason?.trim() || undefined;
    const operationId = `usage:${disposition}:${issuedLot.balance.id}:${normalizedQuantity}:${normalizedReason ?? ""}`;
    const idempotencyKey = commandKeys.current.get(operationId)
      ?? `work-order-material-usage:${crypto.randomUUID()}`;
    commandKeys.current.set(operationId, idempotencyKey);
    setActionId(operationId);
    setFeedback(null);
    try {
      const result = await noraApi.recordWorkOrderMaterialUsage(workOrder.id, {
        stockBalanceId: issuedLot.balance.id,
        disposition,
        quantity: normalizedQuantity,
        unit: issuedLot.balance.unit,
        reason: normalizedReason,
        workstationCode: view.workOrder.workCenter,
        deviceId: "WEB-DEVELOPMENT",
      }, idempotencyKey);
      setView(result.materials);
      commandKeys.current.delete(operationId);
      setFeedback({
        tone: "success",
        message: `${result.usage.product.name} ${normalizedQuantity} ${result.usage.unit} 已登记${disposition === "consumed" ? "实际耗用" : "报损"}`,
      });
    } catch (cause) {
      if (cause instanceof NoraApiError && cause.status === 409) {
        setFeedback({ tone: "error", message: `${cause.message}；已刷新最新工单物料。` });
        setReloadVersion((version) => version + 1);
      } else {
        setFeedback({
          tone: "error",
          message: cause instanceof Error ? cause.message : "物料核销失败，请保留当前页面后重试。",
        });
      }
    } finally {
      setActionId("");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (actionId) return;
        onOpenChange(nextOpen);
      }}
      title="工单物料"
      description={workOrder ? `${workOrder.code} · ${workOrder.productName}` : undefined}
      size="xl"
    >
      {mode === "production" ? (
        <div className="mb-4 rounded-xl border border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] px-4 py-3 text-sm">
          <b>当前仅可查看。</b>
          <span className="ml-1 text-[var(--text-secondary)]">生产身份与职责权限接入后才能领料、核销或退料。</span>
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${feedback.tone === "success" ? "border-[var(--status-success)]/25 bg-[var(--status-success-soft)] text-[var(--status-success)]" : "border-[var(--status-danger)]/25 bg-[var(--status-danger-soft)] text-[var(--status-danger)]"}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.tone === "success" ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-[var(--surface-muted)]" />)}
        </div>
      ) : error ? (
        <div className="py-12 text-center" role="alert">
          <AlertTriangle className="mx-auto text-[var(--status-danger)]" />
          <h3 className="mt-3 font-semibold">工单物料暂时无法加载</h3>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => setReloadVersion((version) => version + 1)}>
            <RefreshCw size={15} />重新加载
          </Button>
        </div>
      ) : view ? (
        <div className="space-y-5">
          <div className="grid gap-3 rounded-xl bg-[var(--surface-muted)] p-4 text-sm sm:grid-cols-4">
            <span><span className="block text-xs text-[var(--text-tertiary)]">工单状态</span><b className="mt-1 block">{workOrderStatusLabel(view.workOrder.status)}</b></span>
            <span><span className="block text-xs text-[var(--text-tertiary)]">计划产量</span><b className="mt-1 block tabular-nums">{view.workOrder.plannedQuantity} {view.workOrder.unit}</b></span>
            <span><span className="block text-xs text-[var(--text-tertiary)]">执行工位</span><b className="mt-1 block">{view.workOrder.workCenter}</b></span>
            <span><span className="block text-xs text-[var(--text-tertiary)]">报产准备</span><b className={`mt-1 block ${view.reconciliation.ready ? "text-[var(--status-success)]" : "text-[var(--status-warning)]"}`}>{view.reconciliation.ready ? "物料已核销" : `${view.reconciliation.pendingRequirementCount} 类待处理`}</b></span>
          </div>

          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <h3 className="font-semibold">原料需求</h3>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">来自工单冻结配方；可用批次按近效期优先。</p>
              </div>
              <Badge tone="info">{view.requirements.length} 类原料</Badge>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {view.requirements.map((requirement) => (
                <MaterialRequirementCard
                  key={`${requirement.product.id}:${requirement.unit}`}
                  requirement={requirement}
                  canWrite={mode !== "production"}
                  workOrderStatus={view.workOrder.status}
                  actionId={actionId}
                  onMove={moveMaterial}
                  onUsage={recordUsage}
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-semibold">最近耗用与报损</h3>
            {view.usages.length ? (
              <div className="mt-3 divide-y divide-[var(--stroke-subtle)] rounded-xl border border-[var(--stroke-subtle)]">
                {view.usages.slice(0, 12).map((usage) => (
                  <div key={usage.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <b>{usage.product.name}</b>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">{usage.lot.code} · {usage.location.name}</span>
                    </span>
                    <span className="text-right">
                      <b className={usage.disposition === "consumed" ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}>
                        {usage.disposition === "consumed" ? "实际耗用" : "报损"} {usage.quantity} {usage.unit}
                      </b>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">{usage.actor} · {formatOccurrence(usage.occurredAt)}</span>
                      {usage.reason ? <span className="mt-1 block text-xs text-[var(--text-secondary)]">{usage.reason}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="mt-3 px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">尚无实际耗用或报损记录</Card>
            )}
          </section>

          <section>
            <h3 className="font-semibold">最近领退料</h3>
            {view.movements.length ? (
              <div className="mt-3 divide-y divide-[var(--stroke-subtle)] rounded-xl border border-[var(--stroke-subtle)]">
                {view.movements.slice(0, 12).map((movement) => (
                  <div key={movement.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>
                      <b>{movement.product.name}</b>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">{movement.lot.code} · {movement.location.name}</span>
                    </span>
                    <span className="text-right">
                      <b className={movement.type === "issue" ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}>
                        {movement.type === "issue" ? "领料" : "退料"} {movement.quantity} {movement.unit}
                      </b>
                      <span className="ml-2 text-xs text-[var(--text-tertiary)]">{movement.actor} · {formatOccurrence(movement.occurredAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="mt-3 px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">尚无领退料记录</Card>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function MaterialRequirementCard({
  requirement,
  canWrite,
  workOrderStatus,
  actionId,
  onMove,
  onUsage,
}: {
  requirement: MaterialRequirement;
  canWrite: boolean;
  workOrderStatus: WorkOrderMaterialsView["workOrder"]["status"];
  actionId: string;
  onMove: (movement: "issue" | "return", balance: InventoryStockBalance, quantity: string) => Promise<void>;
  onUsage: (disposition: "consumed" | "scrapped", issuedLot: MaterialRequirement["issuedLots"][number], quantity: string, reason?: string) => Promise<void>;
}) {
  const firstLot = requirement.availableLots[0];
  const [selectedBalanceId, setSelectedBalanceId] = useState(firstLot?.id ?? "");
  const selectedBalance = requirement.availableLots.find((balance) => balance.id === selectedBalanceId) ?? firstLot;
  const [issueQuantity, setIssueQuantity] = useState(() => (
    suggestedMovementQuantity(requirement.remainingQuantity, firstLot?.availableQuantity)
  ));

  useEffect(() => {
    const current = requirement.availableLots.find((balance) => balance.id === selectedBalanceId)
      ?? requirement.availableLots[0];
    setSelectedBalanceId(current?.id ?? "");
    setIssueQuantity(suggestedMovementQuantity(requirement.remainingQuantity, current?.availableQuantity));
  }, [requirement.availableLots, requirement.remainingQuantity, selectedBalanceId]);

  const issueProgress = materialIssueProgress(requirement);
  const reconciliationProgress = materialReconciliationProgress(requirement);
  const numericIssueQuantity = Number(issueQuantity);
  const maximumIssueQuantity = Math.min(
    Number(requirement.remainingQuantity),
    Number(selectedBalance?.availableQuantity ?? 0),
  );
  const issueQuantityIsValid = Number.isFinite(numericIssueQuantity)
    && numericIssueQuantity > 0
    && numericIssueQuantity <= maximumIssueQuantity;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <span>
          <span className="font-mono text-[11px] font-semibold text-[var(--interactive)]">{requirement.product.code}</span>
          <h4 className="mt-1 font-semibold">{requirement.product.name}</h4>
        </span>
        <span className="text-right text-xs tabular-nums">
          <span className="block text-[var(--text-tertiary)]">净领用 / 计划</span>
          <b className="mt-1 block">{requirement.netIssuedQuantity} / {requirement.plannedQuantity} {requirement.unit}</b>
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Progress value={issueProgress} className="flex-1" />
        <span className="text-xs text-[var(--text-tertiary)]">待领 {requirement.remainingQuantity}</span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <Progress value={reconciliationProgress} className="flex-1" />
        <span className="text-xs text-[var(--text-tertiary)]">待核销 {requirement.unaccountedQuantity}</span>
      </div>

      {Number(requirement.remainingQuantity) > 0 ? (
        requirement.availableLots.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_110px_auto]">
            <select
              aria-label={`${requirement.product.name} 库存批次`}
              value={selectedBalance?.id ?? ""}
              onChange={(event) => {
                const next = requirement.availableLots.find((balance) => balance.id === event.target.value);
                setSelectedBalanceId(event.target.value);
                setIssueQuantity(suggestedMovementQuantity(requirement.remainingQuantity, next?.availableQuantity));
              }}
              className={inputClass}
            >
              {requirement.availableLots.map((balance, index) => (
                <option key={balance.id} value={balance.id}>
                  {index === 0 ? "推荐 · " : ""}{balance.lot.code} · {balance.availableQuantity} {balance.unit} · {balance.location.name}
                </option>
              ))}
            </select>
            <input
              aria-label={`${requirement.product.name} 领料数量`}
              type="number"
              min="0.001"
              step="0.001"
              max={maximumIssueQuantity.toFixed(3)}
              value={issueQuantity}
              onChange={(event) => setIssueQuantity(event.target.value)}
              className={inputClass}
            />
            <Button
              size="sm"
              disabled={!canWrite || !selectedBalance || !issueQuantityIsValid || Boolean(actionId)}
              onClick={() => selectedBalance && void onMove("issue", selectedBalance, issueQuantity)}
            >
              {actionId.startsWith("issue:") ? <RefreshCw className="animate-spin" size={14} /> : <ArrowDownToLine size={14} />}
              领料
            </Button>
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-[var(--status-warning-soft)] px-3 py-2 text-xs text-[var(--status-warning)]">暂无可领的已放行批次</p>
        )
      ) : (
        <p className="mt-4 rounded-lg bg-[var(--status-success-soft)] px-3 py-2 text-xs text-[var(--status-success)]">计划领料已满足</p>
      )}

      {requirement.issuedLots.length ? (
        <div className="mt-4 border-t border-[var(--stroke-subtle)] pt-3">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">已领批次去向</p>
          <div className="space-y-2">
            {requirement.issuedLots.map((issuedLot) => (
              <IssuedLotRow
                key={issuedLot.balance.id}
                issuedLot={issuedLot}
                canWrite={canWrite}
                canRecordUsage={canWrite && workOrderStatus === "running"}
                busy={Boolean(actionId)}
                onReturn={(quantity) => onMove("return", issuedLot.balance, quantity)}
                onUsage={(disposition, quantity, reason) => onUsage(disposition, issuedLot, quantity, reason)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function IssuedLotRow({
  issuedLot,
  canWrite,
  canRecordUsage,
  busy,
  onReturn,
  onUsage,
}: {
  issuedLot: MaterialRequirement["issuedLots"][number];
  canWrite: boolean;
  canRecordUsage: boolean;
  busy: boolean;
  onReturn: (quantity: string) => Promise<void>;
  onUsage: (disposition: "consumed" | "scrapped", quantity: string, reason?: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(issuedLot.unaccountedQuantity);
  const [reason, setReason] = useState("");
  useEffect(() => setQuantity(issuedLot.unaccountedQuantity), [issuedLot.unaccountedQuantity]);
  const numericQuantity = Number(quantity);
  const quantityIsValid = Number.isFinite(numericQuantity)
    && numericQuantity > 0
    && numericQuantity <= Number(issuedLot.unaccountedQuantity);
  return (
    <div className="rounded-lg bg-[var(--surface-muted)] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
        <span><b>{issuedLot.balance.lot.code}</b><span className="ml-1 text-[var(--text-tertiary)]">· {issuedLot.balance.location.name}</span></span>
        <span className="tabular-nums text-[var(--text-secondary)]">已领 {issuedLot.netIssuedQuantity} · 耗用 {issuedLot.consumedQuantity} · 报损 {issuedLot.scrappedQuantity} · 待核销 {issuedLot.unaccountedQuantity}</span>
      </div>
      {Number(issuedLot.unaccountedQuantity) > 0 ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-[100px_1fr_auto]">
          <input
            aria-label={`${issuedLot.balance.lot.code} 处理数量`}
            type="number"
            min="0.001"
            step="0.001"
            max={issuedLot.unaccountedQuantity}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={inputClass}
          />
          <input
            aria-label={`${issuedLot.balance.lot.code} 核销说明`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            placeholder="报损时填写原因；实际耗用可备注"
            className={inputClass}
          />
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" disabled={!canRecordUsage || busy || !quantityIsValid} onClick={() => void onUsage("consumed", quantity, reason)}>
              <ClipboardCheck size={14} />耗用
            </Button>
            <Button size="sm" variant="danger" disabled={!canRecordUsage || busy || !quantityIsValid || !reason.trim()} onClick={() => void onUsage("scrapped", quantity, reason)}>
              <PackageX size={14} />报损
            </Button>
            <Button size="sm" variant="secondary" disabled={!canWrite || busy || !quantityIsValid} onClick={() => void onReturn(quantity)}>
              <ArrowUpFromLine size={14} />退料
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-xs text-[var(--status-success)]"><CheckCircle2 size={14} />该批次已完整核销</p>
      )}
    </div>
  );
}

function workOrderStatusLabel(status: WorkOrderMaterialsView["workOrder"]["status"]) {
  return {
    pending: "待开工",
    running: "生产中",
    paused: "已暂停",
    awaiting_quality: "等待质检",
    exception: "异常",
    completed: "已完成",
    cancelled: "已取消",
  }[status];
}

function formatOccurrence(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
