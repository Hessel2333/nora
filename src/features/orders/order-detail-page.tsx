"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  FilePenLine,
  Layers3,
  Printer,
  Send,
} from "lucide-react";
import {
  DocumentEventTimeline,
  DocumentSection,
} from "@/components/document-ui";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DetailHeader,
  Progress,
  SectionTitle,
} from "@/components/ui";
import { explodeDraftOrder, type ExplodedMaterial } from "@/lib/bom-structure";
import { noraApi, type MaterialRequirements } from "@/lib/nora-api";
import { useNoraIdentity } from "@/features/auth/nora-identity-provider";
import { useNoraStore } from "@/lib/store";
import type { ProductionDemand, SalesOrder } from "@/lib/types";
import {
  formatCurrency,
  formatNumber,
  orderSourceLabel,
  orderStatusLabel,
  statusTone,
} from "@/lib/utils";

const totalOf = (order: SalesOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

type StepState = "completed" | "current" | "upcoming";

function fulfillmentSteps(status: SalesOrder["status"]): Array<{
  label: string;
  state: StepState;
}> {
  const productionComplete = ["delivering", "completed", "reconciled"].includes(
    status,
  );
  const deliveryComplete = ["completed", "reconciled"].includes(status);

  return [
    { label: "订单创建", state: "completed" },
    {
      label: "审核与需求",
      state:
        status === "draft"
          ? "upcoming"
          : status === "pending"
            ? "current"
            : "completed",
    },
    {
      label: "生产计划与执行",
      state: productionComplete
        ? "completed"
        : status === "approved" || status === "in_production"
          ? "current"
          : "upcoming",
    },
    {
      label: "配送签收",
      state: deliveryComplete
        ? "completed"
        : status === "delivering"
          ? "current"
          : "upcoming",
    },
  ];
}

export function OrderDetailPage({ id }: { id: string }) {
  const order = useNoraStore(
    (state) => state.orders.find((item) => item.id === id) ?? state.orders[0],
  );
  const boms = useNoraStore((state) => state.boms);
  const submit = useNoraStore((state) => state.submitOrder);
  const reconcile = useNoraStore((state) => state.reconcileOrder);
  const mode = useNoraStore((state) => state.mode);
  const { can } = useNoraIdentity();
  const [demand, setDemand] = useState<ProductionDemand>();
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandError, setDemandError] = useState("");
  const [requirements, setRequirements] = useState<MaterialRequirements>();
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState("");
  const loadRequirements = async () => {
    setRequirementsLoading(true);
    setRequirementsError("");
    try {
      setRequirements(await noraApi.materialRequirements(order.id));
    } catch (error) {
      setRequirementsError(error instanceof Error ? error.message : "物料需求生成失败，请稍后重试。");
    } finally {
      setRequirementsLoading(false);
    }
  };
  useEffect(() => {
    if (["draft", "pending"].includes(order.status)) {
      setDemand(undefined);
      setDemandError("");
      return;
    }
    let active = true;
    setDemandLoading(true);
    setDemandError("");
    void noraApi
      .productionDemand(order.id)
      .then((result) => {
        if (active) setDemand(result);
      })
      .catch((error) => {
        if (active) {
          setDemandError(error instanceof Error ? error.message : "生产需求加载失败，请稍后重试。");
        }
      })
      .finally(() => {
        if (active) setDemandLoading(false);
      });
    return () => {
      active = false;
    };
  }, [order.id, order.status]);
  const progress =
    order.status === "completed" || order.status === "reconciled"
      ? 100
      : order.status === "delivering"
        ? 85
        : order.status === "in_production"
          ? 58
          : order.status === "approved"
            ? 25
            : order.status === "pending"
              ? 12
              : 5;
  const steps = fulfillmentSteps(order.status);
  const isFulfilled = progress === 100;
  const preApprovalTrial = ["draft", "pending"].includes(order.status)
    ? explodeDraftOrder(order, boms)
    : undefined;

  return (
    <>
      <DetailHeader
        title={order.code}
        navigation={
          <Link
            href="/orders"
            className="focus-ring -ml-2 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--interactive)]"
          >
            <ArrowLeft size={14} />
            返回订单中心
          </Link>
        }
        status={
          <Badge tone={statusTone[order.status]}>
            {orderStatusLabel[order.status]}
          </Badge>
        }
        metadata={
          <>
            <span className="font-medium text-[var(--text-secondary)]">
              {order.customerName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{orderSourceLabel[order.source]}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{order.createdAt} 创建</span>
          </>
        }
        actions={
          <>
            {can("orders:write") && order.status === "draft" && (
              <>
                <ButtonLink href={`/orders/${order.id}/edit`} variant="secondary">
                  <FilePenLine size={16} />
                  编辑订单
                </ButtonLink>
                <Button onClick={() => submit(order.id)}>
                  <Send size={16} />
                  直接提交审核
                </Button>
              </>
            )}
            {can("orders:approve") && order.status === "pending" && (
              <ButtonLink href={`/orders/${order.id}/review`}>
                <ClipboardCheck size={16} />
                审核订单
              </ButtonLink>
            )}
            {mode === "demo" && order.status === "completed" && (
              <Button onClick={() => reconcile(order.id)}>
                <CircleDollarSign size={16} />
                确认对账
              </Button>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={16} />
              打印
            </Button>
          </>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <SectionTitle
              title="订单商品"
              description={`共 ${order.lines.length} 项商品`}
            />

            <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
              {order.lines.map((line) => (
                <div key={line.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-[var(--text-primary)]">
                        {line.productName}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                        {line.productCode ?? line.productId}
                      </p>
                    </div>
                    <strong className="tabular-nums text-[var(--text-primary)]">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </strong>
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 py-2.5 text-xs">
                    <span className="text-[var(--text-tertiary)]">
                      {formatNumber(line.quantity)} {line.unit}
                    </span>
                    <span className="tabular-nums text-[var(--text-secondary)]">
                      单价 {formatCurrency(line.unitPrice)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[var(--surface-subtle)] text-[11px] text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-3">商品</th>
                    <th className="px-5 py-3">数量</th>
                    <th className="px-5 py-3">单价</th>
                    <th className="px-5 py-3 text-right">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((line) => (
                    <tr
                      key={line.id}
                      className="border-t border-[var(--stroke-subtle)]"
                    >
                      <td className="px-5 py-4">
                        <b>{line.productName}</b>
                        <p className="text-[11px] text-[var(--text-tertiary)]">
                          {line.productCode ?? line.productId}
                        </p>
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {formatNumber(line.quantity)} {line.unit}
                      </td>
                      <td className="px-5 py-4 tabular-nums">
                        {formatCurrency(line.unitPrice)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold tabular-nums">
                        {formatCurrency(line.quantity * line.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] p-4 sm:p-5">
              <div className="w-full space-y-2 text-sm sm:w-64">
                <p className="flex justify-between text-[var(--text-tertiary)]">
                  <span>商品金额</span>
                  <span className="tabular-nums">
                    {formatCurrency(totalOf(order))}
                  </span>
                </p>
                <p className="flex justify-between border-t border-[var(--stroke)] pt-3 text-base font-semibold">
                  <span>订单合计</span>
                  <span className="tabular-nums">
                    {formatCurrency(totalOf(order))}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          <Card id="production-requirements" className="scroll-mt-24 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">生产需求</h2>
              <div className="flex flex-wrap items-center gap-2">
                {demand && (
                  <Button variant="secondary" disabled={requirementsLoading} onClick={() => void loadRequirements()}>
                    <Boxes size={16} />
                    {requirementsLoading ? "正在展开" : requirements ? "刷新物料需求" : "查看物料需求"}
                  </Button>
                )}
                <ButtonLink href="/catalog/boms" variant="secondary">
                  <Layers3 size={16} />
                  维护生产配方
                </ButtonLink>
              </div>
            </div>
            {order.status === "draft" ? (
              <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  草稿尚未提交
                </p>
              </div>
            ) : order.status === "pending" ? (
              <div className="mt-4 rounded-xl bg-[var(--status-warning-soft)] p-4">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-[var(--status-warning)]">
                    审核通过后自动生成需求
                  </p>
                  <HelpTip
                    title="审核后的生产需求"
                    href="/help/order-and-demand/production-demand"
                  >
                    审核通过后创建独立生产需求。后续由生产计划决定聚合或拆分，不会直接生成工单。
                  </HelpTip>
                </div>
              </div>
            ) : demandLoading ? (
              <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-[var(--text-tertiary)]">
                正在加载生产需求…
              </div>
            ) : demand ? (
              <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs text-[var(--text-tertiary)]">需求单</p>
                  <b className="mt-1 block font-mono">{demand.code}</b>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs text-[var(--text-tertiary)]">计划状态</p>
                  <b className="mt-1 block">待计划</b>
                </div>
                <div className={`rounded-xl p-4 ${demand.missingBomCount ? "bg-[var(--status-warning-soft)]" : "bg-[var(--status-success-soft)]"}`}>
                  <p className={`text-xs ${demand.missingBomCount ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}`}>
                    BOM 就绪
                  </p>
                  <b className={`mt-1 block ${demand.missingBomCount ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}`}>
                    {demand.missingBomCount ? `${demand.missingBomCount} 项待补齐` : `${demand.readyLineCount} 项已匹配`}
                  </b>
                </div>
              </div>
              <div className="mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--stroke)]">
                {demand.lines.map((line) => (
                  <div key={line.id} className="grid gap-2 border-t border-[var(--stroke-subtle)] px-4 py-3 first:border-t-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                    <span>
                      <b className="block text-sm">{line.productName}</b>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)]">{line.productCode}</span>
                    </span>
                    <span className="text-sm tabular-nums">{formatNumber(line.requiredQuantity)} {line.unit}</span>
                    <Badge tone={line.bomReady ? "success" : "warning"}>
                      {line.bomReady ? `${line.selectedBomVersion} 可用` : "缺少有效 BOM"}
                    </Badge>
                  </div>
                ))}
              </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl bg-[var(--status-warning-soft)] p-4">
                <p className="text-sm font-medium text-[var(--status-warning)]">生产需求尚未建立</p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  {demandError || "请刷新页面后重试。"}
                </p>
              </div>
            )}
            {requirementsError && <p className="mt-3 text-sm text-[var(--status-danger)]" role="alert">{requirementsError}</p>}
            {preApprovalTrial && (
              <OrderMaterialTrial
                items={preApprovalTrial.items}
                missing={preApprovalTrial.missing}
                lineCount={order.lines.length}
              />
            )}
            {requirements && (
              <div className="mt-4 overflow-hidden rounded-[var(--radius-control)] border border-[var(--stroke)]">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-[var(--surface-subtle)] px-4 py-2.5 text-[11px] font-semibold text-[var(--text-tertiary)]">
                  <span>底层物料</span><span>毛料需求</span><span>预计成本</span>
                </div>
                {requirements.items.map((item) => (
                  <div key={item.productId} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-[var(--stroke-subtle)] px-4 py-3 text-sm">
                    <span><b className="block">{item.productName}</b><span className="text-[11px] text-[var(--text-tertiary)]">{item.productCode}</span></span>
                    <span className="tabular-nums">{formatNumber(item.grossQuantity)} {item.unit}</span>
                    <span className="min-w-20 text-right font-medium tabular-nums">{formatCurrency(item.estimatedCost)}</span>
                  </div>
                ))}
                <div className="flex justify-end border-t border-[var(--stroke)] bg-[var(--surface-subtle)] px-4 py-3 text-sm">
                  <span className="text-[var(--text-tertiary)]">预计材料成本</span>
                  <b className="ml-4 tabular-nums">{formatCurrency(requirements.totalEstimatedCost)}</b>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">客户与配送</h2>
            <div className="mt-4 rounded-[var(--radius-control)] bg-[var(--interactive-soft)] p-3">
              <span className="block text-xs text-[var(--text-tertiary)]">
                要求送达
              </span>
              <strong className="mt-1 block tabular-nums text-[var(--text-primary)]">
                {order.deliveryAt}
              </strong>
            </div>
            <div className="mt-4 space-y-4 text-sm">
              <p>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  联系人
                </span>
                {order.contact} · {order.phone}
              </p>
              <p>
                <span className="block text-xs text-[var(--text-tertiary)]">
                  配送地址
                </span>
                {order.address}
              </p>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">履约进度</h2>
                <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                  {orderStatusLabel[order.status]}
                </p>
              </div>
              <strong
                className={`text-sm tabular-nums ${isFulfilled ? "text-[var(--status-success)]" : "text-[var(--interactive)]"}`}
              >
                {progress}%
              </strong>
            </div>
            <Progress
              value={progress}
              className="mt-4 h-2"
              tone={isFulfilled ? "success" : "info"}
            />
            <div className="mt-4 space-y-1">
              {steps.map((step) => (
                <div
                  key={step.label}
                  className={`flex min-h-10 items-center gap-3 rounded-[var(--radius-control)] px-2.5 ${step.state === "current" ? "bg-[var(--interactive-soft)]" : ""}`}
                >
                  {step.state === "completed" ? (
                    <CheckCircle2
                      size={17}
                      className="text-[var(--status-success)]"
                    />
                  ) : step.state === "current" ? (
                    <span className="flex h-[17px] w-[17px] items-center justify-center rounded-full border border-[var(--interactive)]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--interactive)]" />
                    </span>
                  ) : (
                    <Circle size={17} className="text-[var(--stroke)]" />
                  )}
                  <span
                    className={`text-sm ${step.state === "completed" ? "text-[var(--text-secondary)]" : step.state === "current" ? "font-medium text-[var(--interactive)]" : "text-[var(--text-tertiary)]"}`}
                  >
                    {step.label}
                  </span>
                  {step.state === "current" && (
                    <span className="ml-auto text-[11px] font-medium text-[var(--interactive)]">
                      进行中
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
          <DocumentSection title="操作记录">
            <DocumentEventTimeline
              events={
                order.events?.length
                  ? [...order.events].reverse()
                  : [
                      {
                        id: `${order.id}-created`,
                        type: "created",
                        label: "创建订单",
                        actor: order.source,
                        at: order.createdAt,
                      },
                    ]
              }
            />
          </DocumentSection>
        </div>
      </div>

    </>
  );
}

function OrderMaterialTrial({
  items,
  missing,
  lineCount,
}: {
  items: ExplodedMaterial[];
  missing: string[];
  lineCount: number;
}) {
  const totalCost = items.reduce((sum, item) => sum + item.estimatedCost, 0);
  return (
    <section className="mt-4 overflow-hidden rounded-[var(--radius-control)] border border-[var(--stroke)]" aria-label="审核前订单物料试算">
      <div className="flex flex-wrap items-start justify-between gap-3 bg-[var(--surface-subtle)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">审核前整单试算</h3>
          <Badge tone="warning">按当前配方</Badge>
          <HelpTip title="试算说明">
            合并本订单 {lineCount} 个商品的末级物料，仅用于审核前检查；审核通过后将改用冻结快照。
          </HelpTip>
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-[var(--text-tertiary)]">预计材料成本</span>
          <b className="mt-1 block text-base tabular-nums text-[var(--interactive)]">{formatCurrency(totalCost)}</b>
        </div>
      </div>
      {missing.length > 0 && (
        <div className="flex gap-2 border-t border-[var(--stroke-subtle)] bg-[var(--status-warning-soft)] px-4 py-3 text-xs leading-5 text-[var(--status-warning)]" role="status">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>缺少有效配方：{missing.join("、")}。当前结果不完整。</span>
        </div>
      )}
      {items.length ? (
        <>
          <div className="divide-y divide-[var(--stroke-subtle)] md:hidden">
            {items.map((item) => (
              <article key={`${item.productId}-${item.unit}`} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <span><b className="block text-sm">{item.name}</b><span className="font-mono text-[10px] text-[var(--text-tertiary)]">{item.code}</span></span>
                  <b className="text-sm tabular-nums text-[var(--interactive)]">{formatCurrency(item.estimatedCost)}</b>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{item.sources.join("；")}</p>
                <div className="mt-3 flex justify-between border-t border-[var(--stroke-subtle)] pt-3 text-xs"><span className="text-[var(--text-tertiary)]">毛料需求</span><b className="tabular-nums">{formatNumber(item.grossQuantity)} {item.unit}</b></div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left">
              <thead className="text-[11px] font-semibold text-[var(--text-tertiary)]">
                <tr><th className="px-4 py-2.5">末级物料</th><th className="px-4 py-2.5">订单来源路径</th><th className="px-4 py-2.5 text-right">毛料需求</th><th className="px-4 py-2.5 text-right">预计成本</th></tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.productId}-${item.unit}`} className="border-t border-[var(--stroke-subtle)]">
                    <td className="px-4 py-3"><b className="block text-sm">{item.name}</b><span className="font-mono text-[10px] text-[var(--text-tertiary)]">{item.code}</span></td>
                    <td className="max-w-[300px] px-4 py-3 text-xs leading-5 text-[var(--text-secondary)]">{item.sources.join("；")}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">{formatNumber(item.grossQuantity)} {item.unit}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-[var(--interactive)]">{formatCurrency(item.estimatedCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="border-t border-[var(--stroke-subtle)] px-4 py-8 text-center text-xs text-[var(--text-tertiary)]">当前订单没有可试算的物料。</div>
      )}
    </section>
  );
}
