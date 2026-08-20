"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Building2, Filter, Search, UsersRound } from "lucide-react";
import { Badge, Card, MetricCard, PageHeader, inputClass } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

const customerStatuses = [
  { value: "all", label: "全部" },
  { value: "active", label: "已启用" },
  { value: "pending", label: "待审核" },
] as const;

export function CustomersPage() {
  const customers = useNoraStore((state) => state.customers);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof customerStatuses)[number]["value"]>("all");

  const filtered = useMemo(
    () => customers.filter((customer) =>
      (status === "all" || customer.status === status)
      && `${customer.name}${customer.contact}${customer.tags.join("")}`.includes(query),
    ),
    [customers, query, status],
  );

  return <>
    <PageHeader title="客户中心" />

    <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
      <MetricCard label="有效客户" value={String(customers.filter((customer) => customer.status === "active").length)} suffix="家" icon={UsersRound} />
      <MetricCard label="重点客户" value={String(customers.filter((customer) => customer.tags.includes("重点客户")).length)} suffix="家" icon={Building2} tone="purple" />
      <MetricCard label="累计销售额" value={(customers.reduce((sum, customer) => sum + customer.revenue, 0) / 10_000).toFixed(1)} suffix="万元" icon={UsersRound} tone="success" />
      <MetricCard label="待审核" value={String(customers.filter((customer) => customer.status === "pending").length)} suffix="家" icon={Filter} tone="warning" />
    </div>

    <Card className="overflow-hidden">
      <div className="flex flex-wrap gap-3 border-b border-[#e8edf3] p-3 sm:p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8995aa]" />
          <input
            aria-label="搜索客户"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass} pl-9`}
            placeholder="搜索客户、联系人或标签"
          />
        </div>
        <div aria-label="客户状态" className="horizontal-snap flex max-w-full overflow-x-auto rounded-[10px] border border-[#dce3ed] bg-[#f3f6fa] p-1">
          {customerStatuses.map((item) => <button
            key={item.value}
            type="button"
            aria-pressed={status === item.value}
            onClick={() => setStatus(item.value)}
            className={`focus-ring shrink-0 rounded-[7px] px-3 py-1.5 text-xs font-medium transition ${status === item.value ? "bg-white text-[#1768f2] shadow-sm" : "text-[#667085] hover:text-[#344054]"}`}
          >{item.label}</button>)}
        </div>
      </div>

      <div className="divide-y divide-[#edf0f4] md:hidden">
        {filtered.map((customer) => <Link
          key={customer.id}
          href={`/customers/${customer.id}`}
          className="focus-ring block p-4 transition hover:bg-[#f8fafc] active:bg-[#f1f5f9]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold text-[#1768f2]">{customer.code}</p>
              <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.02em] text-[#1d2939]">{customer.name}</h2>
            </div>
            <Badge tone={customer.status === "active" ? "success" : "warning"}>{customer.status === "active" ? "已启用" : "待审核"}</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge tone="info">{customer.type}</Badge>
            {customer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0f4] pt-3 text-xs">
            <div><span className="text-[#98a2b3]">联系人</span><strong className="mt-1 block font-medium text-[#344054]">{customer.contact} · {customer.phone}</strong></div>
            <div className="text-right"><span className="text-[#98a2b3]">订单 / 销售额</span><strong className="mt-1 block tabular-nums font-semibold text-[#1d2939]">{customer.orderCount} 笔 · {formatCurrency(customer.revenue)}</strong></div>
          </div>
        </Link>)}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] text-left">
          <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]"><tr><th className="px-5 py-3">客户</th><th className="px-5 py-3">分类与标签</th><th className="px-5 py-3">联系人</th><th className="px-5 py-3">结算</th><th className="px-5 py-3">订单/销售额</th><th className="px-5 py-3">状态</th></tr></thead>
          <tbody>{filtered.map((customer) => <tr key={customer.id} className="border-t border-[#edf0f4] hover:bg-[#fbfcfe]">
            <td className="px-5 py-4"><Link href={`/customers/${customer.id}`} className="font-semibold text-[#263451] hover:text-[#1768f2]">{customer.name}</Link><p className="mt-1 font-mono text-[11px] text-[#8a95a8]">{customer.code}</p></td>
            <td className="px-5 py-4"><div className="flex gap-1"><Badge tone="info">{customer.type}</Badge>{customer.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}</div></td>
            <td className="px-5 py-4 text-sm text-[#4e5d77]">{customer.contact}<p className="text-xs text-[#8a95a8]">{customer.phone}</p></td>
            <td className="px-5 py-4 text-sm text-[#56647d]">{customer.settlement}</td>
            <td className="px-5 py-4 text-sm text-[#31405c]">{customer.orderCount} 笔<p className="text-xs text-[#8692a6]">{formatCurrency(customer.revenue)}</p></td>
            <td className="px-5 py-4"><Badge tone={customer.status === "active" ? "success" : "warning"}>{customer.status === "active" ? "已启用" : "待审核"}</Badge></td>
          </tr>)}</tbody>
        </table>
      </div>

      {filtered.length === 0 && <div className="px-5 py-12 text-center"><Search className="mx-auto text-[#b8c1cf]" /><p className="mt-3 font-medium text-[#344054]">没有匹配的客户</p><p className="mt-1 text-sm text-[#98a2b3]">请调整搜索词或客户状态</p></div>}
    </Card>
  </>;
}
