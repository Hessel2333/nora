"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FilePenLine, Send } from "lucide-react";
import {
  DocumentActionBar,
  DocumentFormLayout,
  DocumentLineEditor,
  DocumentSection,
  DocumentSummary,
  type EditableDocumentLine,
} from "@/components/document-ui";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  DetailHeader,
  Field,
  inputClass,
} from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import type { OrderStatus, SalesOrder } from "@/lib/types";
import { orderStatusLabel, statusTone } from "@/lib/utils";
import { useShallow } from "zustand/react/shallow";

type OrderSource = SalesOrder["source"];

interface OrderDraft {
  customerId: string;
  deliveryAt: string;
  source: OrderSource;
  notes: string;
  lines: EditableDocumentLine[];
}

interface FormErrors {
  customerId?: string;
  deliveryAt?: string;
  lines: Record<string, string>;
}

const emptyErrors = (): FormErrors => ({ lines: {} });

const pad = (value: number) => String(value).padStart(2, "0");
const inputDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
const displayDateTime = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

const defaultDelivery = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(11, 30, 0, 0);
  return inputDateTime(date);
};

export function NewOrderPage({ orderId }: { orderId?: string }) {
  const customers = useNoraStore((state) => state.customers);
  const products = useNoraStore(
    useShallow((state) =>
      state.products.filter((product) => product.type === "finished"),
    ),
  );
  const existingOrder = useNoraStore((state) =>
    orderId ? state.orders.find((order) => order.id === orderId) : undefined,
  );
  const addOrder = useNoraStore((state) => state.addOrder);
  const updateOrder = useNoraStore((state) => state.updateOrder);
  const [draft, setDraft] = useState<OrderDraft>(() =>
    existingOrder
      ? {
          customerId: existingOrder.customerId,
          deliveryAt: existingOrder.deliveryAt.replace(" ", "T"),
          source: existingOrder.source,
          notes: existingOrder.notes ?? "",
          lines: existingOrder.lines.map((line) => ({
            id: line.id,
            itemId: line.productId,
            quantity: line.quantity,
          })),
        }
      : {
          customerId: customers[0]?.id ?? "",
          deliveryAt: defaultDelivery(),
          source: "手工录入",
          notes: "",
          lines: [
            {
              id: "line-1",
              itemId: products[0]?.id ?? "",
              quantity: 800,
            },
          ],
        },
  );
  const [errors, setErrors] = useState<FormErrors>(emptyErrors);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOrder, setSavedOrder] = useState<
    { id: string; code: string; status: OrderStatus } | undefined
  >();

  const catalogItems = useMemo(
    () =>
      products.map((product) => ({
        id: product.id,
        code: product.code,
        name: product.name,
        unit: product.unit,
        unitPrice: product.price,
      })),
    [products],
  );

  useEffect(() => {
    if (existingOrder) {
      setDraft({
        customerId: existingOrder.customerId,
        deliveryAt: existingOrder.deliveryAt.replace(" ", "T"),
        source: existingOrder.source,
        notes: existingOrder.notes ?? "",
        lines: existingOrder.lines.map((line) => ({ id: line.id, itemId: line.productId, quantity: line.quantity })),
      });
      return;
    }
    if (!orderId && customers.length > 0 && products.length > 0) {
      setDraft((current) => ({
        ...current,
        customerId: customers.some((customer) => customer.id === current.customerId) ? current.customerId : customers[0].id,
        lines: current.lines.map((line, index) => ({
          ...line,
          itemId: products.some((product) => product.id === line.itemId) ? line.itemId : products[Math.min(index, products.length - 1)].id,
        })),
      }));
    }
  }, [customers, existingOrder, orderId, products]);
  const itemMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const subtotal = draft.lines.reduce((sum, line) => {
    const product = itemMap.get(line.itemId);
    return sum + (product ? product.price * line.quantity : 0);
  }, 0);

  const validate = () => {
    const next = emptyErrors();
    if (!draft.customerId) next.customerId = "请选择客户。";
    if (!draft.deliveryAt) next.deliveryAt = "请选择要求送达时间。";

    const selectedProducts = new Set<string>();
    draft.lines.forEach((line) => {
      if (!line.itemId) {
        next.lines[line.id] = "请选择商品。";
      } else if (selectedProducts.has(line.itemId)) {
        next.lines[line.id] = "同一商品不需要重复添加，请合并数量。";
      } else if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        next.lines[line.id] = "数量必须大于 0。";
      }
      if (line.itemId) selectedProducts.add(line.itemId);
    });
    setErrors(next);
    return !next.customerId && !next.deliveryAt && Object.keys(next.lines).length === 0;
  };

  const save = async (status: "draft" | "pending") => {
    if (!validate()) return;
    const customer = customers.find((item) => item.id === draft.customerId);
    if (!customer) return;

    const now = new Date();
    const timestamp = now.getTime();
    const code =
      existingOrder?.code ??
      `SO${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${String(timestamp).slice(-4)}`;
    const createdAt = existingOrder?.createdAt ?? displayDateTime(now);
    const changedAt = displayDateTime(now);
    const order: SalesOrder = {
      id: existingOrder?.id ?? `o-${timestamp}`,
      code,
      customerId: customer.id,
      customerName: customer.name,
      deliveryAt: draft.deliveryAt.replace("T", " "),
      status,
      source: draft.source,
      createdAt,
      contact: customer.contact,
      phone: customer.phone,
      address: customer.address,
      notes: draft.notes.trim() || undefined,
      revision: existingOrder?.revision,
      lines: draft.lines.map((line, index) => {
        const product = itemMap.get(line.itemId)!;
        return {
          id: `ol-${timestamp}-${index + 1}`,
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          unit: product.unit,
          unitPrice: product.price,
        };
      }),
      events: existingOrder
        ? [
            ...(existingOrder.events ?? []),
            {
              id: `event-${timestamp}-updated`,
              type: status === "pending" ? "submitted" : "status_changed",
              label: status === "pending" ? "修改并重新提交" : "更新草稿",
              actor: "演示用户",
              at: changedAt,
            },
          ]
        : [
            {
              id: `event-${timestamp}-created`,
              type: "created",
              label: "创建订单",
              actor: "演示用户",
              at: createdAt,
            },
            ...(status === "pending"
              ? [
                  {
                    id: `event-${timestamp}-submitted`,
                    type: "submitted" as const,
                    label: "提交审核",
                    actor: "演示用户",
                    at: createdAt,
                  },
                ]
              : []),
          ],
    };

    setSaving(true);
    setSaveError("");
    try {
      const persisted = existingOrder ? await updateOrder(order) : await addOrder(order);
      setSavedOrder({ id: persisted.id, code: persisted.code, status: persisted.status });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "订单保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };

  if (savedOrder) {
    const submitted = savedOrder.status === "pending";
    return (
      <Card className="mx-auto max-w-xl p-7 text-center sm:p-10">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--status-success-soft)] text-[var(--status-success)]">
          {submitted ? <CheckCircle2 size={25} /> : <FilePenLine size={24} />}
        </span>
        <Badge className="mt-4" tone={statusTone[savedOrder.status]}>
          {orderStatusLabel[savedOrder.status]}
        </Badge>
        <h1 className="mt-3 text-xl font-semibold tracking-[-0.03em]">
          {submitted
            ? existingOrder
              ? "订单已修改并重新提交"
              : "订单已提交审核"
            : existingOrder
              ? "订单修改已保存"
              : "订单草稿已保存"}
        </h1>
        <p className="mt-2 font-mono text-sm text-[var(--text-tertiary)]">
          {savedOrder.code}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/orders" variant="secondary">
            返回订单中心
          </ButtonLink>
          <ButtonLink href={`/orders/${savedOrder.id}`}>查看订单</ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save("pending");
      }}
      noValidate
    >
      <DetailHeader
        title={existingOrder ? "编辑销售订单" : "新建销售订单"}
        navigation={
          <Link
            href={existingOrder ? `/orders/${existingOrder.id}` : "/orders"}
            className="focus-ring -ml-2 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--interactive)]"
          >
            <ArrowLeft size={14} />
            {existingOrder ? "返回订单详情" : "返回订单中心"}
          </Link>
        }
        status={<Badge>{existingOrder ? existingOrder.code : "草稿录入"}</Badge>}
        metadata={
          existingOrder
            ? "修改退回项后可保存草稿或重新提交审核。"
            : "客户、交期与商品明细将同步用于审核和生产需求。"
        }
      />

      <DocumentFormLayout
        main={
          <>
            <DocumentSection title="基本信息" description="确认订单客户、交付时间与来源">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Field label="客户" required>
                    <select
                      required
                      aria-invalid={Boolean(errors.customerId)}
                      className={inputClass}
                      value={draft.customerId}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          customerId: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, customerId: undefined }));
                      }}
                    >
                      <option value="">选择客户</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} · {customer.code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {errors.customerId && (
                    <p className="mt-1.5 text-xs text-[var(--status-danger)]" role="alert">
                      {errors.customerId}
                    </p>
                  )}
                </div>
                <div>
                  <Field label="要求送达" required>
                    <input
                      required
                      aria-invalid={Boolean(errors.deliveryAt)}
                      className={inputClass}
                      type="datetime-local"
                      value={draft.deliveryAt}
                      onChange={(event) => {
                        setDraft((current) => ({
                          ...current,
                          deliveryAt: event.target.value,
                        }));
                        setErrors((current) => ({ ...current, deliveryAt: undefined }));
                      }}
                    />
                  </Field>
                  {errors.deliveryAt && (
                    <p className="mt-1.5 text-xs text-[var(--status-danger)]" role="alert">
                      {errors.deliveryAt}
                    </p>
                  )}
                </div>
                <Field label="订单来源">
                  <select
                    className={inputClass}
                    value={draft.source}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        source: event.target.value as OrderSource,
                      }))
                    }
                  >
                    <option>手工录入</option>
                    <option>客户下单</option>
                    <option value="AI预测">销量预测</option>
                    <option>Excel导入</option>
                  </select>
                </Field>
                <Field label="备注" hint="配送、包装或客户特殊要求。">
                  <textarea
                    className={`${inputClass} min-h-20 resize-y py-2.5`}
                    placeholder="填写需要传递给审核和生产人员的信息"
                    value={draft.notes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </Field>
              </div>
            </DocumentSection>

            <DocumentSection
              title="商品明细"
              description="支持多商品录入，价格来自商品档案"
            >
              <DocumentLineEditor
                items={catalogItems}
                lines={draft.lines}
                errors={errors.lines}
                onChange={(lines) => {
                  setDraft((current) => ({ ...current, lines }));
                  setErrors((current) => ({ ...current, lines: {} }));
                }}
              />
            </DocumentSection>
          </>
        }
        aside={
          <>
            <DocumentSection title="订单汇总">
              <DocumentSummary
                subtotal={subtotal}
                lineCount={draft.lines.length}
              />
            </DocumentSection>
            <DocumentSection title="提交后流程">
              <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
                {["进入订单审核", "生成生产需求", "关联生产与配送进度"].map(
                  (label, index) => (
                    <li key={label} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[11px] font-semibold text-[var(--text-tertiary)]">
                        {index + 1}
                      </span>
                      {label}
                    </li>
                  ),
                )}
              </ol>
            </DocumentSection>
          </>
        }
      />

      {saveError && <p className="mb-3 text-sm text-[var(--status-danger)]" role="alert">{saveError}</p>}
      <DocumentActionBar hint={<HelpTip title="保存与提交">保存草稿不会进入审核；提交后由审核人员处理。</HelpTip>}>
        <ButtonLink
          href={existingOrder ? `/orders/${existingOrder.id}` : "/orders"}
          variant="ghost"
        >
          取消
        </ButtonLink>
        <Button type="button" variant="secondary" disabled={saving} onClick={() => void save("draft")}>
          <FilePenLine size={16} />
          保存草稿
        </Button>
        <Button type="submit" disabled={saving}>
          <Send size={16} />
          提交审核
        </Button>
      </DocumentActionBar>
    </form>
  );
}
