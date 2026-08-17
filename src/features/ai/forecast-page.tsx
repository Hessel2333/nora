"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  MetricCard,
  PageHeader,
  inputClass,
} from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });
export function ForecastPage() {
  const products = useNoraStore(
    useShallow((s) => s.products.filter((p) => p.type === "finished")),
  );
  const customers = useNoraStore((s) => s.customers);
  const add = useNoraStore((s) => s.addOrder);
  const [generated, setGenerated] = useState(false);
  const option = useMemo(
    () => ({
      grid: { left: 42, right: 24, top: 30, bottom: 32 },
      tooltip: { trigger: "axis" },
      legend: {
        data: ["历史销量", "AI预测"],
        right: 8,
        textStyle: { color: "#66738a" },
      },
      xAxis: {
        type: "category",
        data: [
          "7/8",
          "7/9",
          "7/10",
          "7/11",
          "7/12",
          "7/13",
          "7/14",
          "7/15",
          "7/16",
          "7/17",
        ],
        axisLine: { lineStyle: { color: "#dfe5ed" } },
        axisLabel: { color: "#8490a4" },
      },
      yAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#edf0f4" } },
        axisLabel: { color: "#8490a4" },
      },
      series: [
        {
          name: "历史销量",
          type: "line",
          smooth: true,
          data: [1860, 2100, 1980, 2360, 2280, 2520, 2460, null, null, null],
          lineStyle: { color: "#93a4bd", width: 2 },
          itemStyle: { color: "#93a4bd" },
          areaStyle: { color: "rgba(147,164,189,.08)" },
        },
        {
          name: "AI预测",
          type: "line",
          smooth: true,
          data: [null, null, null, null, null, 2520, 2460, 2680, 2840, 2730],
          lineStyle: { color: "#1768f2", width: 3, type: "dashed" },
          itemStyle: { color: "#1768f2" },
          areaStyle: { color: "rgba(23,104,242,.08)" },
        },
      ],
    }),
    [],
  );
  const generate = () => {
    const c = customers[1],
      p = products[0];
    add({
      id: `ai-${Date.now()}`,
      code: `SO20260714${String(Date.now()).slice(-4)}`,
      customerId: c.id,
      customerName: c.name,
      deliveryAt: "2026-07-16 11:00",
      status: "draft",
      source: "AI预测",
      createdAt: "2026-07-14 10:30",
      contact: c.contact,
      phone: c.phone,
      address: c.address,
      notes: "基于近 30 天销量与星期效应生成",
      lines: [
        {
          id: `ai-l-${Date.now()}`,
          productId: p.id,
          productName: p.name,
          quantity: 980,
          unit: p.unit,
          unitPrice: p.price,
        },
      ],
    });
    setGenerated(true);
  };
  return (
    <>
      <PageHeader
        title="AI 销售预测"
        actions={
          <Button variant="secondary">
            <RefreshCw size={16} />
            重新训练
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="明日预测销量"
          value="8,420"
          suffix="份"
          icon={TrendingUp}
          change="较本周均值 +12.6%"
        />
        <MetricCard
          label="预测准确率"
          value="91.8"
          suffix="%"
          icon={Sparkles}
          tone="purple"
        />
        <MetricCard
          label="建议订单"
          value="6"
          suffix="单"
          icon={ShoppingCart}
          tone="success"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#e8edf3] p-4">
            <div>
              <h2 className="font-semibold">宫保鸡丁销量趋势</h2>
              <p className="text-xs text-[#8792a6]">
                近 7 天实际销量与未来 3 天预测
              </p>
            </div>
            <Badge tone="info">置信区间 ±8.2%</Badge>
          </div>
          <ReactECharts option={option} style={{ height: 360 }} />
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efedff] text-[#6858e8]">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="font-semibold">生成订单草稿</h2>
              <p className="text-xs text-[#8792a6]">预测不会直接提交订单</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <Field label="预测客户">
              <select className={inputClass}>
                <option>盒马鲜生南山店</option>
                <option>华润万家深圳福田店</option>
              </select>
            </Field>
            <Field label="交付日期">
              <input
                type="date"
                defaultValue="2026-07-16"
                className={inputClass}
              />
            </Field>
            <Field label="预测场景">
              <select className={inputClass}>
                <option>标准销量场景</option>
                <option>高峰保守备货</option>
                <option>活动增长场景</option>
              </select>
            </Field>
          </div>
          {generated ? (
            <div className="mt-5 rounded-xl bg-[#e9f8f3] p-4">
              <p className="flex items-center gap-2 font-semibold text-[#08785b]">
                <CheckCircle2 size={17} />
                订单草稿已生成
              </p>
              <p className="mt-1 text-xs text-[#5d7f75]">
                宫保鸡丁 980份 · 可在订单中心继续编辑。
              </p>
              <Link
                href="/orders"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#08785b]"
              >
                前往订单中心
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <Button onClick={generate} className="mt-5 w-full">
              <Sparkles size={16} />
              生成订单草稿
            </Button>
          )}
        </Card>
      </div>
      <Card className="mt-4 p-5">
        <h2 className="font-semibold">预测依据</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            [CalendarRange, "星期效应", "周三午餐订单通常高于均值 9%"],
            [TrendingUp, "近期趋势", "宫保鸡丁连续 4 日增长"],
            [Sparkles, "客户偏好", "盒马南山店该商品复购周期为 2 天"],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Sparkles;
            return (
              <div
                key={title as string}
                className="rounded-xl bg-[#f5f7fa] p-4"
              >
                <I size={18} className="text-[#1768f2]" />
                <b className="mt-2 block text-sm">{title as string}</b>
                <p className="mt-1 text-xs leading-5 text-[#748197]">
                  {text as string}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
