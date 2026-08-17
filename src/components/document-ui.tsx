"use client";

import { CheckCircle2, FilePenLine, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button, Card, SectionTitle, inputClass } from "@/components/ui";
import type { DocumentEvent } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function DocumentFormLayout({
  main,
  aside,
}: {
  main: ReactNode;
  aside: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">{main}</div>
      <aside className="min-w-0 space-y-4">{aside}</aside>
    </div>
  );
}

export function DocumentSection({
  title,
  description,
  action,
  children,
  bodyClassName,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionTitle title={title} description={description} action={action} />
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function DocumentActionBar({
  hint,
  children,
}: {
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--stroke)] bg-white/92 p-3 shadow-[0_10px_30px_rgba(16,24,40,.10)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between lg:sticky lg:bottom-3 lg:z-20">
      <div className="min-w-0 text-xs leading-5 text-[var(--text-tertiary)]">
        {hint}
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">{children}</div>
    </div>
  );
}

export function DocumentSummary({
  subtotal,
  total = subtotal,
  lineCount,
  className,
}: {
  subtotal: number;
  total?: number;
  lineCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      {typeof lineCount === "number" && (
        <div className="flex justify-between text-[var(--text-tertiary)]">
          <span>明细项</span>
          <span className="tabular-nums">{lineCount} 项</span>
        </div>
      )}
      <div className="flex justify-between text-[var(--text-tertiary)]">
        <span>商品金额</span>
        <span className="tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
      <div className="flex items-end justify-between border-t border-[var(--stroke-subtle)] pt-3">
        <span className="font-semibold text-[var(--text-primary)]">单据合计</span>
        <strong className="text-xl tracking-[-0.03em] tabular-nums text-[var(--text-primary)]">
          {formatCurrency(total)}
        </strong>
      </div>
    </div>
  );
}

export interface DocumentCatalogItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
}

export interface EditableDocumentLine {
  id: string;
  itemId: string;
  quantity: number;
}

export function DocumentLineEditor({
  items,
  lines,
  onChange,
  errors = {},
  itemLabel = "商品",
}: {
  items: DocumentCatalogItem[];
  lines: EditableDocumentLine[];
  onChange: (lines: EditableDocumentLine[]) => void;
  errors?: Record<string, string>;
  itemLabel?: string;
}) {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const updateLine = (id: string, patch: Partial<EditableDocumentLine>) =>
    onChange(lines.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  const addLine = () =>
    onChange([
      ...lines,
      { id: `line-${Date.now()}-${lines.length}`, itemId: "", quantity: 1 },
    ]);
  const removeLine = (id: string) =>
    onChange(lines.filter((line) => line.id !== id));

  return (
    <div>
      <div className="hidden grid-cols-[minmax(220px,1fr)_140px_90px_130px_130px_40px] gap-3 px-3 pb-2 text-[11px] font-medium text-[var(--text-tertiary)] md:grid">
        <span>{itemLabel}</span>
        <span>数量</span>
        <span>单位</span>
        <span>单价</span>
        <span className="text-right">金额</span>
        <span className="sr-only">操作</span>
      </div>

      <div className="divide-y divide-[var(--stroke-subtle)] rounded-[var(--radius-control)] border border-[var(--stroke-subtle)]">
        {lines.map((line, index) => {
          const item = itemMap.get(line.itemId);
          const lineTotal = item ? line.quantity * item.unitPrice : 0;
          const error = errors[line.id];
          return (
            <div key={line.id} className="p-3">
              <div className="grid items-end gap-3 md:grid-cols-[minmax(220px,1fr)_140px_90px_130px_130px_40px]">
                <label className="min-w-0">
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:sr-only">
                    {itemLabel}
                  </span>
                  <select
                    aria-label={`${itemLabel} ${index + 1}`}
                    aria-invalid={Boolean(error && !line.itemId)}
                    className={inputClass}
                    value={line.itemId}
                    onChange={(event) =>
                      updateLine(line.id, { itemId: event.target.value })
                    }
                  >
                    <option value="">选择{itemLabel}</option>
                    {items.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} · {option.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:sr-only">
                    数量
                  </span>
                  <input
                    aria-label={`数量 ${index + 1}`}
                    aria-invalid={Boolean(error && line.quantity <= 0)}
                    className={inputClass}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.id, {
                        quantity: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <div>
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:sr-only">
                    单位
                  </span>
                  <div className="flex h-11 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-secondary)] sm:h-10">
                    {item?.unit ?? "—"}
                  </div>
                </div>

                <div>
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:sr-only">
                    单价
                  </span>
                  <div className="flex h-11 items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-3 text-sm tabular-nums text-[var(--text-secondary)] sm:h-10">
                    {item ? formatCurrency(item.unitPrice) : "—"}
                  </div>
                </div>

                <div className="md:text-right">
                  <span className="mb-1 block text-[11px] text-[var(--text-tertiary)] md:sr-only">
                    金额
                  </span>
                  <div className="flex h-10 items-center font-semibold tabular-nums text-[var(--text-primary)] md:justify-end">
                    {formatCurrency(lineTotal)}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`删除第 ${index + 1} 项`}
                  className="w-10 px-0 text-[var(--text-tertiary)] hover:text-[var(--status-danger)]"
                  disabled={lines.length === 1}
                  onClick={() => removeLine(line.id)}
                >
                  <Trash2 size={15} />
                </Button>
              </div>
              {error && (
                <p className="mt-2 text-xs text-[var(--status-danger)]" role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addLine}>
        <Plus size={15} />
        添加明细
      </Button>
    </div>
  );
}

export function DocumentEventTimeline({ events }: { events: DocumentEvent[] }) {
  const iconFor = (type: DocumentEvent["type"]) => {
    if (type === "approved") return CheckCircle2;
    if (type === "returned") return RotateCcw;
    return FilePenLine;
  };

  return (
    <ol className="space-y-4">
      {events.map((event, index) => {
        const Icon = iconFor(event.type);
        return (
          <li key={event.id} className="relative flex gap-3">
            {index < events.length - 1 && (
              <span className="absolute bottom-[-16px] left-[15px] top-8 w-px bg-[var(--stroke-subtle)]" />
            )}
            <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)]">
              <Icon size={14} />
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {event.label}
                </p>
                <span className="text-[11px] tabular-nums text-[var(--text-tertiary)]">
                  {event.at}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                {event.actor}
                {event.comment ? ` · ${event.comment}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
