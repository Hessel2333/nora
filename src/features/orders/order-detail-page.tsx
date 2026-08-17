"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  CircleDollarSign,
  ClipboardCheck,
  FilePenLine,
  Printer,
  Send,
} from "lucide-react";
import {
  DocumentEventTimeline,
  DocumentSection,
} from "@/components/document-ui";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DetailHeader,
  Progress,
  SectionTitle,
} from "@/components/ui";
import { OrderApprovalDialog } from "@/features/orders/order-approval-dialog";
import { useNoraStore } from "@/lib/store";
import type { SalesOrder } from "@/lib/types";
import {
  formatCurrency,
  formatNumber,
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
      label: "生产执行",
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
  const submit = useNoraStore((state) => state.submitOrder);
  const reconcile = useNoraStore((state) => state.reconcileOrder);
  const [reviewOpen, setReviewOpen] = useState(false);
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
            <span>{order.source}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{order.createdAt} 创建</span>
          </>
        }
        actions={
          <>
            {order.status === "draft" && (
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
            {order.status === "pending" && (
              <Button onClick={() => setReviewOpen(true)}>
                <ClipboardCheck size={16} />
                审核订单
              </Button>
            )}
            {order.status === "completed" && (
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
                        {line.productId}
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
                          {line.productId}
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

          <Card className="p-5">
            <h2 className="font-semibold">生产需求</h2>
            {order.status === "draft" ? (
              <div className="mt-4 rounded-xl bg-[var(--surface-muted)] p-4">
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  草稿尚未提交
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">
                  提交审核并通过后，系统才会生成生产需求。
                </p>
              </div>
            ) : order.status === "pending" ? (
              <div className="mt-4 rounded-xl bg-[var(--status-warning-soft)] p-4">
                <p className="text-sm font-medium text-[var(--status-warning)]">
                  审核通过后自动生成需求
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                  系统将按工厂、交期与商品聚合，并保留客户分配明细。
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs text-[var(--text-tertiary)]">需求单</p>
                  <b className="mt-1 block">SC20260714-018</b>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                  <p className="text-xs text-[var(--text-tertiary)]">
                    需求数量
                  </p>
                  <b className="mt-1 block tabular-nums">
                    {formatNumber(
                      order.lines.reduce((sum, line) => sum + line.quantity, 0),
                    )}{" "}
                    份
                  </b>
                </div>
                <div className="rounded-xl bg-[var(--status-success-soft)] p-4">
                  <p className="text-xs text-[var(--status-success)]">
                    BOM 展开
                  </p>
                  <b className="mt-1 block text-[var(--status-success)]">
                    已完成
                  </b>
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

      <OrderApprovalDialog
        order={order}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
      />
    </>
  );
}
