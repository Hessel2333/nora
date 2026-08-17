"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, ChevronRight, ClipboardCheck } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import type { SalesOrder } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";
import { OrderApprovalDialog } from "@/features/orders/order-approval-dialog";

const totalOf = (order: SalesOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

export function OrderApprovalsPage() {
  const rows = useNoraStore(
    useShallow((state) =>
      state.orders.filter((order) => order.status === "pending"),
    ),
  );
  const [reviewingId, setReviewingId] = useState<string>();
  const reviewingOrder = rows.find((order) => order.id === reviewingId);

  return (
    <>
      <PageHeader
        title="订单审核"
        metadata={
          rows.length > 0
            ? `${rows.length} 笔订单等待审核，审核通过后生成生产需求。`
            : "当前没有等待审核的订单。"
        }
      />

      {rows.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_150px_130px_112px] gap-4 border-b border-[var(--stroke-subtle)] bg-[var(--surface-subtle)] px-5 py-3 text-[11px] font-medium text-[var(--text-tertiary)] md:grid">
            <span>订单与客户</span>
            <span>商品明细</span>
            <span>要求送达</span>
            <span className="text-right">金额</span>
            <span className="sr-only">操作</span>
          </div>
          <div className="divide-y divide-[var(--stroke-subtle)]">
            {rows.map((order) => (
              <article
                key={order.id}
                className="grid gap-4 p-4 transition hover:bg-[var(--surface-subtle)] sm:p-5 md:grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_150px_130px_112px] md:items-center"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--status-warning-soft)] text-[var(--status-warning)]">
                    <ClipboardCheck size={17} />
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="focus-ring rounded font-mono text-xs font-semibold text-[var(--interactive)] hover:underline"
                    >
                      {order.code}
                    </Link>
                    <p className="mt-1 truncate font-medium text-[var(--text-primary)]">
                      {order.customerName}
                    </p>
                    <Badge className="mt-2 md:hidden" tone="warning">
                      待审核
                    </Badge>
                  </div>
                </div>

                <div className="min-w-0 text-sm text-[var(--text-secondary)]">
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:hidden">
                    商品明细
                  </span>
                  <p className="truncate">
                    {order.lines.map((line) => line.productName).join("、")}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
                    共 {order.lines.length} 项
                  </p>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:hidden">
                    要求送达
                  </span>
                  <p className="text-sm tabular-nums text-[var(--text-secondary)]">
                    {order.deliveryAt}
                  </p>
                </div>

                <div className="md:text-right">
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:hidden">
                    订单金额
                  </span>
                  <strong className="tabular-nums text-[var(--text-primary)]">
                    {formatCurrency(totalOf(order))}
                  </strong>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setReviewingId(order.id)}
                >
                  审核
                  <ChevronRight size={14} />
                </Button>
              </article>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--status-success-soft)] text-[var(--status-success)]">
            <CheckCircle2 size={24} />
          </span>
          <h2 className="mt-4 font-semibold text-[var(--text-primary)]">
            待审核订单已清空
          </h2>
          <p className="mt-1 text-sm text-[var(--text-tertiary)]">
            新提交的销售订单会自动出现在这里。
          </p>
        </Card>
      )}

      <OrderApprovalDialog
        order={reviewingOrder}
        open={Boolean(reviewingOrder)}
        onOpenChange={(open) => {
          if (!open) setReviewingId(undefined);
        }}
      />
    </>
  );
}
