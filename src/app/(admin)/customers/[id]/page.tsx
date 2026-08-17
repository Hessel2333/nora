import Link from "next/link";
import { ArrowLeft, MapPin, Phone, ShoppingCart } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { customers, orders } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = customers.find((x) => x.id === id) ?? customers[0];
  const rows = orders.filter((o) => o.customerId === c.id);
  return (
    <>
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-2 text-xs text-[#69768d] hover:text-[#1768f2]"
      >
        <ArrowLeft size={14} />
        返回客户列表
      </Link>
      <PageHeader
        title={c.name}
        metadata={`${c.code} · ${c.type}客户`}
        actions={<Badge tone="success">合作中</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="p-5">
          <h2 className="font-semibold">客户档案</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p>
              <span className="block text-xs text-[#8a95a8]">联系人</span>
              {c.contact}
            </p>
            <p className="flex gap-2">
              <Phone size={16} className="text-[#1768f2]" />
              {c.phone}
            </p>
            <p className="flex gap-2">
              <MapPin size={16} className="shrink-0 text-[#1768f2]" />
              {c.address}
            </p>
            <p>
              <span className="block text-xs text-[#8a95a8]">结算方式</span>
              {c.settlement}
            </p>
          </div>
        </Card>
        <Card className="overflow-hidden">
          <div className="border-b border-[#e8edf3] p-4">
            <h2 className="font-semibold">历史订单</h2>
          </div>
          {rows.length ? (
            rows.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center gap-4 border-b border-[#edf0f4] p-4 last:border-0 hover:bg-[#fbfcfe]"
              >
                <ShoppingCart size={18} className="text-[#1768f2]" />
                <div className="flex-1">
                  <b className="text-sm">{o.code}</b>
                  <p className="text-xs text-[#8390a4]">{o.deliveryAt} 交付</p>
                </div>
                <span className="font-semibold">
                  {formatCurrency(
                    o.lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0),
                  )}
                </span>
              </Link>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-[#8a95a8]">暂无订单</p>
          )}
        </Card>
      </div>
    </>
  );
}
