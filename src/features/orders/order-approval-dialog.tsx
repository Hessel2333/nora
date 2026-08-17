"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { DocumentSummary } from "@/components/document-ui";
import { Button, Field, Modal, inputClass } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import type { SalesOrder } from "@/lib/types";

const totalOf = (order: SalesOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

export function OrderApprovalDialog({
  order,
  open,
  onOpenChange,
}: {
  order?: SalesOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const approve = useNoraStore((state) => state.approveOrder);
  const returnOrder = useNoraStore((state) => state.returnOrder);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  if (!order) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setComment("");
      setError("");
    }
    onOpenChange(nextOpen);
  };
  const close = () => handleOpenChange(false);
  const handleApprove = () => {
    approve(order.id, comment.trim() || undefined);
    close();
  };
  const handleReturn = () => {
    if (!comment.trim()) {
      setError("退回订单时请填写需要修改的内容。");
      return;
    }
    returnOrder(order.id, comment.trim());
    close();
  };

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="审核销售订单"
      description="确认客户、交期与商品明细。审核通过后将生成生产需求。"
      footer={
        <>
          <Button variant="secondary" onClick={handleReturn}>
            <RotateCcw size={15} />
            退回修改
          </Button>
          <Button onClick={handleApprove}>
            <CheckCircle2 size={15} />
            通过并生成需求
          </Button>
        </>
      }
    >
      <div className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold text-[var(--interactive)]">
              {order.code}
            </p>
            <p className="mt-1 font-semibold text-[var(--text-primary)]">
              {order.customerName}
            </p>
          </div>
          <div className="text-right text-xs text-[var(--text-tertiary)]">
            <span className="block">要求送达</span>
            <strong className="mt-0.5 block tabular-nums text-[var(--text-secondary)]">
              {order.deliveryAt}
            </strong>
          </div>
        </div>
        <DocumentSummary
          subtotal={totalOf(order)}
          lineCount={order.lines.length}
          className="mt-4 border-t border-[var(--stroke)] pt-4"
        />
      </div>

      <div className="mt-4">
        <Field label="审核意见" hint="审核通过时可选；退回修改时必填。">
          <textarea
            aria-invalid={Boolean(error)}
            className={`${inputClass} min-h-24 resize-y py-2.5`}
            placeholder="补充交期、数量或配送要求的审核意见"
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              if (error) setError("");
            }}
          />
        </Field>
        {error && (
          <p className="mt-2 text-xs text-[var(--status-danger)]" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
