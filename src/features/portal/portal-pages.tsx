import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  PackageCheck,
  Truck,
} from "lucide-react";
import { Badge, Button, Card, PageHeader, Progress } from "@/components/ui";
import { orders } from "@/lib/mock-data";
import { formatCurrency, orderStatusLabel, statusTone } from "@/lib/utils";
export function PortalOrders() {
  const rows = orders.filter((o) => o.customerId === "c-001");
  return (
    <>
      <PageHeader
        title="我的订单"
        actions={
          <Button variant="secondary">
            <Headphones size={16} />
            联系客户经理
          </Button>
        }
      />
      <div className="space-y-3">
        {rows.map((o) => (
          <Link key={o.id} href={`/portal/orders/${o.id}`}>
            <Card className="mb-3 flex items-center gap-4 p-5 hover:border-[#b8ccef]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4ff] text-[#1768f2]">
                <PackageCheck size={20} />
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="font-mono text-sm">{o.code}</b>
                  <Badge tone={statusTone[o.status]}>
                    {orderStatusLabel[o.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[#68758b]">
                  {o.lines
                    .map((l) => `${l.productName} ${l.quantity}${l.unit}`)
                    .join("、")}
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <b>
                  {formatCurrency(
                    o.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
                  )}
                </b>
                <p className="text-xs text-[#8792a6]">{o.deliveryAt} 送达</p>
              </div>
              <ChevronRight size={17} className="text-[#8a95a8]" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
export function PortalOrderDetail({ id }: { id: string }) {
  const o = orders.find((x) => x.id === id) ?? orders[0];
  return (
    <>
      <Link
        href="/portal/orders"
        className="mb-4 inline-flex items-center gap-2 text-xs text-[#68758c]"
      >
        <ArrowLeft size={14} />
        返回订单
      </Link>
      <PageHeader
        title={o.code}
        metadata={`创建于 ${o.createdAt}`}
        actions={
          <Badge tone={statusTone[o.status]}>
            {orderStatusLabel[o.status]}
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h2 className="font-semibold">履约进度</h2>
          <Progress
            value={
              o.status === "completed"
                ? 100
                : o.status === "delivering"
                  ? 82
                  : 58
            }
            className="mt-5 h-2"
            tone="success"
          />
          <div className="mt-6 grid gap-5 sm:grid-cols-4">
            {[
              [CheckCircle2, "订单已确认", "07-14 08:52"],
              [PackageCheck, "中央厨房生产", "进行中"],
              [Truck, "冷链配送", "等待生产完成"],
              [MapPin, "完成签收", "预计 11:00"],
            ].map(([Icon, label, time], i) => {
              const I = Icon as typeof Clock3;
              return (
                <div key={label as string}>
                  <I
                    size={22}
                    className={i <= 1 ? "text-[#08a879]" : "text-[#bdc6d3]"}
                  />
                  <b className="mt-2 block text-sm">{label as string}</b>
                  <p className="text-xs text-[#8792a6]">{time as string}</p>
                </div>
              );
            })}
          </div>
          <h2 className="mt-8 border-t border-[#e8edf3] pt-5 font-semibold">
            订单明细
          </h2>
          {o.lines.map((l) => (
            <div
              key={l.id}
              className="mt-3 flex justify-between rounded-xl bg-[#f5f7fa] p-4"
            >
              <span>
                {l.productName} × {l.quantity}
                {l.unit}
              </span>
              <b>{formatCurrency(l.quantity * l.unitPrice)}</b>
            </div>
          ))}
        </Card>
        <Card className="h-fit p-5">
          <h2 className="font-semibold">配送信息</h2>
          <p className="mt-4 text-xs text-[#8792a6]">要求送达</p>
          <b className="mt-1 block">{o.deliveryAt}</b>
          <p className="mt-4 text-xs text-[#8792a6]">配送地址</p>
          <p className="mt-1 text-sm leading-6">{o.address}</p>
          <p className="mt-4 text-xs text-[#8792a6]">收货人</p>
          <p className="mt-1 text-sm">
            {o.contact} · {o.phone}
          </p>
        </Card>
      </div>
    </>
  );
}
