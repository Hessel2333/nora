"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  PackageCheck,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import { Badge, Button, Field, Modal, inputClass } from "@/components/ui";
import { NoraApiError, noraApi } from "@/lib/nora-api";
import type { NoraRuntimeMode } from "@/lib/runtime-mode";
import type { ProductionWorkOrder, WorkOrderMaterialsView, WorkOrderOutputView } from "@/lib/types";
import { outputTemperatureRange, qualityReleaseIssue } from "./work-order-output-view";

const outputStatus = {
  pending_quality: { label: "待检", tone: "warning" as const },
  released: { label: "已放行入库", tone: "success" as const },
  rejected: { label: "不合格", tone: "danger" as const },
};

const workOrderStatusLabel: Record<ProductionWorkOrder["status"], string> = {
  pending: "待开工",
  running: "生产中",
  paused: "已暂停",
  awaiting_quality: "等待质检",
  completed: "已完成",
  exception: "异常",
  cancelled: "已取消",
};

export function WorkOrderOutputModal({
  workOrder,
  mode,
  open,
  onOpenChange,
  onWorkOrderChanged,
}: {
  workOrder: ProductionWorkOrder | null;
  mode: NoraRuntimeMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkOrderChanged: () => void;
}) {
  const [view, setView] = useState<WorkOrderOutputView | null>(null);
  const [materials, setMaterials] = useState<WorkOrderMaterialsView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"report" | "released" | "rejected" | "">("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [lotCode, setLotCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [varianceReason, setVarianceReason] = useState("");
  const [standardVersion, setStandardVersion] = useState("");
  const [sampleQuantity, setSampleQuantity] = useState("");
  const [measuredTemperature, setMeasuredTemperature] = useState("");
  const [appearancePassed, setAppearancePassed] = useState(false);
  const [packageSealPassed, setPackageSealPassed] = useState(false);
  const [labelPassed, setLabelPassed] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [inspectionNote, setInspectionNote] = useState("");
  const idempotencyKeys = useRef(new Map<string, string>());

  useEffect(() => {
    if (!open || !workOrder || mode === "demo") return;
    let active = true;
    setLoading(true);
    setError("");
    setFeedback("");
    setQuantity(workOrder.plannedQuantity);
    void Promise.all([
      noraApi.workOrderOutputs(workOrder.id),
      noraApi.workOrderMaterials(workOrder.id),
    ])
      .then(([result, materialResult]) => {
        if (!active) return;
        setView(result);
        setMaterials(materialResult);
        setLocationId((current) => current || result.finishedGoodsLocations[0]?.id || "");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "产出与质检记录加载失败，请稍后重试。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, open, requestVersion, workOrder]);

  const pendingOutput = useMemo(
    () => view?.outputs.find((output) => output.status === "pending_quality") ?? null,
    [view],
  );
  const canWrite = mode !== "production";

  const report = async () => {
    if (!workOrder || !view) return;
    if (!materials?.reconciliation.ready) {
      setError("工单物料尚未领齐或完成去向核销，请先返回工单处理物料。");
      return;
    }
    const numericQuantity = Number(quantity);
    if (!Number.isFinite(numericQuantity) || numericQuantity <= 0 || !/^\d+(\.\d{1,3})?$/.test(quantity.trim())) {
      setError("实际产出数量必须是大于 0、最多 3 位小数的数字");
      return;
    }
    if (!lotCode.trim()) {
      setError("请填写成品批次号");
      return;
    }
    if (!expiresAt) {
      setError("请选择成品有效期");
      return;
    }
    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      setError("成品有效期必须晚于当前时间");
      return;
    }
    if (Number(quantity) !== Number(view.workOrder.plannedQuantity) && !varianceReason.trim()) {
      setError("实际产出与计划数量不一致时，请填写差异原因");
      return;
    }
    const operationId = `${view.workOrder.id}:${view.workOrder.revision}:report-output`;
    const key = idempotencyKeys.current.get(operationId) ?? `work-order-output:${crypto.randomUUID()}`;
    idempotencyKeys.current.set(operationId, key);
    setBusy("report");
    setError("");
    setFeedback("");
    try {
      const result = await noraApi.reportWorkOrderOutput(view.workOrder.id, {
        revision: view.workOrder.revision,
        quantity: quantity.trim(),
        unit: view.workOrder.unit,
        lotCode: lotCode.trim(),
        expiresAt: expiry.toISOString(),
        varianceReason: varianceReason.trim() || undefined,
        workstationCode: view.workOrder.workCenter,
        deviceId: "WEB-DEVELOPMENT",
      }, key);
      setView(result);
      idempotencyKeys.current.delete(operationId);
      setFeedback(`${result.workOrder.code} 已申报产出，成品批次等待质量判定。`);
      onWorkOrderChanged();
    } catch (cause) {
      handleCommandError(cause);
    } finally {
      setBusy("");
    }
  };

  const inspect = async (decision: "released" | "rejected") => {
    if (!view || !pendingOutput) return;
    const commonIssue = !standardVersion.trim()
      ? "请填写质量标准版本"
      : !Number.isInteger(Number(sampleQuantity)) || Number(sampleQuantity) <= 0
        ? "抽样数量必须为正整数"
        : !/^-?\d+(\.\d{1,2})?$/.test(measuredTemperature.trim())
          ? "实测温度必须是最多 2 位小数的数字"
          : "";
    const issue = decision === "released" ? qualityReleaseIssue({
      output: pendingOutput,
      measuredTemperature,
      appearancePassed,
      packageSealPassed,
      labelPassed,
      standardVersion,
      sampleQuantity,
      locationId,
    }) : commonIssue || (!inspectionNote.trim() ? "不合格判定必须填写原因和处置说明" : "");
    if (issue) {
      setError(issue);
      return;
    }
    const operationId = `${pendingOutput.id}:${pendingOutput.revision}:${decision}`;
    const key = idempotencyKeys.current.get(operationId) ?? `quality-inspection:${crypto.randomUUID()}`;
    idempotencyKeys.current.set(operationId, key);
    setBusy(decision);
    setError("");
    setFeedback("");
    try {
      const result = await noraApi.inspectWorkOrderOutput(view.workOrder.id, pendingOutput.id, {
        workOrderRevision: view.workOrder.revision,
        outputRevision: pendingOutput.revision,
        decision,
        standardVersion: standardVersion.trim(),
        sampleQuantity: Number(sampleQuantity),
        measuredTemperature: measuredTemperature.trim(),
        appearancePassed,
        packageSealPassed,
        labelPassed,
        locationId: decision === "released" ? locationId : undefined,
        note: inspectionNote.trim() || undefined,
        workstationCode: "质量检验台",
        deviceId: "WEB-DEVELOPMENT",
      }, key);
      setView(result);
      idempotencyKeys.current.delete(operationId);
      setFeedback(decision === "released"
        ? `${result.workOrder.code} 已质量放行、完成入库与工单完工。`
        : `${result.workOrder.code} 已判定不合格并进入异常处理。`);
      onWorkOrderChanged();
    } catch (cause) {
      handleCommandError(cause);
    } finally {
      setBusy("");
    }
  };

  const handleCommandError = (cause: unknown) => {
    if (cause instanceof NoraApiError && cause.status === 409) {
      setError(`${cause.message}；已重新加载最新记录。`);
      setRequestVersion((version) => version + 1);
      onWorkOrderChanged();
      return;
    }
    setError(cause instanceof Error ? cause.message : "操作失败，请保留当前页面后重试。");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="产出与质量"
      description={workOrder ? `${workOrder.code} · ${workOrder.productName}` : undefined}
      size="xl"
      footer={<Button variant="secondary" disabled={Boolean(busy)} onClick={() => onOpenChange(false)}>关闭</Button>}
    >
      {loading ? <OutputLoading /> : error && !view ? (
        <div className="py-10 text-center" role="alert">
          <AlertTriangle className="mx-auto text-[var(--status-danger)]" />
          <p className="mt-3 text-sm text-[var(--text-secondary)]">{error}</p>
          <Button className="mt-4" variant="secondary" onClick={() => setRequestVersion((version) => version + 1)}><RefreshCw size={15} />重新加载</Button>
        </div>
      ) : view ? (
        <div className="space-y-5">
          {mode === "production" ? (
            <div className="rounded-xl border border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] px-4 py-3 text-sm" role="note">
              <b>当前仅可查看。</b><span className="ml-1 text-[var(--text-secondary)]">质量身份与库位权限接入后才能报产或判定。</span>
            </div>
          ) : null}
          {feedback ? <div className="flex gap-2 rounded-xl border border-[var(--status-success)]/25 bg-[var(--status-success-soft)] px-4 py-3 text-sm text-[var(--status-success)]" role="status"><CheckCircle2 size={17} />{feedback}</div> : null}
          {error ? <div className="flex gap-2 rounded-xl border border-[var(--status-danger)]/25 bg-[var(--status-danger-soft)] px-4 py-3 text-sm text-[var(--status-danger)]" role="alert"><AlertTriangle size={17} />{error}</div> : null}

          <div className="grid gap-3 rounded-xl bg-[var(--surface-muted)] p-4 text-sm sm:grid-cols-4">
            <Summary label="工单状态" value={workOrderStatusLabel[view.workOrder.status]} />
            <Summary label="计划数量" value={`${view.workOrder.plannedQuantity} ${view.workOrder.unit}`} />
            <Summary label="已申报批次" value={`${view.outputs.length}`} />
            <Summary
              label="入库结果"
              value={view.outputs.find((output) => output.inventoryPosting)?.inventoryPosting?.location.code
                ?? (pendingOutput ? "等待判定" : "未入库")}
            />
          </div>

          {view.workOrder.status === "running" && !pendingOutput ? (
            <section aria-labelledby="report-output-title">
              <div className="mb-3 flex items-center gap-2"><PackageCheck size={18} className="text-[var(--interactive)]" /><h3 id="report-output-title" className="font-semibold">申报实际产出</h3></div>
              {materials?.reconciliation.ready ? (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-[var(--status-success)]/25 bg-[var(--status-success-soft)] px-4 py-3 text-sm text-[var(--status-success)]">
                  <CheckCircle2 size={17} /><span>物料已领齐并完成耗用、报损或退料核销。</span>
                </div>
              ) : (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--status-warning)]/25 bg-[var(--status-warning-soft)] px-4 py-3 text-sm text-[var(--status-warning)]" role="note">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                  <span>还有 {materials?.reconciliation.pendingRequirementCount ?? "—"} 类物料待处理。请关闭本窗口，在工单行点击“物料”完成领料和去向核销。</span>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`实际产出数量（${view.workOrder.unit}）`} required>
                  <input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="decimal" className={inputClass} disabled={!canWrite || Boolean(busy)} />
                </Field>
                <Field label="成品批次号" required>
                  <input value={lotCode} onChange={(event) => setLotCode(event.target.value)} className={inputClass} maxLength={64} placeholder="扫描或输入批次号" disabled={!canWrite || Boolean(busy)} />
                </Field>
                <Field label="有效期" required>
                  <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={inputClass} disabled={!canWrite || Boolean(busy)} />
                </Field>
                <Field label="数量差异原因" hint="实际数量与计划一致时可不填。">
                  <input value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} className={inputClass} maxLength={500} placeholder="例如：修整损耗导致少产 2 份" disabled={!canWrite || Boolean(busy)} />
                </Field>
              </div>
              <div className="mt-4 flex justify-end"><Button disabled={!canWrite || !materials?.reconciliation.ready || Boolean(busy)} onClick={() => void report()}>{busy === "report" ? <RefreshCw className="animate-spin" size={15} /> : <PackageCheck size={15} />}确认报产</Button></div>
            </section>
          ) : null}

          {view.workOrder.status === "awaiting_quality" && pendingOutput ? (
            <section aria-labelledby="inspect-output-title">
              <div className="mb-3 flex items-center gap-2"><ClipboardCheck size={18} className="text-[var(--interactive)]" /><h3 id="inspect-output-title" className="font-semibold">记录质量判定</h3></div>
              <div className="mb-4 rounded-xl border border-[var(--stroke)] p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><b>{pendingOutput.lot.code}</b><Badge tone="warning">待检</Badge></div>
                <p className="mt-2 text-[var(--text-secondary)]">{pendingOutput.quantity} {pendingOutput.unit} · 冻结温度依据：{outputTemperatureRange(pendingOutput)}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="质量标准版本" required><input value={standardVersion} onChange={(event) => setStandardVersion(event.target.value)} className={inputClass} maxLength={80} placeholder="例如 Q-NET-PREP-V1.2" disabled={!canWrite || Boolean(busy)} /></Field>
                <Field label="抽样数量" required><input value={sampleQuantity} onChange={(event) => setSampleQuantity(event.target.value)} inputMode="numeric" className={inputClass} disabled={!canWrite || Boolean(busy)} /></Field>
                <Field label="实测温度（℃）" required><input value={measuredTemperature} onChange={(event) => setMeasuredTemperature(event.target.value)} inputMode="decimal" className={inputClass} disabled={!canWrite || Boolean(busy)} /></Field>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <QualityCheck label="外观符合标准" checked={appearancePassed} onChange={setAppearancePassed} disabled={!canWrite || Boolean(busy)} />
                <QualityCheck label="包装封口完好" checked={packageSealPassed} onChange={setPackageSealPassed} disabled={!canWrite || Boolean(busy)} />
                <QualityCheck label="批次标签正确" checked={labelPassed} onChange={setLabelPassed} disabled={!canWrite || Boolean(busy)} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="合格入库库位" required>
                  <select value={locationId} onChange={(event) => setLocationId(event.target.value)} className={inputClass} disabled={!canWrite || Boolean(busy)}>
                    <option value="">请选择成品库</option>
                    {view.finishedGoodsLocations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}
                  </select>
                </Field>
                <Field label="检验说明" hint="判定不合格时必填。"><input value={inspectionNote} onChange={(event) => setInspectionNote(event.target.value)} className={inputClass} maxLength={500} placeholder="记录异常、处置或补充说明" disabled={!canWrite || Boolean(busy)} /></Field>
              </div>
              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="danger" disabled={!canWrite || Boolean(busy)} onClick={() => void inspect("rejected")}>{busy === "rejected" ? <RefreshCw className="animate-spin" size={15} /> : null}判定不合格</Button>
                <Button variant="success" disabled={!canWrite || Boolean(busy)} onClick={() => void inspect("released")}>{busy === "released" ? <RefreshCw className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}合格放行并入库</Button>
              </div>
            </section>
          ) : null}

          <section aria-labelledby="output-history-title">
            <div className="mb-3 flex items-center justify-between gap-3"><h3 id="output-history-title" className="font-semibold">产出与判定记录</h3>{view.outputs.some((output) => output.inventoryPosting) ? <Link href="/inventory/stock" className="focus-ring inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[var(--interactive)]"><Warehouse size={15} />查看成品库存</Link> : null}</div>
            {view.outputs.length ? <div className="space-y-3">{view.outputs.map((output) => <OutputHistory key={output.id} output={output} />)}</div> : <div className="rounded-xl border border-dashed border-[var(--stroke)] px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">还没有实际产出记录</div>}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><span className="block text-xs text-[var(--text-tertiary)]">{label}</span><b className="mt-1 block tabular-nums">{value}</b></div>;
}

function QualityCheck({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled: boolean }) {
  return <label className="flex min-h-11 items-center gap-3 rounded-xl border border-[var(--stroke)] px-3 text-sm"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} disabled={disabled} className="h-4 w-4 accent-[var(--interactive)]" /><span>{label}</span></label>;
}

function OutputHistory({ output }: { output: WorkOrderOutputView["outputs"][number] }) {
  const status = outputStatus[output.status];
  const inspection = output.inspections[0];
  return (
    <article className="rounded-xl border border-[var(--stroke)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><b className="font-mono text-sm">{output.lot.code}</b><p className="mt-1 text-xs text-[var(--text-tertiary)]">{output.reportedAt} · {output.actor}</p></div><Badge tone={status.tone}>{status.label}</Badge></div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><span><span className="text-[var(--text-tertiary)]">实际产出 </span><b>{output.quantity} {output.unit}</b></span><span><span className="text-[var(--text-tertiary)]">有效期 </span><b>{output.lot.expiresAt ?? "未设置"}</b></span><span><span className="text-[var(--text-tertiary)]">温度依据 </span><b>{outputTemperatureRange(output)}</b></span></div>
      {output.varianceReason ? <p className="mt-2 text-xs text-[var(--text-secondary)]">数量差异：{output.varianceReason}</p> : null}
      {inspection ? <div className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-secondary)]">{inspection.standardVersion} · 抽样 {inspection.sampleQuantity} · {inspection.measuredTemperature} ℃ · {inspection.actor}{inspection.note ? ` · ${inspection.note}` : ""}</div> : null}
      {output.inventoryPosting ? <p className="mt-2 text-xs text-[var(--status-success)]">已入 {output.inventoryPosting.location.code} · {output.inventoryPosting.quantity} {output.inventoryPosting.unit}</p> : null}
    </article>
  );
}

function OutputLoading() {
  return <div className="space-y-3" aria-busy="true"><div className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" /><div className="h-48 animate-pulse rounded-xl bg-[var(--surface-subtle)]" /></div>;
}
