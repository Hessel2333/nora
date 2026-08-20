"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Factory,
  Gauge,
  Layers3,
  PackageCheck,
  Play,
  Plus,
  Route,
  Search,
  ShieldCheck,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  Card,
  MetricCard,
  PageHeader,
  Progress,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { formatNumber, workOrderStatus } from "@/lib/utils";

const hours = [
  "06:00",
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
];
const taskStyles = [
  "left-[8%] w-[34%] bg-[#dceaff] text-[#1559c7]",
  "left-[22%] w-[42%] bg-[#e9e6ff] text-[#5c4bc6]",
  "left-[45%] w-[33%] bg-[#dff6ee] text-[#087b5b]",
  "left-[65%] w-[26%] bg-[#fff0d5] text-[#ba6d00]",
];

export function ProductionPlansPage() {
  const workOrders = useNoraStore((state) => state.workOrders);
  const [line, setLine] = useState("全部产线");
  const averageProgress = Math.round(
    workOrders.length === 0
      ? 0
      : workOrders.reduce((sum, workOrder) => sum + workOrder.progress, 0) /
          workOrders.length,
  );

  return (
    <>
      <PageHeader
        title="生产计划"
        metadata={<HelpTip title="排程说明">当前排程用于体验计划查看，不会下达正式生产任务。</HelpTip>}
      />
      <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
        <MetricCard
          label="今日计划"
          value={String(workOrders.length)}
          suffix="单"
          icon={CalendarDays}
        />
        <MetricCard
          label="计划产量"
          value="8,200"
          suffix="份"
          icon={Factory}
          tone="purple"
        />
        <MetricCard
          label="平均完成率"
          value={String(averageProgress)}
          suffix="%"
          icon={Gauge}
          tone="success"
        />
        <MetricCard
          label="缺料风险"
          value="2"
          suffix="项"
          icon={AlertTriangle}
          tone="warning"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] p-4">
            <div>
              <h2 className="font-semibold text-[#1d2939]">产线甘特排程</h2>
              <p className="mt-0.5 text-xs text-[#667085]">
                当日班次
              </p>
            </div>
            <select
              aria-label="筛选产线"
              value={line}
              onChange={(event) => setLine(event.target.value)}
              className={`${inputClass} w-36`}
            >
              <option>全部产线</option>
              <option>清洗线</option>
              <option>切配线</option>
              <option>组配线</option>
              <option>包装线</option>
            </select>
          </div>

          <div className="divide-y divide-[#e8edf3] sm:hidden">
            {workOrders.slice(0, 4).map((workOrder, index) => (
              <Link
                key={workOrder.id}
                href={`/production/plans/${workOrder.id}`}
                className="focus-ring block p-4 transition hover:bg-[#f8fafc] active:bg-[#f2f5f9]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-medium text-[#667085]">
                      {workOrder.line}
                    </span>
                    <h3 className="mt-1 font-semibold text-[#1d2939]">
                      {workOrder.productName}
                    </h3>
                  </div>
                  <Badge tone={workOrder.progress > 80 ? "success" : "info"}>
                    {workOrder.progress}%
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="tabular-nums text-[#475467]">
                    {workOrder.startAt}—{workOrder.endAt}
                  </span>
                  <span className="text-[#667085]">负载 {58 + index * 9}%</span>
                </div>
                <Progress
                  value={workOrder.progress}
                  className="mt-3 h-2"
                  tone={workOrder.progress > 80 ? "success" : "info"}
                />
              </Link>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <div className="min-w-[820px] p-4">
              <div className="ml-28 grid grid-cols-9 text-center text-[10px] text-[#667085]">
                {hours.map((hour) => (
                  <span key={hour}>{hour}</span>
                ))}
              </div>
              {workOrders.slice(0, 4).map((workOrder, index) => (
                <div key={workOrder.id} className="mt-3 flex items-center">
                  <div className="w-28 pr-3">
                    <b className="block text-xs text-[#33415d]">
                      {workOrder.line}
                    </b>
                    <span className="text-[10px] text-[#667085]">
                      负载 {58 + index * 9}%
                    </span>
                  </div>
                  <div className="map-grid relative h-16 flex-1 rounded-[10px] border border-[#e7ebf1] bg-[#fbfcfe]">
                    <Link
                      href={`/production/plans/${workOrder.id}`}
                      className={`focus-ring absolute top-2 h-12 rounded-[9px] px-3 py-2 transition hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(34,57,91,.09)] ${taskStyles[index]}`}
                    >
                      <b className="block truncate text-xs">
                        {workOrder.productName}
                      </b>
                      <span className="text-[10px] opacity-80">
                        {workOrder.startAt}–{workOrder.endAt} ·{" "}
                        {workOrder.progress}%
                      </span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle title="产线负载" />
            <div className="space-y-4 p-4">
              {[
                ["清洗线", 68],
                ["切配线", 82],
                ["组配线", 91],
                ["包装线", 74],
              ].map(([name, value]) => (
                <div key={name as string}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span>{name}</span>
                    <b className="tabular-nums">{value}%</b>
                  </div>
                  <Progress
                    value={value as number}
                    tone={(value as number) > 88 ? "warning" : "info"}
                  />
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex gap-3">
              <AlertTriangle size={20} className="shrink-0 text-[#d98500]" />
              <div>
                <b className="text-sm">2 项物料可能短缺</b>
                <p className="mt-1 text-xs leading-5 text-[#667085]">
                  鸡胸肉缺口 80kg，青椒缺口 32kg。建议优先复核切配与组配任务。
                </p>
                <Link
                  href="/production/materials"
                  className="focus-ring mt-3 inline-flex items-center gap-1 rounded-md text-xs font-semibold text-[#0a68dc]"
                >
                  查看物料需求
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export function PlanDetailPage({ id }: { id: string }) {
  const wo = useNoraStore(
    (s) => s.workOrders.find((w) => w.id === id) ?? s.workOrders[0],
  );
  return (
    <>
      <PageHeader
        title={`生产计划 · ${wo.productName}`}
        metadata={`${wo.code} · ${wo.line} · ${wo.startAt}—${wo.endAt}`}
        actions={
          <Badge tone={workOrderStatus[wo.status].tone}>
            {workOrderStatus[wo.status].label}
          </Badge>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">工序进度</h2>
          <div className="mt-6 flex overflow-x-auto pb-2">
            {wo.operations.map((op, i) => (
              <div
                key={op.id}
                className="flex min-w-[150px] flex-1 items-center"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${op.status === "completed" ? "bg-[#08a879] text-white" : op.status === "in_progress" ? "bg-[#1768f2] text-white" : "bg-[#edf1f5] text-[#8d98aa]"}`}
                >
                  {op.status === "completed" ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="ml-3">
                  <b className="text-sm">{op.name}</b>
                  <p className="text-[11px] text-[#8994a8]">
                    {op.at ?? (op.status === "in_progress" ? "执行中" : "等待")}
                  </p>
                </div>
                {i < wo.operations.length - 1 && (
                  <div className="mx-3 h-px min-w-6 flex-1 bg-[#dce3ed]" />
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold">计划摘要</h2>
          <div className="mt-5 space-y-4 text-sm">
            <p className="flex justify-between">
              <span className="text-[#7a879c]">计划数量</span>
              <b>
                {formatNumber(wo.plannedQuantity)} {wo.unit}
              </b>
            </p>
            <p className="flex justify-between">
              <span className="text-[#7a879c]">已完成</span>
              <b>
                {formatNumber(wo.completedQuantity)} {wo.unit}
              </b>
            </p>
            <p className="flex justify-between">
              <span className="text-[#7a879c]">负责人</span>
              <b>{wo.owner}</b>
            </p>
            <Progress value={wo.progress} className="h-2" tone="success" />
          </div>
        </Card>
      </div>
    </>
  );
}

export function WorkOrdersPage() {
  const rows = useNoraStore((s) => s.workOrders);
  const transition = useNoraStore((s) => s.transitionWorkOrder);
  return (
    <>
      <PageHeader
        title="生产工单"
        metadata={<HelpTip title="工单说明">本页状态变更仅用于体验工单流程。</HelpTip>}
      />
      <Card className="overflow-hidden">
        <div className="flex gap-3 border-b border-[#e8edf3] p-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95a8]"
            />
            <input
              className={`${inputClass} pl-9`}
              placeholder="搜索工单、商品或负责人"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]">
              <tr>
                <th className="px-5 py-3">工单</th>
                <th className="px-5 py-3">商品与产线</th>
                <th className="px-5 py-3">计划数量</th>
                <th className="px-5 py-3">进度</th>
                <th className="px-5 py-3">负责人</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((wo) => (
                <tr key={wo.id} className="border-t border-[#edf0f4]">
                  <td className="px-5 py-4 font-mono text-xs font-semibold text-[#1768f2]">
                    {wo.code}
                  </td>
                  <td className="px-5 py-4">
                    <b>{wo.productName}</b>
                    <p className="text-xs text-[#8994a8]">
                      {wo.line} · {wo.startAt}–{wo.endAt}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    {formatNumber(wo.plannedQuantity)} {wo.unit}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Progress value={wo.progress} className="w-24" />
                      <span className="text-xs">{wo.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">{wo.owner}</td>
                  <td className="px-5 py-4">
                    <Badge tone={workOrderStatus[wo.status].tone}>
                      {workOrderStatus[wo.status].label}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    {wo.status === "released" ? (
                      <Button
                        size="sm"
                        onClick={() => transition(wo.id, "in_progress")}
                      >
                        <Play size={14} />
                        开工
                      </Button>
                    ) : wo.status === "completed" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => transition(wo.id, "closed")}
                      >
                        结案
                      </Button>
                    ) : (
                      <Link
                        href={`/mes/stations/${wo.id}`}
                        className="text-xs font-semibold text-[#1768f2]"
                      >
                        进入工位
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function RoutingsPage() {
  return (
    <>
      <PageHeader
        title="工艺路线"
        actions={
          <Button>
            <Plus size={16} />
            新建工艺路线
          </Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [
            "肉类前处理路线",
            ["来料复核", "低温解冻", "修整切配", "低温腌制", "分装贴标"],
          ],
          ["叶菜前处理路线", ["原料验收", "挑拣修整", "清洗沥水", "规格切配", "分装贴标"]],
          ["配菜包组配路线", ["分区备料", "规格复核", "称重组配", "分隔封装", "冷藏暂存"]],
        ].map(([name, steps], j) => (
          <Card key={name as string} className="p-5">
            <div className="flex items-center justify-between">
              <Route size={20} className="text-[#1768f2]" />
              <Badge tone={j === 0 ? "success" : "neutral"}>
                {j === 0 ? "使用中" : "已启用"}
              </Badge>
            </div>
            <h2 className="mt-3 font-semibold">{name as string}</h2>
            <div className="mt-5 space-y-3">
              {(steps as string[]).map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf4ff] text-xs font-semibold text-[#1768f2]">
                    {i + 1}
                  </span>
                  <span className="text-sm">{s}</span>
                  <span className="ml-auto text-[11px] text-[#8a95a8]">
                    {12 + i * 4} min
                  </span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function MaterialsPage() {
  return (
    <>
      <PageHeader
        title="物料需求与领料"
        metadata={<HelpTip title="物料需求说明">当前需求和库存用于体验物料核对，不会生成正式领料单。</HelpTip>}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <SectionTitle
            title="今日物料需求"
            description="DEMO-PD-018 · 深圳中央工厂"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]">
                <tr>
                  <th className="px-5 py-3">物料</th>
                  <th className="px-5 py-3">毛料需求</th>
                  <th className="px-5 py-3">可用库存</th>
                  <th className="px-5 py-3">缺口</th>
                  <th className="px-5 py-3">建议</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["冷冻鸡胸肉", 380, 300, 80],
                  ["花生米", 92, 150, 0],
                  ["干辣椒段", 34, 68, 0],
                  ["青椒", 126, 94, 32],
                  ["标准餐盒套装", 3200, 3600, 0],
                ].map(([name, need, stock, gap]) => (
                  <tr
                    key={name as string}
                    className="border-t border-[#edf0f4]"
                  >
                    <td className="px-5 py-4 font-medium">{name as string}</td>
                    <td className="px-5 py-4">{need as number} kg</td>
                    <td className="px-5 py-4">{stock as number} kg</td>
                    <td
                      className={`px-5 py-4 font-semibold ${gap ? "text-[#e54b4b]" : "text-[#08a879]"}`}
                    >
                      {gap ? `${gap} kg` : "充足"}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={gap ? "warning" : "success"}>
                        {gap ? "建议采购" : "可领料"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <Layers3 className="text-[#1768f2]" />
          <div className="mt-3 flex items-center gap-1"><h2 className="font-semibold">需求汇总</h2><HelpTip title="汇总口径">按 4 张已审核订单、3 个成品配方聚合，毛料需求已包含出成率损耗。</HelpTip></div>
          <div className="mt-5 rounded-xl bg-[#f5f7fa] p-4 text-sm">
            <p className="flex justify-between">
              <span>净需求</span>
              <b>3,824 kg</b>
            </p>
            <p className="mt-3 flex justify-between">
              <span>损耗增量</span>
              <b>186 kg</b>
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}

export function OutputPage() {
  const completed = useNoraStore(
    useShallow((s) =>
      s.workOrders.filter((w) => ["completed", "closed"].includes(w.status)),
    ),
  );
  return (
    <>
      <PageHeader title="产出与完工" metadata={<HelpTip title="产出说明">当前记录用于体验完工查看，不会写入正式库存或质量记录。</HelpTip>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold">今日产出记录</h2>
          <div className="mt-4 space-y-3">
            {completed.map((wo) => (
              <div
                key={wo.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-[#e6ebf2] p-4"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f8f2] text-[#08a879]">
                  <PackageCheck size={19} />
                </span>
                <div className="flex-1">
                  <b>{wo.productName}</b>
                  <p className="text-xs text-[#8591a4]">
                    DEMO-PL-{wo.id.slice(-3)} · {wo.code}
                  </p>
                </div>
                <b>
                  {formatNumber(wo.completedQuantity)} {wo.unit}
                </b>
                <Badge tone="success">质检合格</Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <ShieldCheck size={21} className="text-[#08a879]" />
          <h2 className="mt-3 font-semibold">记录状态</h2>
          <div className="mt-4 space-y-3">
            {[
              "产出数量已记录",
              "批次信息已记录",
              "质量结果已记录",
            ].map((x) => (
              <p key={x} className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={15} className="text-[#08a879]" />
                {x}
              </p>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
