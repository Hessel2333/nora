"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";
import { DocumentEventTimeline, DocumentSection } from "@/components/document-ui";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  Card,
  DetailHeader,
  Field,
  inputClass,
} from "@/components/ui";
import { noraApi, type ProductionReadiness } from "@/lib/nora-api";
import { getOrderBomCoverage } from "@/lib/bom-structure";
import { useNoraStore } from "@/lib/store";
import type { SalesOrder } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const totalOf = (order: SalesOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

export function OrderReviewPage({ id }: { id: string }) {
  const router = useRouter();
  const order = useNoraStore(
    (state) => state.orders.find((item) => item.id === id),
  );
  const approve = useNoraStore((state) => state.approveOrder);
  const returnOrder = useNoraStore((state) => state.returnOrder);
  const mode = useNoraStore((state) => state.mode);
  const boms = useNoraStore((state) => state.boms);
  const [apiReadiness, setApiReadiness] = useState<ProductionReadiness>();
  const [apiReadinessError, setApiReadinessError] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const reviewOrderId = order?.id;
  const demoReadiness = useMemo(() => {
    if (mode !== "demo" || !order) return undefined;
    const coverage = getOrderBomCoverage(order, boms);
    const lines = coverage.lines.map(({ line, bom }) => ({
      salesOrderLineId: line.id,
      productId: line.productId,
      productCode: line.productCode ?? line.productId,
      productName: line.productName,
      requiredQuantity: line.quantity,
      unit: line.unit,
      bomReady: Boolean(bom),
      selectedBomVersionId: bom?.versionId ?? bom?.id,
      selectedBomVersion: bom?.version,
    }));
    const readyLineCount = lines.filter((line) => line.bomReady).length;
    return {
      orderId: order.id,
      deliveryAt: order.deliveryAt,
      ready: readyLineCount === lines.length,
      readyLineCount,
      missingBomCount: lines.length - readyLineCount,
      lines,
    } satisfies ProductionReadiness;
  }, [boms, mode, order]);
  const readiness = mode === "demo" ? demoReadiness : apiReadiness;
  const readinessError = mode === "demo" ? "" : apiReadinessError;

  useEffect(() => {
    if (!reviewOrderId || mode === "demo") return;
    let active = true;
    setApiReadiness(undefined);
    setApiReadinessError("");
    void noraApi
      .productionReadiness(reviewOrderId)
      .then((result) => {
        if (active) setApiReadiness(result);
      })
      .catch((reason) => {
        if (active) {
          setApiReadinessError(
            reason instanceof Error ? reason.message : "BOM 检查失败，请稍后重试。",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [mode, reviewOrderId]);

  const handleApprove = async () => {
    if (!order) return;
    setSaving(true);
    setError("");
    try {
      const approvedOrder = await approve(order.id, comment.trim() || undefined);
      const query = new URLSearchParams({ result: "approved", orderCode: approvedOrder.code });
      if (mode === "demo") {
        query.set("demo", "true");
      } else {
        try {
          const demand = await noraApi.productionDemand(order.id);
          query.set("demandCode", demand.code);
        } catch {
          // Approval is already committed. The destination keeps the success
          // result and lets the production-demand workbench reload the number.
        }
      }
      router.push(`/orders/approvals?${query.toString()}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "审核失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!order) return;
    if (!comment.trim()) {
      setError("退回订单时请填写需要修改的内容。");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const returnedOrder = await returnOrder(order.id, comment.trim());
      const query = new URLSearchParams({ result: "returned", orderCode: returnedOrder.code });
      router.push(`/orders/approvals?${query.toString()}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "退回失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  if (!order) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="text-sm text-[var(--text-tertiary)]">正在加载订单审核信息…</p>
      </Card>
    );
  }

  return (
    <>
      <DetailHeader
        title={`审核 ${order.code}`}
        navigation={
          <Link
            href="/orders/approvals"
            className="focus-ring -ml-2 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--interactive)]"
          >
            <ArrowLeft size={14} />
            返回订单审核
          </Link>
        }
        status={<Badge tone="warning">待审核</Badge>}
        metadata={
          <>
            <span>{order.customerName}</span>
            <span aria-hidden="true">·</span>
            <span>{order.lines.length} 项商品</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">要求 {order.deliveryAt} 送达</span>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card className="grid gap-4 p-5 sm:grid-cols-3">
            <ReviewMetric label="客户" value={order.customerName} />
            <ReviewMetric label="要求送达" value={order.deliveryAt} tabular />
            <ReviewMetric label="订单金额" value={formatCurrency(totalOf(order))} tabular />
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-[var(--stroke-subtle)] px-5 py-4">
              <div className="flex items-center gap-1"><h2 className="font-semibold text-[var(--text-primary)]">订单商品与 BOM</h2><HelpTip title="需求明细">审核通过后，将按当前商品和数量创建生产需求明细。</HelpTip></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-3 font-medium">商品</th>
                    <th className="px-4 py-3 font-medium">BOM 状态</th>
                    <th className="px-4 py-3 text-right font-medium">数量</th>
                    <th className="px-4 py-3 text-right font-medium">单价</th>
                    <th className="px-5 py-3 text-right font-medium">金额</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--stroke-subtle)]">
                  {order.lines.map((line) => {
                    const lineReadiness = readiness?.lines.find(
                      (item) => item.salesOrderLineId === line.id,
                    );
                    return (
                      <tr key={line.id}>
                        <td className="px-5 py-4">
                          <p className="font-medium text-[var(--text-primary)]">{line.productName}</p>
                          <p className="mt-1 font-mono text-[11px] text-[var(--text-tertiary)]">
                            {lineReadiness?.productCode ?? line.productCode ?? line.productId}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {!readiness && !readinessError ? (
                            <Badge>正在检查</Badge>
                          ) : lineReadiness?.bomReady ? (
                            <Badge tone="success">{lineReadiness.selectedBomVersion} 可用</Badge>
                          ) : (
                            <Badge tone="warning">缺少有效 BOM</Badge>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">
                          {formatNumber(line.quantity)} {line.unit}
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">
                          {formatCurrency(line.unitPrice)}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold tabular-nums">
                          {formatCurrency(line.quantity * line.unitPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-[var(--text-primary)]">审核检查</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ReviewCheck
                title="客户与配送"
                detail={`${order.contact} · ${order.address}`}
                ready
              />
              <ReviewCheck
                title="商品与数量"
                detail={`${order.lines.length} 项商品，共 ${formatNumber(order.lines.reduce((sum, line) => sum + line.quantity, 0))} 份`}
                ready
              />
              <ReviewCheck
                title="BOM 就绪"
                detail={
                  readinessError
                    ? readinessError
                    : readiness
                      ? readiness.ready
                        ? `${readiness.readyLineCount} 项均已匹配有效版本`
                        : `${readiness.missingBomCount} 项需要在批次分配前补齐 BOM`
                      : "正在按交期检查有效版本"
                }
                ready={readiness?.ready}
                loading={!readiness && !readinessError}
              />
            </div>
            {readiness && !readiness.ready && (
              <p className="mt-4 rounded-[var(--radius-control)] bg-[var(--status-warning-soft)] p-3 text-xs leading-5 text-[var(--text-secondary)]">
                缺少 BOM 不阻止确认客户需求，但该需求不能进入批次分配。请在生产准备阶段前往
                <Link href="/catalog/boms" className="mx-1 font-medium text-[var(--interactive)] hover:underline">
                  产品与 BOM
                </Link>
                补齐配方。
              </p>
            )}
          </Card>

          <DocumentSection title="操作记录">
            <DocumentEventTimeline events={order.events ?? []} />
          </DocumentSection>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--interactive-soft)] text-[var(--interactive)]">
                <ClipboardCheck size={19} />
              </span>
              <div className="flex items-center gap-1">
                <h2 className="font-semibold text-[var(--text-primary)]">审核决定</h2>
                <HelpTip title="审核后流程">
                  <span className="block">通过后将：</span>
                  <span className="mt-1 block">• 锁定订单商品与数量</span>
                  <span className="block">• 创建独立生产需求</span>
                  <span className="block">• 冻结交期对应的完整配方快照</span>
                  <span className="block">• 由计划员确认聚合或拆分</span>
                  <span className="mt-1 block">不会直接生成生产工单。</span>
                </HelpTip>
              </div>
            </div>

            <div className="mt-5">
              <Field label="审核意见" hint="审核通过时可选；退回修改时必填。">
                <textarea
                  aria-invalid={Boolean(error)}
                  className={`${inputClass} min-h-32 resize-y py-2.5`}
                  placeholder="补充交期、数量、配送或 BOM 处理意见"
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    if (error) setError("");
                  }}
                />
              </Field>
            </div>

            {error && (
              <p className="mt-3 text-xs text-[var(--status-danger)]" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 grid gap-2">
              <Button disabled={saving || order.status !== "pending"} onClick={() => void handleApprove()}>
                <CheckCircle2 size={16} />
                审核通过并创建需求
              </Button>
              <Button variant="secondary" disabled={saving || order.status !== "pending"} onClick={() => void handleReturn()}>
                <RotateCcw size={16} />
                退回修改
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ReviewMetric({ label, value, tabular = false }: { label: string; value: string; tabular?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      <p className={`mt-1 font-semibold text-[var(--text-primary)] ${tabular ? "tabular-nums" : ""}`}>{value}</p>
    </div>
  );
}

function ReviewCheck({
  title,
  detail,
  ready = false,
  loading = false,
}: {
  title: string;
  detail: string;
  ready?: boolean;
  loading?: boolean;
}) {
  const Icon = ready ? CheckCircle2 : AlertTriangle;
  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--stroke-subtle)] p-4">
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-[var(--stroke)] border-t-[var(--interactive)]" />
        ) : (
          <Icon size={16} className={ready ? "text-[var(--status-success)]" : "text-[var(--status-warning)]"} />
        )}
        <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-[var(--text-tertiary)]">{detail}</p>
    </div>
  );
}
