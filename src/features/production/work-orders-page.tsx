"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Play, Plus, Search, UserRound } from "lucide-react";
import { Badge, Button, Card, PageHeader, Progress, inputClass } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { formatNumber, workOrderStatus } from "@/lib/utils";

export function WorkOrdersPage() {
  const workOrders = useNoraStore((state) => state.workOrders);
  const transition = useNoraStore((state) => state.transitionWorkOrder);
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => workOrders.filter((workOrder) => `${workOrder.code}${workOrder.productName}${workOrder.owner}${workOrder.line}`.includes(query)),
    [query, workOrders],
  );

  const renderAction = (workOrder: (typeof workOrders)[number], mobile = false) => {
    if (workOrder.status === "released") return <Button size="sm" className={mobile ? "w-full" : undefined} onClick={() => transition(workOrder.id, "in_progress")}><Play size={14} />开工</Button>;
    if (workOrder.status === "completed") return <Button size="sm" className={mobile ? "w-full" : undefined} variant="secondary" onClick={() => transition(workOrder.id, "closed")}>结案</Button>;
    return <Link href={`/mes/stations/${workOrder.id}`} className={`focus-ring inline-flex items-center justify-center gap-1 rounded-[9px] text-xs font-semibold text-[#1768f2] ${mobile ? "h-9 w-full border border-[#cbdaf1] bg-white" : ""}`}>进入工位<ArrowRight size={13} /></Link>;
  };

  return <>
    <PageHeader title="生产工单" actions={<Button><Plus size={16} />下达工单</Button>} />
    <Card className="overflow-hidden">
      <div className="border-b border-[#e8edf3] p-3 sm:p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95a8]" />
          <input aria-label="搜索生产工单" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9`} placeholder="搜索工单、商品或负责人" />
        </div>
      </div>

      <div className="divide-y divide-[#edf0f4] md:hidden">
        {rows.map((workOrder) => <article key={workOrder.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold text-[#1768f2]">{workOrder.code}</p>
              <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.02em] text-[#1d2939]">{workOrder.productName}</h2>
              <p className="mt-1 text-xs text-[#667085]">{workOrder.line} · {workOrder.startAt}—{workOrder.endAt}</p>
            </div>
            <Badge tone={workOrderStatus[workOrder.status].tone}>{workOrderStatus[workOrder.status].label}</Badge>
          </div>
          <div className="mt-4 rounded-xl bg-[#f6f8fb] p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#667085]"><UserRound size={14} />{workOrder.owner}</span>
              <span className="tabular-nums font-medium text-[#344054]">{formatNumber(workOrder.completedQuantity)} / {formatNumber(workOrder.plannedQuantity)} {workOrder.unit}</span>
            </div>
            <div className="mt-3 flex items-center gap-3"><Progress value={workOrder.progress} className="h-2 flex-1" tone={workOrder.progress === 100 ? "success" : "info"} /><strong className="w-9 text-right text-xs tabular-nums text-[#344054]">{workOrder.progress}%</strong></div>
          </div>
          <div className="mt-3">{renderAction(workOrder, true)}</div>
        </article>)}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]"><tr><th className="px-5 py-3">工单</th><th className="px-5 py-3">商品与产线</th><th className="px-5 py-3">计划数量</th><th className="px-5 py-3">进度</th><th className="px-5 py-3">负责人</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">操作</th></tr></thead>
          <tbody>{rows.map((workOrder) => <tr key={workOrder.id} className="border-t border-[#edf0f4] transition hover:bg-[#fbfcfe]">
            <td className="px-5 py-4 font-mono text-xs font-semibold text-[#1768f2]">{workOrder.code}</td>
            <td className="px-5 py-4"><b>{workOrder.productName}</b><p className="text-xs text-[#8994a8]">{workOrder.line} · {workOrder.startAt}–{workOrder.endAt}</p></td>
            <td className="px-5 py-4 tabular-nums">{formatNumber(workOrder.plannedQuantity)} {workOrder.unit}</td>
            <td className="px-5 py-4"><div className="flex items-center gap-2"><Progress value={workOrder.progress} className="w-24" tone={workOrder.progress === 100 ? "success" : "info"} /><span className="text-xs tabular-nums">{workOrder.progress}%</span></div></td>
            <td className="px-5 py-4">{workOrder.owner}</td>
            <td className="px-5 py-4"><Badge tone={workOrderStatus[workOrder.status].tone}>{workOrderStatus[workOrder.status].label}</Badge></td>
            <td className="px-5 py-4">{renderAction(workOrder)}</td>
          </tr>)}</tbody>
        </table>
      </div>

      {rows.length === 0 && <div className="px-5 py-12 text-center"><Search className="mx-auto text-[#b8c1cf]" /><p className="mt-3 font-medium text-[#344054]">没有匹配的工单</p><p className="mt-1 text-sm text-[#98a2b3]">请调整搜索关键词</p></div>}
    </Card>
  </>;
}
