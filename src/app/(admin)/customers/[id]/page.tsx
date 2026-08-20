"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, MapPin, Phone, ShoppingCart } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const customer = useNoraStore((state) => state.customers.find((item) => item.id === id));
  const allOrders = useNoraStore((state) => state.orders);
  const orders = useMemo(
    () => allOrders.filter((order) => order.customerId === id),
    [allOrders, id],
  );

  if (!customer) {
    return (
      <Card className="p-8">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">未找到客户</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">该客户不存在，或当前数据源尚未返回其档案。</p>
        <Link href="/customers" className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-[var(--interactive)]">
          <ArrowLeft size={14} className="mr-2" />返回客户列表
        </Link>
      </Card>
    );
  }

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex min-h-11 items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--interactive)]">
        <ArrowLeft size={14} />返回客户列表
      </Link>
      <PageHeader
        title={customer.name}
        metadata={`${customer.code} · ${customer.type}客户`}
        actions={<Badge tone={customer.status === "active" ? "success" : "warning"}>{customer.status === "active" ? "合作中" : "待审核"}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="p-5">
          <h2 className="font-semibold">客户档案</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p><span className="block text-xs text-[var(--text-tertiary)]">联系人</span>{customer.contact}</p>
            <p className="flex gap-2"><Phone size={16} className="text-[var(--interactive)]" />{customer.phone}</p>
            <p className="flex gap-2"><MapPin size={16} className="shrink-0 text-[var(--interactive)]" />{customer.address}</p>
            <p><span className="block text-xs text-[var(--text-tertiary)]">结算方式</span>{customer.settlement}</p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-[var(--stroke-subtle)] p-4"><h2 className="font-semibold">历史订单</h2></div>
          {orders.length ? orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="flex min-h-16 items-center gap-4 border-b border-[var(--stroke-subtle)] p-4 last:border-0 hover:bg-[var(--surface-subtle)]">
              <ShoppingCart size={18} className="text-[var(--interactive)]" />
              <div className="flex-1"><b className="text-sm">{order.code}</b><p className="text-xs text-[var(--text-tertiary)]">{order.deliveryAt} 交付</p></div>
              <span className="font-semibold">{formatCurrency(order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))}</span>
            </Link>
          )) : <p className="p-8 text-center text-sm text-[var(--text-tertiary)]">暂无订单</p>}
        </Card>
      </div>
    </>
  );
}
