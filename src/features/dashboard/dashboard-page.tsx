"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { AlertTriangle, ArrowRight, Boxes, BrainCircuit, CheckCircle2, ClipboardList, Factory, PackageSearch, RotateCw, ShoppingCart, Sparkles, Truck, UsersRound } from "lucide-react";
import { useNoraStore } from "@/lib/store";
import { currency, number, orderStatus } from "@/lib/utils";
import { Badge, Button, Card, IconBox, MetricCard, Modal, PageHeader, Progress, SectionTitle } from "@/components/ui";

const flow = [
  { layer: "需求层", title: "客户与预测", detail: "268 个活跃客户", href: "/customers", icon: UsersRound },
  { layer: "需求层", title: "订单中心", detail: "48 单待履约", href: "/orders", icon: ShoppingCart },
  { layer: "计划层", title: "BOM 展开", detail: "86 种原料需求", href: "/catalog/boms", icon: Boxes },
  { layer: "计划层", title: "生产计划", detail: "28 个计划批次", href: "/production/plans", icon: ClipboardList },
  { layer: "执行层", title: "MES 执行", detail: "18 个在制任务", href: "/mes", icon: Factory },
  { layer: "经营层", title: "数字孪生", detail: "11 个区域在线", href: "/digital-twin", icon: BrainCircuit },
];

