"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Pause, Play, QrCode, ScanLine, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, Modal, Progress } from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { formatNumber, workOrderStatus } from "@/lib/utils";

const exceptionTypes = ["设备故障", "物料异常", "质量异常", "人员安全"] as const;

export function MesQueuePage() {
  const orders = useNoraStore((state) => state.workOrders);
  const firstOrder = orders.find((workOrder) => workOrder.status !== "closed");

  return <>
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-[-0.035em] text-[#101828]">净配工位</h1>
    </div>
    {firstOrder ? <Link href={`/mes/stations/${firstOrder.id}`} className="focus-ring mb-5 flex h-20 w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#9bb9e5] bg-[#edf5ff] text-lg font-semibold text-[#0a68dc] hover:border-[#6d9ee6] hover:bg-[#e7f1ff] active:bg-[#deebfc]"><QrCode size={26} />扫码进入首个工单</Link> : null}
    <div className="grid gap-4 md:grid-cols-2">
      {orders.filter((workOrder) => workOrder.status !== "closed").map((workOrder) => <Link key={workOrder.id} href={`/mes/stations/${workOrder.id}`} className="focus-ring rounded-2xl"><Card className="h-full p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#a9c5ef] hover:shadow-[0_12px_30px_rgba(37,67,105,.08)]"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="font-mono text-xs font-semibold text-[#0a68dc]">{workOrder.code}</p><h2 className="mt-2 truncate text-xl font-semibold tracking-[-0.025em] text-[#101828]">{workOrder.productName}</h2></div><Badge tone={workOrderStatus[workOrder.status].tone}>{workOrderStatus[workOrder.status].label}</Badge></div><div className="mt-5 grid grid-cols-3 gap-3 rounded-xl bg-[#f4f7fa] p-4"><div><span className="text-xs text-[#667085]">计划数量</span><b className="mt-1 block tabular-nums">{formatNumber(workOrder.plannedQuantity)} {workOrder.unit}</b></div><div><span className="text-xs text-[#667085]">计划时间</span><b className="mt-1 block tabular-nums">{workOrder.startAt}</b></div><div><span className="text-xs text-[#667085]">优先级</span><b className={`mt-1 block ${workOrder.priority === "high" ? "text-[#d94545]" : ""}`}>{workOrder.priority === "high" ? "紧急" : "正常"}</b></div></div><Progress value={workOrder.progress} className="mt-5 h-2" tone={workOrder.progress === 100 ? "success" : "info"} /><div className="mt-2 flex justify-between text-xs text-[#667085]"><span>{workOrder.line}</span><span className="tabular-nums">{workOrder.progress}%</span></div></Card></Link>)}
    </div>
  </>;
}

export function MesStationPage({ id }: { id: string }) {
  const workOrder = useNoraStore((state) => state.workOrders.find((item) => item.id === id) ?? state.workOrders[0]);
  const transition = useNoraStore((state) => state.transitionWorkOrder);
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [selectedException, setSelectedException] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [reported, setReported] = useState(false);
  const [qualitySaved, setQualitySaved] = useState(false);
  if (!workOrder) return null;
  const status = workOrderStatus[workOrder.status];

  const changeStatus = (nextStatus: "in_progress" | "paused" | "completed") => transition(workOrder.id, nextStatus);
  const openException = () => {
    setSelectedException(null);
    setExceptionOpen(true);
  };
  const confirmException = () => {
    if (!selectedException) return;
    setExceptionOpen(false);
    setReported(true);
  };

  return <>
    {reported && <div role="status" className="mb-4 flex items-center justify-between gap-4 rounded-[14px] border border-[#b9e5d7] bg-[#eefaf6] px-4 py-3 text-sm text-[#08775b]"><span className="flex items-center gap-2 font-medium"><CheckCircle2 size={17} />{selectedException}已记录</span><button onClick={() => setReported(false)} className="focus-ring rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/70">关闭</button></div>}

    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div><p className="font-mono text-sm font-semibold text-[#0a68dc]">{workOrder.code}</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#101828]">{workOrder.productName}</h1><p className="mt-1 text-sm text-[#667085]">{workOrder.line} · 负责人 {workOrder.owner}</p></div>
      <Badge tone={status.tone} className="px-4 py-2 text-sm">{status.label}</Badge>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#1d2939]">当前任务</h2><span className="text-sm tabular-nums text-[#667085]">{workOrder.startAt}—{workOrder.endAt}</span></div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-[#edf4ff] p-4 sm:p-5"><span className="text-xs text-[#56749e]">计划数量</span><b className="mt-1 block text-2xl tabular-nums text-[#154d9e]">{formatNumber(workOrder.plannedQuantity)}</b><span className="text-xs">{workOrder.unit}</span></div>
            <div className="rounded-2xl bg-[#e9f8f3] p-4 sm:p-5"><span className="text-xs text-[#527d70]">已完成</span><b className="mt-1 block text-2xl tabular-nums text-[#08775b]">{formatNumber(workOrder.completedQuantity)}</b><span className="text-xs">{workOrder.unit}</span></div>
            <div className="rounded-2xl bg-[#fff4df] p-4 sm:p-5"><span className="text-xs text-[#846a42]">完成率</span><b className="mt-1 block text-2xl tabular-nums text-[#a96600]">{workOrder.progress}%</b></div>
          </div>
          <Progress value={workOrder.progress} className="mt-5 h-3" tone="success" />
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1d2939]">工序步骤</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {workOrder.operations.map((operation, index) => <div key={operation.id} className={`flex items-center gap-4 rounded-2xl border p-4 ${operation.status === "in_progress" ? "border-[#7eaff7] bg-[#f1f6ff] shadow-[0_0_0_3px_rgba(23,104,242,.05)]" : "border-[#e0e6ee] bg-white"}`}><span className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold ${operation.status === "completed" ? "bg-[#08a879] text-white" : operation.status === "in_progress" ? "bg-[#0a68dc] text-white" : "bg-[#edf1f5] text-[#667085]"}`}>{operation.status === "completed" ? <CheckCircle2 size={21} /> : index + 1}</span><div><b className="text-[#1d2939]">{operation.name}</b><p className="text-xs text-[#667085]">{operation.status === "completed" ? `${operation.at ?? "已完成"}` : operation.status === "in_progress" ? "正在执行" : "等待前序完成"}</p></div></div>)}
          </div>
        </Card>

        <div className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-4 gap-2 rounded-[22px] border border-white/70 bg-white/90 p-2 shadow-[0_18px_50px_rgba(22,43,72,.2)] backdrop-blur-xl sm:static sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
          <button onClick={() => changeStatus("in_progress")} disabled={workOrder.status === "in_progress" || workOrder.status === "completed"} className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-[#0a68dc] text-xs font-semibold text-white disabled:opacity-40 sm:min-h-24 sm:gap-2 sm:rounded-2xl sm:text-lg"><Play size={24} />开始</button>
          <button onClick={() => changeStatus("paused")} disabled={workOrder.status !== "in_progress"} className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-[#e99a25] text-xs font-semibold text-white disabled:opacity-40 sm:min-h-24 sm:gap-2 sm:rounded-2xl sm:text-lg"><Pause size={24} />暂停</button>
          <button onClick={() => changeStatus("completed")} disabled={workOrder.status === "completed" || workOrder.status === "closed"} className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-[#08a879] text-xs font-semibold text-white disabled:opacity-40 sm:min-h-24 sm:gap-2 sm:rounded-2xl sm:text-lg"><CheckCircle2 size={24} />完成</button>
          <button onClick={openException} className="focus-ring flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-[14px] bg-[#e5484d] text-xs font-semibold text-white sm:min-h-24 sm:gap-2 sm:rounded-2xl sm:text-lg"><AlertTriangle size={24} />异常</button>
        </div>
      </div>

      <div className="space-y-5">
        <Card className="p-5"><h2 className="font-semibold text-[#1d2939]">扫码投料</h2><button onClick={() => setScanComplete(true)} className="focus-ring mt-4 flex h-32 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#9ebbe5] bg-[#edf5ff] text-[#0a68dc] hover:border-[#6d9ee6] hover:bg-[#e7f1ff]"><ScanLine size={34} /><b>扫描物料批次</b></button>{scanComplete && <div role="status" className="mt-3 rounded-xl bg-[#e9f8f3] p-4"><p className="flex items-center gap-2 font-semibold text-[#08785b]"><CheckCircle2 size={17} />物料批次已识别</p><p className="mt-1 text-xs leading-5 text-[#4d7468]">冷冻鸡胸肉 · DEMO-BATCH-028 · 120.000kg</p></div>}</Card>
        <Card className="p-5"><h2 className="font-semibold text-[#1d2939]">现场质量</h2><div className="mt-4 space-y-3">{[["中心温度", "3.2°C"], ["外观检查", "合格"], ["净含量", "502g"]].map(([label, value]) => <div key={label} className="flex justify-between rounded-xl bg-[#f5f7fa] p-3 text-sm"><span className="text-[#667085]">{label}</span><b className="tabular-nums">{value}</b></div>)}</div><Button variant="secondary" className="mt-4 w-full" onClick={() => setQualitySaved(true)}><ClipboardCheck size={16} />记录质检结果</Button>{qualitySaved ? <p role="status" className="mt-3 text-xs font-medium text-[#08775b]">质检结果已记录。</p> : null}</Card>
      </div>
    </div>

    <Modal open={exceptionOpen} onOpenChange={setExceptionOpen} title="记录异常" footer={<><Button variant="secondary" onClick={() => setExceptionOpen(false)}>取消</Button><Button variant="danger" disabled={!selectedException} onClick={confirmException}>确认记录</Button></>}>
      <div role="radiogroup" aria-label="异常类型" className="grid grid-cols-2 gap-3">
        {exceptionTypes.map((type) => <button key={type} role="radio" aria-checked={selectedException === type} onClick={() => setSelectedException(type)} className={`focus-ring rounded-xl border p-4 text-left text-sm font-medium transition ${selectedException === type ? "border-[#e5484d] bg-[#fff3f3] text-[#b4232a] shadow-[0_0_0_3px_rgba(229,72,77,.08)]" : "border-[#dfe5ed] hover:border-[#e28a8d] hover:bg-[#fff8f8]"}`}><TriangleAlert size={20} className="mb-3 text-[#e5484d]" />{type}</button>)}
      </div>
    </Modal>
  </>;
}
