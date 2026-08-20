"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  GitBranch,
  PackageOpen,
  Scale,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  ButtonLink,
  Card,
  PageHeader,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import {
  BomBreakdownTable,
  BomGraphCanvas,
  GraphNodeInspector,
} from "./mrp-components";
import {
  createOrderWorkspace,
  formatMrpNumber,
  ORDER_SCENARIOS,
} from "./mrp-data";

export function OrderExplosionPage() {
  const [orderId, setOrderId] = useState(ORDER_SCENARIOS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    "raw-chicken",
  );
  const workspace = useMemo(() => createOrderWorkspace(orderId), [orderId]);
  const selectedNode =
    workspace.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const incomingEdges = workspace.edges.filter(
    (edge) => edge.target === selectedNodeId,
  );
  const outgoingEdges = workspace.edges.filter(
    (edge) => edge.source === selectedNodeId,
  );

  return (
    <>
      <PageHeader
        title="订单物料拆解"
        metadata={<HelpTip title="拆解说明">当前场景用于体验多级配方与缺料分析，不会生成正式生产需求。</HelpTip>}
        actions={
          <ButtonLink href="/production/demand-flow" variant="secondary">
            <Workflow size={16} />
            查看日期需求流向
          </ButtonLink>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-[#1768f2]">
              <GitBranch size={19} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8390a5]">
                当前拆解结论
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#182342]">
                该订单需要 {formatMrpNumber(workspace.summary.grossKg)} kg
                毛料，其中缺口 {formatMrpNumber(workspace.summary.shortageKg)}{" "}
                kg
              </h2>
              <p className="mt-1 text-xs text-[#748099]">
                共享调味基料只计算一次库存，但在每条 BOM 路径中保留来源。
              </p>
            </div>
          </div>
          <label className="block min-w-[300px]">
            <span className="mb-1 block text-[10px] font-semibold text-[#7d899e]">
              选择销售订单
            </span>
            <select
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setSelectedNodeId("raw-chicken");
              }}
              className={inputClass}
            >
              {ORDER_SCENARIOS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.customer}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid border-t border-[#e8edf3] sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCell
            icon={PackageOpen}
            label="订单数量"
            value={`${formatMrpNumber(workspace.summary.portions, 0)} 份`}
          />
          <SummaryCell
            icon={Boxes}
            label="原料种类"
            value={`${workspace.summary.rawMaterialKinds} 种`}
          />
          <SummaryCell
            icon={Scale}
            label="毛料需求"
            value={`${formatMrpNumber(workspace.summary.grossKg)} kg`}
          />
          <SummaryCell
            icon={AlertTriangle}
            label="库存缺口"
            value={`${formatMrpNumber(workspace.summary.shortageKg)} kg`}
            danger
          />
          <SummaryCell
            icon={CircleDollarSign}
            label="预计材料成本"
            value={`¥${formatMrpNumber(workspace.summary.estimatedCost, 2)}`}
          />
        </div>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <SectionTitle
          title="可视化拆解路径"
          description={`${workspace.scenario.demandNo} · 选择节点可追踪完整上下游`}
          action={
            <div className="flex items-center gap-2">
              <Badge tone="info">线宽仅比较同层规模</Badge>
              <Badge tone="neutral">BOM 已生效</Badge>
            </div>
          }
        />
        <div className="grid min-h-[660px] xl:grid-cols-[minmax(0,1fr)_286px]">
          <div className="min-w-0 border-b border-[#e8edf3] xl:border-b-0 xl:border-r">
            <BomGraphCanvas
              nodes={workspace.nodes}
              edges={workspace.edges}
              selectedId={selectedNodeId}
              onSelect={setSelectedNodeId}
            />
          </div>
          <aside className="bg-white">
            <GraphNodeInspector
              node={selectedNode}
              incomingEdges={incomingEdges}
              outgoingEdges={outgoingEdges}
            />
          </aside>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionTitle
          title="BOM 拆解明细"
          action={<Badge tone="success">图表联动</Badge>}
        />
        <BomBreakdownTable
          rows={workspace.rows}
          selectedEntityId={selectedNodeId}
          onSelect={setSelectedNodeId}
        />
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce6f5] bg-[#f6f9ff] px-4 py-3 text-xs text-[#63718a]">
        <HelpTip title="缺口计算">毛料需求按净用量和出成率计算；现有库存扣除已占用后，再计算本订单缺口。</HelpTip>
        <Link
          href="/production/demand-flow"
          className="inline-flex items-center gap-1 font-semibold text-[#1768f2]"
        >
          继续查看日期级汇总
          <ArrowRight size={13} />
        </Link>
      </div>
    </>
  );
}

function SummaryCell({
  icon: Icon,
  label,
  value,
  danger = false,
}: {
  icon: typeof PackageOpen;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-r border-[#edf0f4] px-4 py-3 sm:last:border-r-0 xl:border-b-0">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg ${danger ? "bg-[#ffeded] text-[#e24444]" : "bg-[#eef3f8] text-[#617089]"}`}
      >
        <Icon size={15} />
      </span>
      <span>
        <span className="block text-[10px] text-[#8792a6]">{label}</span>
        <b
          className={`mt-0.5 block text-sm ${danger ? "text-[#d83d3d]" : "text-[#263451]"}`}
        >
          {value}
        </b>
      </span>
    </div>
  );
}
