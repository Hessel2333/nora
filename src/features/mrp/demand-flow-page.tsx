"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  GitBranch,
  Scale,
  ShoppingCart,
  Workflow,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  PageHeader,
  SectionTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { DemandMaterialInspector, DemandPivotTable } from "./mrp-components";
import {
  createDemandWorkspace,
  DATE_SCENARIOS,
  formatMrpNumber,
} from "./mrp-data";

const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[590px] items-center justify-center text-sm text-[#8792a6]">
      正在生成需求流向…
    </div>
  ),
});

export function DemandFlowPage() {
  const [dateId, setDateId] = useState(DATE_SCENARIOS[0].id);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    "raw-chicken",
  );
  const workspace = useMemo(() => createDemandWorkspace(dateId), [dateId]);
  const selectedMaterial =
    workspace.materials.find((item) => item.id === selectedMaterialId) ?? null;
  const activeNames = useMemo(() => {
    if (!selectedMaterial) return new Set<string>();
    const result = new Set([selectedMaterial.name]);
    let changed = true;
    while (changed) {
      changed = false;
      workspace.sankeyLinks.forEach((link) => {
        if (result.has(link.target) && !result.has(link.source)) {
          result.add(link.source);
          changed = true;
        }
      });
    }
    return result;
  }, [selectedMaterial, workspace.sankeyLinks]);

  const chartOption = useMemo(
    () => ({
      animationDuration: 420,
      animationDurationUpdate: 260,
      aria: {
        enabled: true,
        decal: { show: false },
        description: `${workspace.scenario.label}订单从菜品、半成品到原料的标准化毛重需求流向。`,
      },
      tooltip: {
        trigger: "item",
        confine: true,
        borderColor: "#dfe5ed",
        backgroundColor: "rgba(255,255,255,.98)",
        textStyle: { color: "#263451", fontSize: 12 },
        formatter: (params: {
          dataType?: string;
          name?: string;
          value?: number;
          data?: { source?: string; target?: string; value?: number };
        }) => {
          if (
            params.dataType === "edge" &&
            params.data?.source &&
            params.data?.target
          )
            return `<b>${params.data.source} → ${params.data.target}</b><br/>标准化毛重：${formatMrpNumber(params.data.value ?? 0)} kg`;
          return `<b>${params.name ?? ""}</b><br/>点击后在右侧和表格中定位`;
        },
      },
      series: [
        {
          type: "sankey",
          left: 24,
          right: 154,
          top: 32,
          bottom: 24,
          nodeWidth: 12,
          nodeGap: 14,
          nodeAlign: "justify",
          draggable: false,
          layoutIterations: 48,
          emphasis: { focus: "adjacency" },
          select: { itemStyle: { borderColor: "#17213d", borderWidth: 2 } },
          label: {
            color: "#43516b",
            fontSize: 11,
            distance: 8,
            formatter: "{b}",
          },
          itemStyle: { borderColor: "#fff", borderWidth: 1, borderRadius: 4 },
          lineStyle: {
            color: "gradient",
            curveness: 0.52,
            opacity: selectedMaterial ? 0.08 : 0.23,
          },
          data: workspace.sankeyNodes.map((node) => ({
            ...node,
            selected: node.name === selectedMaterial?.name,
            itemStyle: {
              ...node.itemStyle,
              borderColor:
                node.name === selectedMaterial?.name ? "#17213d" : "#ffffff",
              borderWidth: node.name === selectedMaterial?.name ? 2 : 1,
            },
          })),
          links: workspace.sankeyLinks.map((link) => ({
            ...link,
            lineStyle: {
              opacity: selectedMaterial
                ? activeNames.has(link.source) && activeNames.has(link.target)
                  ? 0.58
                  : 0.055
                : 0.23,
              color:
                activeNames.has(link.source) && activeNames.has(link.target)
                  ? "#1768f2"
                  : "gradient",
            },
          })),
        },
      ],
    }),
    [activeNames, selectedMaterial, workspace],
  );

  const chartEvents = useMemo(
    () => ({
      click: (params: { name?: string }) => {
        if (!params.name) return;
        const materialId = workspace.nameToMaterialId[params.name];
        if (materialId) setSelectedMaterialId(materialId);
      },
    }),
    [workspace.nameToMaterialId],
  );

  return (
    <>
      <PageHeader
        title="日期需求流向"
        actions={
          <>
            <ButtonLink
              href="/production/material-explosion"
              variant="secondary"
            >
              <GitBranch size={16} />
              返回订单拆解
            </ButtonLink>
            <Button>
              <ShoppingCart size={16} />
              生成采购建议
            </Button>
          </>
        }
      />

      <Card className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4ff] text-[#1768f2]">
              <Workflow size={19} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8390a5]">
                当前汇总结论
              </p>
              <h2 className="mt-1 text-base font-semibold tracking-[-0.02em] text-[#182342]">
                {workspace.scenario.label}有 {workspace.summary.shortageKinds}{" "}
                项物料短缺，预计补货 ¥
                {formatMrpNumber(workspace.summary.purchaseAmount, 2)}
              </h2>
              <p className="mt-1 text-xs text-[#748099]">
                流向图只比较 kg 毛重；包材等非重量物料完整保留在下方透视表。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 rounded-[10px] border border-[#dfe5ed] bg-[#f6f8fb] p-1">
            {DATE_SCENARIOS.map((date) => (
              <button
                key={date.id}
                onClick={() => {
                  setDateId(date.id);
                  setSelectedMaterialId("raw-chicken");
                }}
                className={cn(
                  "focus-ring rounded-[8px] px-4 py-2 text-left transition",
                  dateId === date.id
                    ? "bg-white text-[#1768f2] shadow-sm"
                    : "text-[#68758d] hover:bg-white/70",
                )}
              >
                <b className="block text-xs">{date.label}</b>
                <span className="text-[9px]">
                  {date.weekday} · {date.orderCount}单
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid border-t border-[#e8edf3] sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCell
            icon={CalendarDays}
            label="生产日期"
            value={`${workspace.scenario.label} ${workspace.scenario.weekday}`}
          />
          <SummaryCell
            icon={ShoppingCart}
            label="订单规模"
            value={`${workspace.scenario.orderCount} 单 / ${formatMrpNumber(workspace.scenario.portions, 0)} 份`}
          />
          <SummaryCell
            icon={Scale}
            label="毛料需求"
            value={`${formatMrpNumber(workspace.summary.grossKg)} kg`}
          />
          <SummaryCell
            icon={AlertTriangle}
            label="重量缺口"
            value={`${formatMrpNumber(workspace.summary.shortageKg)} kg`}
            danger
          />
          <SummaryCell
            icon={CircleDollarSign}
            label="采购建议金额"
            value={`¥${formatMrpNumber(workspace.summary.purchaseAmount, 2)}`}
          />
        </div>
      </Card>

      <Card className="mb-4 overflow-hidden">
        <SectionTitle
          title="订单到原料的需求流向"
          description="边宽 = 标准化毛重 kg；点击最右侧原料查看贡献路径"
          action={
            <div className="flex gap-2">
              <Badge tone="info">重量口径</Badge>
              <Badge tone="neutral">
                {workspace.scenario.orderCount} 张订单聚合
              </Badge>
            </div>
          }
        />
        <div className="grid min-h-[590px] xl:grid-cols-[minmax(0,1fr)_286px]">
          <div className="min-w-0 border-b border-[#e8edf3] bg-[#fbfcfe] xl:border-b-0 xl:border-r">
            <ReactECharts
              option={chartOption}
              onEvents={chartEvents}
              notMerge
              lazyUpdate
              style={{ height: 590, width: "100%" }}
            />
          </div>
          <aside className="bg-white">
            <DemandMaterialInspector material={selectedMaterial} />
          </aside>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <SectionTitle
          title="物料需求透视"
          action={<span className="inline-flex items-center gap-1"><Badge tone="success">图表联动</Badge><HelpTip title="透视说明">可按原料或净菜产品来源展开，并保留原始单位和计算路径。</HelpTip></span>}
        />
        <DemandPivotTable
          materials={workspace.materials}
          selectedMaterialId={selectedMaterialId}
          onSelect={setSelectedMaterialId}
        />
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#e3e8f0] bg-white px-4 py-3 text-xs text-[#63718a]">
        <HelpTip title="查看范围">当前页面按日期聚合；如需核查单个订单的计算来源，请查看订单级拆解。</HelpTip>
        <Link
          href="/production/material-explosion"
          className="inline-flex items-center gap-1 font-semibold text-[#1768f2]"
        >
          <ArrowLeft size={13} />
          查看订单级拆解
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
  icon: typeof CalendarDays;
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
