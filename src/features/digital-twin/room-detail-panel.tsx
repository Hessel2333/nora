import Link from "next/link";
import { AlertTriangle, ChartNoAxesCombined, Clock3, Focus, Minimize2, Radio, ThermometerSun, UserRound, Waves, Wrench } from "lucide-react";
import { Badge, Button, Card, IconBox, Progress } from "@/components/ui";
import { zoneStatus } from "@/lib/utils";
import type { FactoryRoomSnapshot } from "./room-monitoring";
import { getRoomOperationsProfile } from "./room-operations";

function TaskSummary({ room }: { room: FactoryRoomSnapshot }) {
  if (!room.task) return <div className="rounded-xl border border-dashed border-[#dfe5ee] bg-[#fafbfd] px-3 py-4 text-center text-xs text-[#8793a7]">当前暂无生产任务</div>;

  return <div className="rounded-xl border border-[#e4e9f1] p-3">
    <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-semibold text-[#52617b]">{room.task.code}</span><Badge tone={room.task.tone}>{room.task.statusLabel}</Badge></div>
    <h3 className="mt-2 text-sm font-semibold leading-5 text-[#283754]">{room.task.name}</h3>
    <Progress value={room.task.progress} tone={room.task.tone} className="mt-3" />
    <div className="mt-2 flex items-center justify-between text-[11px] text-[#7f8a9e]"><span>{room.task.quantity ?? "任务进度"}</span><strong className="text-[#35435f]">{room.task.progress}%</strong></div>
    {room.task.eta ? <div className="mt-3 flex items-center gap-2 border-t border-[#edf0f4] pt-3 text-[11px] text-[#6f7d94]"><Clock3 size={14} className="text-[#1768f2]" /><span>预计完成</span><strong className="ml-auto text-[#34425e]">{room.task.eta}</strong></div> : null}
  </div>;
}

function EnvironmentSummary({ room }: { room: FactoryRoomSnapshot }) {
  return <div className="grid grid-cols-2 gap-2">
    <div className="rounded-xl bg-[#f7f9fc] p-3"><ThermometerSun size={16} className="text-[#1768f2]" /><strong className="mt-2 block text-lg text-[#273553]">{room.temperature}</strong><span className="text-[10px] text-[#8a95a8]">温度</span></div>
    <div className="rounded-xl bg-[#f7f9fc] p-3"><Waves size={16} className="text-[#08a879]" /><strong className="mt-2 block text-lg text-[#273553]">{room.humidity}</strong><span className="text-[10px] text-[#8a95a8]">湿度</span></div>
  </div>;
}

export function RoomDetailPanel({ room, focused, onToggleFocus, onOpenMonitor }: {
  room: FactoryRoomSnapshot;
  focused: boolean;
  onToggleFocus: () => void;
  onOpenMonitor: () => void;
}) {
  const status = zoneStatus[room.status];
  const operations = getRoomOperationsProfile(room);
  const showOperationsSummary = room.primaryMetric !== "task" && room.primaryMetric !== "environment";

  return (
    <Card className="h-fit overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[#e8edf3] p-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.08em] text-[#7c89a0]">{room.id}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          <h2 className="truncate text-lg font-semibold text-[#192440]">{room.name}</h2>
        </div>
        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-[#08a879]"><Radio size={12} />{room.updatedAt}</span>
      </div>

      <div className="space-y-4 p-4">
        {room.alert ? (
          <div className="flex gap-3 rounded-xl border border-[#f4d69a] bg-[#fff8e8] p-3">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[#d98200]" />
            <div><p className="text-xs font-semibold text-[#9b5f00]">{room.alert.title}</p><p className="mt-1 text-[11px] leading-5 text-[#9b7440]">{room.alert.detail}</p></div>
          </div>
        ) : null}

        {room.primaryMetric === "environment" ? <div><p className="mb-2 text-xs font-semibold text-[#53617b]">环境监测</p><EnvironmentSummary room={room} /></div> : null}

        {showOperationsSummary ? <div>
          <p className="mb-2 text-xs font-semibold text-[#53617b]">{operations.summaryTitle}</p>
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-[#e4e9f1] bg-white p-2">
            {operations.metrics.map((metric, index) => <div key={metric.label} className={index === 0 ? "col-span-2 rounded-lg bg-[#edf4ff] p-3" : "rounded-lg bg-[#f7f9fc] p-3"}><span className="block text-[10px] text-[#7f8ca1]">{metric.label}</span><strong className="mt-1 block truncate text-sm text-[#263653]">{metric.value}</strong><span className="mt-1 block truncate text-[10px] text-[#929cad]">{metric.detail}</span></div>)}
          </div>
        </div> : null}

        {room.primaryMetric === "task" || room.task ? <div><p className="mb-2 text-xs font-semibold text-[#53617b]">当前任务</p><TaskSummary room={room} /></div> : null}

        {room.primaryMetric !== "environment" ? <div><p className="mb-2 text-xs font-semibold text-[#53617b]">环境概览</p><EnvironmentSummary room={room} /></div> : null}

        <div>
          <p className="mb-2 text-xs font-semibold text-[#53617b]">区域信息</p>
          <div className="space-y-3 rounded-xl bg-[#f8fafc] p-3">
            <div className="flex items-center gap-3"><IconBox icon={UserRound} tone="neutral" size="sm" /><div><span className="block text-[10px] text-[#8b96a8]">负责人</span><strong className="text-xs text-[#34425e]">{room.owner}</strong></div></div>
            <div className="flex items-center gap-3"><IconBox icon={Wrench} tone="neutral" size="sm" /><div><span className="block text-[10px] text-[#8b96a8]">主要设备</span><strong className="text-xs leading-5 text-[#34425e]">{room.equipment}</strong></div></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={onOpenMonitor}><ChartNoAxesCombined size={15} />运行详情</Button>
          <Button variant="secondary" size="sm" onClick={onToggleFocus}>{focused ? <Minimize2 size={15} /> : <Focus size={15} />}{focused ? "返回总览" : "聚焦房间"}</Button>
          {room.task?.workOrderId ? <Link href="/production/work-orders" className="focus-ring col-span-2 inline-flex h-8 items-center justify-center rounded-[9px] border border-[#dce3ed] bg-white px-3 text-xs font-medium text-[#263557] hover:bg-[#f6f8fb]">查看工单</Link> : null}
        </div>
      </div>
    </Card>
  );
}
