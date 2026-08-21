"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  Filter,
  PackageCheck,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Upload,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Field,
  MetricCard,
  Modal,
  PageHeader,
  Progress,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { useNoraIdentity } from "@/features/auth/nora-identity-provider";
import { useShallow } from "zustand/react/shallow";
import type { SalesOrder } from "@/lib/types";
import {
  formatCurrency,
  formatNumber,
  orderSourceLabel,
  orderStatusLabel,
  statusTone,
} from "@/lib/utils";

const filters: Array<[string, string]> = [
  ["all", "全部"],
  ["draft", "草稿"],
  ["pending", "待审核"],
  ["approved", "已审核"],
  ["in_production", "生产中"],
  ["delivering", "配送中"],
  ["completed", "已完成"],
  ["reconciled", "已对账"],
];
const totalOf = (order: SalesOrder) =>
  order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

export function OrdersPage() {
  const orders = useNoraStore((state) => state.orders);
  const mode = useNoraStore((state) => state.mode);
  const { can } = useNoraIdentity();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = useMemo(
    () =>
      orders.filter(
        (order) =>
          (filter === "all" || order.status === filter) &&
          `${order.code}${order.customerName}${order.lines.map((line) => line.productName)}`.includes(
            query,
          ),
      ),
    [orders, query, filter],
  );

  return (
    <>
      <PageHeader
        title="订单中心"
        actions={
          <>
            {mode === "demo" && (
              <ButtonLink href="/orders/import" variant="secondary">
                <Upload size={16} />
                导入订单
              </ButtonLink>
            )}
            {can("orders:write") && (
              <ButtonLink href="/orders/new">
                <Plus size={16} />
                新建订单
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
        <MetricCard
          label="订单总数"
          value={String(orders.length)}
          suffix="单"
          icon={ShoppingCart}
        />
        <MetricCard
          label="待审核"
          value={String(
            orders.filter((order) => order.status === "pending").length,
          )}
          suffix="单"
          icon={ClipboardCheck}
          tone="warning"
        />
        <MetricCard
          label="生产中"
          value={String(
            orders.filter((order) => order.status === "in_production").length,
          )}
          suffix="单"
          icon={PackageCheck}
          tone="purple"
        />
        <MetricCard
          label="订单金额"
          value={(
            orders.reduce((sum, order) => sum + totalOf(order), 0) / 10000
          ).toFixed(1)}
          suffix="万元"
          icon={CircleDollarSign}
          tone="success"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-[#e8edf3] bg-white p-3 sm:p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#667085]"
            />
            <input
              aria-label="搜索订单"
              className={`${inputClass} pl-9`}
              placeholder="搜索订单号、客户或商品"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div
            aria-label="订单状态"
            className="horizontal-snap flex max-w-full overflow-x-auto rounded-[10px] border border-[#dce3ed] bg-[#f3f6fa] p-1"
          >
            {filters.map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`h-11 shrink-0 rounded-[7px] px-3 text-xs font-medium transition sm:h-8 ${filter === value ? "bg-white text-[#0a68dc] shadow-[0_1px_3px_rgba(34,52,79,.1)]" : "text-[#596780] hover:text-[#344054]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button variant="secondary" className="hidden sm:inline-flex">
            <Filter size={15} />
            更多筛选
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Search size={28} className="mx-auto text-[#98a2b3]" />
            <h2 className="mt-3 font-semibold text-[#344054]">
              没有匹配的订单
            </h2>
            <p className="mt-1 text-sm text-[#667085]">
              调整关键词或订单状态后再试。
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#e8edf3] md:hidden">
              {rows.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="focus-ring group block px-4 py-4 transition hover:bg-[#f8fafc] active:bg-[#f2f5f9]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] font-semibold tracking-[0.02em] text-[#0a68dc]">
                        {order.code}
                      </p>
                      <h2 className="mt-1 truncate text-[15px] font-semibold text-[#1d2939]">
                        {order.customerName}
                      </h2>
                    </div>
                    <Badge tone={statusTone[order.status]}>
                      {orderStatusLabel[order.status]}
                    </Badge>
                  </div>
                  <p className="mt-3 line-clamp-1 text-sm text-[#475467]">
                    {order.lines
                      .map(
                        (line) =>
                          `${line.productName} ${formatNumber(line.quantity)}${line.unit}`,
                      )
                      .join("、")}
                  </p>
                  <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-4 border-t border-[#edf0f4] pt-3">
                    <div>
                      <span className="block text-[11px] text-[#667085]">
                        要求送达
                      </span>
                      <span className="mt-0.5 block text-xs font-medium tabular-nums text-[#344054]">
                        {order.deliveryAt}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[11px] text-[#667085]">
                        订单金额
                      </span>
                      <strong className="mt-0.5 block text-base tabular-nums text-[#1d2939]">
                        {formatCurrency(totalOf(order))}
                      </strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#fafbfd] text-[11px] text-[#667085]">
                  <tr>
                    <th className="px-5 py-3">订单号</th>
                    <th className="px-5 py-3">客户</th>
                    <th className="px-5 py-3">商品明细</th>
                    <th className="px-5 py-3">交付时间</th>
                    <th className="px-5 py-3">金额</th>
                    <th className="px-5 py-3">来源</th>
                    <th className="px-5 py-3">状态</th>
                    <th className="px-5 py-3">
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => (
                    <tr
                      key={order.id}
                      className="border-t border-[#edf0f4] transition hover:bg-[#f8fafc]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          className="font-mono text-xs font-semibold text-[#0a68dc]"
                          href={`/orders/${order.id}`}
                        >
                          {order.code}
                        </Link>
                        <p className="mt-1 text-[11px] text-[#667085]">
                          {order.createdAt}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-medium text-[#2b3955]">
                        {order.customerName}
                      </td>
                      <td className="max-w-[260px] px-5 py-4 text-sm text-[#56647d]">
                        <span className="line-clamp-1">
                          {order.lines
                            .map(
                              (line) =>
                                `${line.productName} ${formatNumber(line.quantity)}${line.unit}`,
                            )
                            .join("、")}
                        </span>
                        <span className="text-xs text-[#667085]">
                          共 {order.lines.length} 项
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm tabular-nums">
                        {order.deliveryAt}
                      </td>
                      <td className="px-5 py-4 font-semibold tabular-nums">
                        {formatCurrency(totalOf(order))}
                      </td>
                      <td className="px-5 py-4">
                        <Badge>{orderSourceLabel[order.source]}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge tone={statusTone[order.status]}>
                          {orderStatusLabel[order.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          className="focus-ring inline-flex rounded-lg p-2 hover:bg-[#edf2f7]"
                          href={`/orders/${order.id}`}
                          aria-label={`查看订单 ${order.code}`}
                        >
                          <ChevronRight size={16} className="text-[#667085]" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function OrderDetailPage({ id }: { id: string }) {
  const order = useNoraStore(
    (s) => s.orders.find((o) => o.id === id) ?? s.orders[0],
  );
  const approve = useNoraStore((s) => s.approveOrder);
  const reconcile = useNoraStore((s) => s.reconcileOrder);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Link
        href="/orders"
        className="mb-4 inline-flex items-center gap-2 text-xs text-[#69768d] hover:text-[#1768f2]"
      >
        <ArrowLeft size={14} />
        返回订单中心
      </Link>
      <PageHeader
        title={order.code}
        metadata={`${order.customerName} · ${order.createdAt} 创建`}
        actions={
          <>
            {order.status === "pending" && (
              <Button onClick={() => setConfirm(true)}>
                <ClipboardCheck size={16} />
                审核通过
              </Button>
            )}
            {order.status === "completed" && (
              <Button onClick={() => reconcile(order.id)}>
                <CircleDollarSign size={16} />
                确认对账
              </Button>
            )}
            <Button variant="secondary">
              <Download size={16} />
              打印
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Badge tone={statusTone[order.status]}>
          {orderStatusLabel[order.status]}
        </Badge>
        <span className="text-xs text-[#8792a6]">来源：{orderSourceLabel[order.source]}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <SectionTitle
              title="订单商品"
              description={`共 ${order.lines.length} 项商品`}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]">
                  <tr>
                    <th className="px-5 py-3">商品</th>
                    <th className="px-5 py-3">数量</th>
                    <th className="px-5 py-3">单价</th>
                    <th className="px-5 py-3 text-right">金额</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines.map((l) => (
                    <tr key={l.id} className="border-t border-[#edf0f4]">
                      <td className="px-5 py-4">
                        <b>{l.productName}</b>
                        <p className="text-[11px] text-[#8a95a8]">
                          {l.productCode ?? l.productId}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {formatNumber(l.quantity)} {l.unit}
                      </td>
                      <td className="px-5 py-4">
                        {formatCurrency(l.unitPrice)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {formatCurrency(l.quantity * l.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[#e8edf3] bg-[#fafbfd] p-5">
              <div className="w-64 space-y-2 text-sm">
                <p className="flex justify-between text-[#6e7b93]">
                  <span>商品金额</span>
                  <span>{formatCurrency(totalOf(order))}</span>
                </p>
                <p className="flex justify-between border-t border-[#e0e6ef] pt-3 text-base font-semibold">
                  <span>订单合计</span>
                  <span>{formatCurrency(totalOf(order))}</span>
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">生产需求</h2>
            {order.status === "pending" ? (
              <div className="mt-4 rounded-xl bg-[#fff7e8] p-4">
                <p className="text-sm font-medium text-[#a46600]">
                  订单审核后自动生成
                </p>
                <p className="mt-1 text-xs text-[#88785f]">
                  系统将按工厂、交期与商品聚合需求，并保留客户分配明细。
                </p>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-[#f4f7fb] p-4">
                  <p className="text-xs text-[#8490a4]">需求单</p>
                  <b className="mt-1 block">DEMO-PD-018</b>
                </div>
                <div className="rounded-xl bg-[#f4f7fb] p-4">
                  <p className="text-xs text-[#8490a4]">需求数量</p>
                  <b className="mt-1 block">
                    {formatNumber(
                      order.lines.reduce((s, l) => s + l.quantity, 0),
                    )}{" "}
                    份
                  </b>
                </div>
                <div className="rounded-xl bg-[#eaf8f3] p-4">
                  <p className="text-xs text-[#558777]">BOM 展开</p>
                  <b className="mt-1 block text-[#078663]">已完成</b>
                </div>
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-semibold">客户与配送</h2>
            <div className="mt-4 space-y-4 text-sm">
              <p>
                <span className="block text-xs text-[#8b96aa]">联系人</span>
                {order.contact} · {order.phone}
              </p>
              <p>
                <span className="block text-xs text-[#8b96aa]">配送地址</span>
                {order.address}
              </p>
              <p>
                <span className="block text-xs text-[#8b96aa]">要求送达</span>
                <b>{order.deliveryAt}</b>
              </p>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">履约进度</h2>
            <Progress
              value={
                order.status === "completed" || order.status === "reconciled"
                  ? 100
                  : order.status === "delivering"
                    ? 85
                    : order.status === "in_production"
                      ? 58
                      : order.status === "approved"
                        ? 25
                        : 8
              }
              className="mt-4 h-2"
              tone="success"
            />
            <div className="mt-5 space-y-4">
              {[
                ["订单创建", true],
                ["审核与需求", order.status !== "pending"],
                [
                  "生产完成",
                  ["delivering", "completed", "reconciled"].includes(
                    order.status,
                  ),
                ],
                [
                  "配送签收",
                  ["completed", "reconciled"].includes(order.status),
                ],
              ].map(([label, done]) => (
                <div key={label as string} className="flex items-center gap-3">
                  <CheckCircle2
                    size={17}
                    className={done ? "text-[#08a879]" : "text-[#cbd3df]"}
                  />
                  <span
                    className={`text-sm ${done ? "text-[#34415d]" : "text-[#95a0b2]"}`}
                  >
                    {label as string}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Modal
        open={confirm}
        onOpenChange={setConfirm}
        title="确认审核通过"
        description="通过后将生成生产需求，订单商品与数量不可直接修改。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                approve(order.id);
                setConfirm(false);
              }}
            >
              通过并生成需求
            </Button>
          </>
        }
      >
        <div className="rounded-xl bg-[#f5f7fa] p-4 text-sm">
          <b>{order.customerName}</b>
          <p className="mt-1 text-[#6f7c94]">
            {order.lines.length} 项商品 · {formatCurrency(totalOf(order))}
          </p>
        </div>
      </Modal>
    </>
  );
}

export function NewOrderPage() {
  const customers = useNoraStore((s) => s.customers);
  const products = useNoraStore(
    useShallow((s) => s.products.filter((p) => p.type === "finished")),
  );
  const add = useNoraStore((s) => s.addOrder);
  const [saved, setSaved] = useState(false);
  const defaultDelivery = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return `${date.toISOString().slice(0, 10)}T11:30`;
  }, []);
  const save = async () => {
    const c = customers[0],
      p = products[0];
    if (!c || !p) return;
    await add({
      id: `o-${Date.now()}`,
      code: `DRAFT-${String(Date.now()).slice(-6)}`,
      customerId: c.id,
      customerName: c.name,
      deliveryAt: defaultDelivery.replace("T", " "),
      status: "pending",
      source: "手工录入",
      createdAt: new Date().toISOString(),
      contact: c.contact,
      phone: c.phone,
      address: c.address,
      lines: [
        {
          id: `ol-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          quantity: 800,
          unit: p.unit,
          unitPrice: p.price,
        },
      ],
    });
    setSaved(true);
  };
  if (saved)
    return (
      <Card className="mx-auto max-w-xl p-10 text-center">
        <CheckCircle2 size={48} className="mx-auto text-[#08a879]" />
        <h1 className="mt-4 text-xl font-semibold">订单已创建并提交审核</h1>
        <p className="mt-2 text-sm text-[#748099]">
          新订单已同步到订单中心和工作台待办。
        </p>
        <ButtonLink href="/orders" className="mt-6">
          返回订单中心
        </ButtonLink>
      </Card>
    );
  return (
    <>
      <PageHeader title="新建销售订单" />
      <Card className="mx-auto max-w-4xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="客户" required>
            <select className={inputClass}>
              {customers.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="要求送达" required>
            <input
              className={inputClass}
              type="datetime-local"
              defaultValue={defaultDelivery}
            />
          </Field>
          <Field label="商品" required>
            <select className={inputClass}>
              {products.map((p) => (
                <option key={p.id}>
                  {p.name} · {formatCurrency(p.price)}/{p.unit}
                </option>
              ))}
            </select>
          </Field>
          <Field label="数量" required>
            <input className={inputClass} type="number" defaultValue="800" />
          </Field>
          <Field label="订单来源">
            <select className={inputClass}>
              <option>手工录入</option>
              <option>客户下单</option>
              <option value="AI预测">销量预测</option>
            </select>
          </Field>
          <Field label="备注">
            <input className={inputClass} placeholder="配送或包装要求" />
          </Field>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <ButtonLink href="/orders" variant="secondary">
            取消
          </ButtonLink>
          <Button onClick={() => void save()}>
            <Send size={16} />
            保存并提交审核
          </Button>
        </div>
      </Card>
    </>
  );
}

export function ImportOrdersPage() {
  const [done, setDone] = useState(false);
  return (
    <>
      <PageHeader
        title="导入销售订单"
        metadata={<HelpTip title="导入说明">当前流程用于体验文件校验，不会读取或写入正式业务数据。</HelpTip>}
      />
      <Card className="mx-auto max-w-3xl p-6">
        {!done ? (
          <>
            <button
              onClick={() => setDone(true)}
              className="focus-ring flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#cad6e7] bg-[#fafcff] text-center hover:border-[#1768f2] hover:bg-[#f4f8ff]"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#1768f2]">
                <FileSpreadsheet size={26} />
              </span>
              <b className="mt-4">选择示例文件</b>
              <p className="mt-1 text-xs text-[#8390a5]">
                支持 .xlsx，单次最多 2,000 行
              </p>
            </button>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {["校验客户编码", "校验商品与单位", "预览后再写入"].map(
                (x, i) => (
                  <div key={x} className="rounded-xl bg-[#f5f7fa] p-3 text-sm">
                    <b className="text-[#1768f2]">0{i + 1}</b>
                    <p className="mt-1">{x}</p>
                  </div>
                ),
              )}
            </div>
          </>
        ) : (
          <div className="py-12 text-center">
            <CheckCircle2 size={50} className="mx-auto text-[#08a879]" />
            <h2 className="mt-4 text-xl font-semibold">订单模板校验通过</h2>
            <p className="mt-2 text-sm text-[#748099]">
              共 38 行，识别 12 个客户、6 个商品，无重复订单号。
            </p>
            <ButtonLink href="/orders" className="mt-6">
              返回订单中心
            </ButtonLink>
          </div>
        )}
      </Card>
    </>
  );
}

export function ApprovalsPage() {
  const rows = useNoraStore(
    useShallow((s) => s.orders.filter((o) => o.status === "pending")),
  );
  const approve = useNoraStore((s) => s.approveOrder);
  return (
    <>
      <PageHeader title="订单审核" />
      <Card className="overflow-hidden">
        {rows.length ? (
          rows.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-4 border-b border-[#edf0f4] p-5 last:border-0"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff4df] text-[#d98700]">
                <ClipboardCheck size={19} />
              </span>
              <div className="min-w-[220px] flex-1">
                <Link
                  href={`/orders/${o.id}`}
                  className="font-mono text-xs font-semibold text-[#1768f2]"
                >
                  {o.code}
                </Link>
                <p className="mt-1 font-medium">{o.customerName}</p>
              </div>
              <div className="text-sm">
                <span className="text-xs text-[#8a95a8]">要求送达</span>
                <p>{o.deliveryAt}</p>
              </div>
              <b className="w-28 text-right">{formatCurrency(totalOf(o))}</b>
              <Button onClick={() => approve(o.id)}>
                <CheckCircle2 size={16} />
                审核通过
              </Button>
            </div>
          ))
        ) : (
          <div className="p-12 text-center">
            <CheckCircle2 size={44} className="mx-auto text-[#08a879]" />
            <h2 className="mt-3 font-semibold">待审核订单已清空</h2>
            <p className="mt-1 text-sm text-[#8390a4]">
              新的客户订单会自动出现在这里。
            </p>
          </div>
        )}
      </Card>
    </>
  );
}

export function ReconciliationPage() {
  const orders = useNoraStore(
    useShallow((s) =>
      s.orders.filter((o) => ["completed", "reconciled"].includes(o.status)),
    ),
  );
  const reconcile = useNoraStore((s) => s.reconcileOrder);
  return (
    <>
      <PageHeader
        title="订单对账"
        metadata={<HelpTip title="对账说明">当前操作用于体验对账流程，不会形成正式业务记录。</HelpTip>}
      />
      <Card className="overflow-hidden">
        {orders.map((o) => (
          <div
            key={o.id}
            className="grid items-center gap-4 border-b border-[#edf0f4] p-5 last:border-0 md:grid-cols-[1fr_1fr_140px_120px]"
          >
            <div>
              <Link
                href={`/orders/${o.id}`}
                className="font-mono text-xs font-semibold text-[#1768f2]"
              >
                {o.code}
              </Link>
              <p className="mt-1 font-medium">{o.customerName}</p>
            </div>
            <div className="text-sm text-[#66738a]">
              已签收 · 无差异
              <p className="text-xs text-[#8b96a9]">{o.deliveryAt}</p>
            </div>
            <b>{formatCurrency(totalOf(o))}</b>
            {o.status === "reconciled" ? (
              <Badge tone="success">已转财务</Badge>
            ) : (
              <Button onClick={() => reconcile(o.id)}>
                <CircleDollarSign size={15} />
                确认对账
              </Button>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