export function DashboardPage() {
  const { orders, workOrders, products, activities } = useNoraStore();
  const [guideOpen, setGuideOpen] = useState(false);

  const todayRevenue = useMemo(() => orders.reduce((sum, order) => sum + order.lines.reduce((lineSum, line) => lineSum + line.quantity * line.unitPrice, 0), 0), [orders]);
  const running = workOrders.filter((item) => item.status === "in_progress");
  const completion = Math.round(workOrders.reduce((sum, item) => sum + item.progress, 0) / workOrders.length);
  const lowStock = products.filter((item) => item.stock < item.safetyStock);

  const trendOption = {
    grid: { left: 38, right: 18, top: 24, bottom: 28 },
    xAxis: { type: "category", data: ["07-08", "07-09", "07-10", "07-11", "07-12", "07-13", "07-14"], axisLine: { lineStyle: { color: "#dfe5ed" } }, axisTick: { show: false }, axisLabel: { color: "#8792a5", fontSize: 11 } },
    yAxis: { type: "value", splitLine: { lineStyle: { color: "#edf0f5" } }, axisLabel: { color: "#8792a5", fontSize: 11 }, min: 0 },
    tooltip: { trigger: "axis" },
    series: [{ data: [720, 680, 990, 1180, 940, 1430, 1268], type: "line", smooth: 0.28, symbolSize: 7, lineStyle: { width: 2.5, color: "#1768f2" }, itemStyle: { color: "#1768f2" }, areaStyle: { color: "rgba(23,104,242,.08)" } }],
  };

  return <>
    <PageHeader title="早上好，张伟" actions={<Button variant="secondary" size="sm" onClick={() => setGuideOpen(true)}>新手引导</Button>} />
    <div className="horizontal-snap -mx-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
      <MetricCard label="今日订单" value={number(orders.length * 253)} suffix="单" icon={ShoppingCart} tone="info" change="较昨日 ↑ 12.5%" />
      <MetricCard label="生产任务" value={String(workOrders.length + 23)} suffix="项" icon={Factory} tone="success" change={`${running.length + 13} 项进行中`} />
      <MetricCard label="库存预警" value={String(lowStock.length + 16)} suffix="种" icon={AlertTriangle} tone="warning" change="需要关注库存" />
      <MetricCard label="今日销售额" value={currency(todayRevenue)} icon={Truck} tone="purple" change="较昨日 ↑ 11.3%" />
    </div>

    <Card className="mt-3 overflow-hidden">
      <SectionTitle title="业务运行地图" />
      <div className="horizontal-snap overflow-x-auto p-4">
        <div className="flex min-w-max items-stretch gap-2 xl:w-full xl:min-w-0">
          {flow.map((item, index) => <div key={item.title} className="flex w-[218px] shrink-0 items-center gap-2 sm:w-[230px] xl:w-auto xl:min-w-0 xl:flex-1"><Link href={item.href} className="focus-ring group flex min-h-[112px] min-w-0 flex-1 flex-col justify-between rounded-[14px] border border-[#e2e7ef] bg-white p-3.5 transition duration-200 hover:border-[#bfd0e7] hover:bg-[#fafcff] hover:shadow-[0_6px_18px_rgba(34,57,91,.06)] active:translate-y-px"><div className="flex items-start justify-between"><IconBox icon={item.icon} tone={index < 2 ? "info" : index < 4 ? "purple" : index === 4 ? "success" : "warning"} size="sm" /><span className="text-[10px] font-semibold text-[#667085]">{item.layer}</span></div><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#22304d]">{item.title}</h3><p className="mt-1 truncate text-xs text-[#667085]">{item.detail}</p></div></Link>{index < flow.length - 1 && <ArrowRight size={17} className="shrink-0 text-[#98a2b3]" />}</div>)}
        </div>
      </div>
    </Card>

    <div className="mt-3 grid gap-3 xl:grid-cols-[0.9fr_1.4fr_1.2fr]">
      <Card><SectionTitle title="生产完成率" /><div className="flex items-center justify-center gap-6 p-5"><div className="relative flex size-36 shrink-0 aspect-square items-center justify-center rounded-full" style={{ background: `conic-gradient(#1768f2 ${completion * 3.6}deg, #e8edf4 0deg)` }}><div className="flex size-[116px] shrink-0 aspect-square flex-col items-center justify-center rounded-full bg-white"><strong className="text-4xl font-medium tracking-[-0.06em]">{completion}<span className="text-lg">%</span></strong><span className="mt-1 text-xs text-[#7d899e]">今日完成率</span></div></div><div className="min-w-[120px] space-y-3 text-xs"><div><span className="text-[#8792a5]">计划产量</span><strong className="mt-1 block text-[#253451]">12,560 份</strong></div><div><span className="text-[#8792a5]">已完成</span><strong className="mt-1 block text-[#253451]">9,817 份</strong></div><div className="text-[#079b71]">较昨日 ↑ 8.6%</div></div></div></Card>
      <Card><SectionTitle title="订单趋势" action={<Badge tone="info">近 7 天</Badge>} /><ReactECharts option={trendOption} style={{ height: 235 }} /></Card>
      <Card><SectionTitle title="实时生产进度" action={<Link href="/production/plans" className="text-xs font-medium text-[#1768f2]">查看全部</Link>} /><div className="divide-y divide-[#edf0f4] px-4">{running.slice(0, 4).map((item) => <Link key={item.id} href="/production/plans" className="block py-3"><div className="mb-2 flex items-center justify-between gap-3"><div><span className="text-sm font-medium text-[#2a3855]">{item.productName}</span><span className="ml-2 text-[11px] text-[#8b96aa]">{item.line}</span></div><span className="text-xs font-semibold text-[#273553]">{item.progress}%</span></div><Progress value={item.progress} tone={item.progress > 80 ? "success" : "info"} /></Link>)}</div></Card>
    </div>

    <div className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_1fr_1.15fr]">
      <Card><SectionTitle title="今日计划" action={<Link href="/production/plans" className="text-xs font-medium text-[#1768f2]">查看全部</Link>} /><div className="nora-scrollbar overflow-x-auto"><table className="w-full min-w-[480px] text-left text-xs"><thead className="bg-[#fafbfd] text-[#7b879b]"><tr><th className="px-4 py-2.5 font-medium">产品</th><th className="px-3 py-2.5 font-medium">计划数量</th><th className="px-3 py-2.5 font-medium">进度</th></tr></thead><tbody>{workOrders.slice(0, 5).map((item) => <tr key={item.id} className="border-t border-[#edf0f4]"><td className="px-4 py-3 font-medium text-[#2d3b58]">{item.productName}</td><td className="px-3 py-3 text-[#64718a]">{number(item.plannedQuantity)} {item.unit}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><Progress value={item.progress} className="w-20" /><span>{item.progress}%</span></div></td></tr>)}</tbody></table></div></Card>
      <Card><SectionTitle title="待处理事项" action={<Badge tone="danger">8</Badge>} /><div className="divide-y divide-[#edf0f4] px-4">{orders.filter((order) => order.status === "pending" || order.status === "approved").concat(orders.slice(0, 2)).slice(0, 4).map((order, index) => <Link key={`${order.id}-${index}`} href={`/orders/${order.id}`} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-xs font-medium text-[#2f3d59]">{order.code} · {order.customerName}</p><p className="mt-1 text-[11px] text-[#8b96aa]">{index % 2 === 0 ? "需要确认交付信息" : "等待生产需求汇总"}</p></div><Badge tone={orderStatus[order.status].tone}>{orderStatus[order.status].label}</Badge></Link>)}</div></Card>
      <Card><SectionTitle title="AI 建议" action={<button className="flex items-center gap-1 text-xs font-medium text-[#1768f2]"><RotateCw size={13} />换一批</button>} /><div className="space-y-2 p-3"><Link href="/ai/forecast" className="flex gap-3 rounded-xl border border-[#e8edf3] p-3 hover:bg-[#fbfcfe]"><IconBox icon={Sparkles} tone="success" size="sm" /><div><p className="text-xs font-semibold text-[#09825f]">采购建议</p><p className="mt-1 text-xs text-[#59667f]">鸡胸肉库存低于安全线，建议采购 150kg</p></div></Link><Link href="/production/plans" className="flex gap-3 rounded-xl border border-[#e8edf3] p-3 hover:bg-[#fbfcfe]"><IconBox icon={AlertTriangle} tone="danger" size="sm" /><div><p className="text-xs font-semibold text-[#dc3c3c]">产能瓶颈</p><p className="mt-1 text-xs text-[#59667f]">烹饪线高峰负荷 110%，建议调整排产</p></div></Link><Link href="/catalog/boms" className="flex gap-3 rounded-xl border border-[#e8edf3] p-3 hover:bg-[#fbfcfe]"><IconBox icon={PackageSearch} tone="warning" size="sm" /><div><p className="text-xs font-semibold text-[#c77800]">成本优化</p><p className="mt-1 text-xs text-[#59667f]">宫保鸡丁 V2.1 标准成本下降 0.36 元/kg</p></div></Link></div></Card>
    </div>

    <Card className="mt-3"><SectionTitle title="异常与提醒" action={<Link href="/digital-twin" className="text-xs font-medium text-[#1768f2]">进入数字孪生</Link>} /><div className="grid divide-y divide-[#edf0f4] md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">{activities.slice(0, 5).map((item) => <div key={item.id} className="flex gap-3 p-4"><IconBox icon={item.tone === "danger" ? AlertTriangle : CheckCircle2} tone={item.tone} size="sm" /><div><p className="text-xs font-semibold text-[#34425f]">{item.title}</p><p className="mt-1 text-[11px] leading-5 text-[#7f8a9e]">{item.detail}</p><span className="mt-1 block text-[10px] text-[#a0a9b8]">今天 {item.time}</span></div></div>)}</div></Card>

    <Modal open={guideOpen} onOpenChange={setGuideOpen} title="欢迎使用 Nora" description="用三步了解中央厨房的核心业务闭环" footer={<Button onClick={() => setGuideOpen(false)}>开始使用</Button>}><div className="space-y-5">{[{ n: "01", t: "从订单开始", d: "客户订单审核后，会自动进入生产需求。" }, { n: "02", t: "BOM 展开与排产", d: "系统根据配方计算物料需求并分配到产线。" }, { n: "03", t: "MES 执行与实时反馈", d: "工位报工会同步更新计划和数字孪生。" }].map((item) => <div key={item.n} className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-sm font-semibold text-[#1768f2]">{item.n}</span><div><h3 className="font-semibold text-[#263451]">{item.t}</h3><p className="mt-1 text-sm text-[#74809a]">{item.d}</p></div></div>)}</div></Modal>
  </>;
}
