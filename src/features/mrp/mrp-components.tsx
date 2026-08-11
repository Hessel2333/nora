"use client";

import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CookingPot,
  Download,
  Eye,
  FileSpreadsheet,
  Layers3,
  PackageOpen,
  RotateCcw,
  Search,
  Warehouse,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Progress, inputClass } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  type BomGraphEdge,
  type BomGraphNode,
  type BomTableRow,
  type DemandMaterial,
  type MrpNodeType,
  flattenVisibleRows,
  formatMrpNumber,
  materialCoverage,
  materialShortage,
} from "./mrp-data";

const typeLabels: Record<MrpNodeType, string> = {
  order: "订单",
  dish: "菜品",
  semi: "半成品",
  raw: "原料",
};

const typeBadgeTone: Record<MrpNodeType, "info" | "purple" | "success" | "neutral"> = {
  order: "info",
  dish: "purple",
  semi: "success",
  raw: "neutral",
};

const typeIcon = {
  order: PackageOpen,
  dish: CookingPot,
  semi: Layers3,
  raw: Warehouse,
};

const nodeSurface: Record<MrpNodeType, string> = {
  order: "border-[#9cc0ff] bg-[#f4f8ff]",
  dish: "border-[#cfc8ff] bg-[#faf9ff]",
  semi: "border-[#9edac8] bg-[#f5fcf9]",
  raw: "border-[#dfe5ed] bg-white",
};

function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function relatedNodeIds(selectedId: string | null, edges: BomGraphEdge[]) {
  if (!selectedId) return new Set<string>();
  const result = new Set([selectedId]);
  const walk = (id: string, direction: "up" | "down") => {
    edges.forEach((edge) => {
      if (direction === "down" && edge.source === id && !result.has(edge.target)) {
        result.add(edge.target);
        walk(edge.target, direction);
      }
      if (direction === "up" && edge.target === id && !result.has(edge.source)) {
        result.add(edge.source);
        walk(edge.source, direction);
      }
    });
  };
  walk(selectedId, "up");
  walk(selectedId, "down");
  return result;
}

export function BomGraphCanvas({
  nodes,
  edges,
  selectedId,
  onSelect,
}: {
  nodes: BomGraphNode[];
  edges: BomGraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const yOffset = 56;
  const [zoom, setZoom] = useState(90);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const related = useMemo(() => relatedNodeIds(selectedId, edges), [selectedId, edges]);
  const activeEdges = useMemo(() => {
    if (!selectedId) return new Set<string>();
    return new Set(edges.filter((edge) => related.has(edge.source) && related.has(edge.target)).map((edge) => edge.id));
  }, [edges, related, selectedId]);

  return <div className="relative h-full min-h-[660px] overflow-hidden bg-[#fbfcfe]">
    <div className="absolute left-4 top-4 z-20 flex items-center gap-1 rounded-[10px] border border-[#dfe5ed] bg-white p-1 shadow-sm">
      <button aria-label="缩小" onClick={() => setZoom((value) => Math.max(70, value - 10))} className="focus-ring rounded-md p-1.5 text-[#65728a] hover:bg-[#f1f4f8]"><ZoomOut size={15} /></button>
      <span className="w-10 text-center text-[11px] font-medium text-[#66738a]">{zoom}%</span>
      <button aria-label="放大" onClick={() => setZoom((value) => Math.min(120, value + 10))} className="focus-ring rounded-md p-1.5 text-[#65728a] hover:bg-[#f1f4f8]"><ZoomIn size={15} /></button>
      <span className="mx-1 h-4 w-px bg-[#e4e9f0]" />
      <button aria-label="重置缩放" onClick={() => setZoom(90)} className="focus-ring rounded-md p-1.5 text-[#65728a] hover:bg-[#f1f4f8]"><RotateCcw size={14} /></button>
    </div>
    <div className="absolute right-4 top-4 z-20 hidden items-center gap-4 rounded-[10px] border border-[#e4e9f0] bg-white/95 px-3 py-2 text-[10px] text-[#748099] shadow-sm sm:flex">
      {(["order", "dish", "semi", "raw"] as MrpNodeType[]).map((type) => <span key={type} className="flex items-center gap-1.5"><span className={cn("h-2 w-2 rounded-full", type === "order" ? "bg-[#1768f2]" : type === "dish" ? "bg-[#6858e8]" : type === "semi" ? "bg-[#08a879]" : "bg-[#8b98ad]")} />{typeLabels[type]}</span>)}
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ef4444]" />缺料</span>
    </div>
    <div className="nora-scrollbar absolute inset-0 overflow-auto" onClick={() => onSelect(null)}>
      <div style={{ width: 1180 * zoom / 100, height: 742 * zoom / 100 }}>
        <div className="map-grid relative" style={{ width: 1180, height: 742, transform: `scale(${zoom / 100})`, transformOrigin: "0 0" }}>
          <div className="absolute inset-x-0 top-0 flex h-8 items-center text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9ba5b5]">
            <span className="absolute left-6">生产需求</span><span className="absolute left-[288px]">菜品</span><span className="absolute left-[566px]">半成品</span><span className="absolute left-[928px]">原料与库存</span>
          </div>
          <svg className="absolute inset-0" width="1180" height="742" aria-hidden="true">
            <defs>
              <marker id="mrp-arrow" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#9aa9bf" /></marker>
              <marker id="mrp-arrow-active" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#1768f2" /></marker>
            </defs>
            {edges.map((edge) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;
              const x1 = source.x + source.width;
              const y1 = source.y + yOffset + source.height / 2;
              const x2 = target.x;
              const y2 = target.y + yOffset + target.height / 2;
              const bend = Math.max(48, (x2 - x1) * 0.48);
              const active = !selectedId || activeEdges.has(edge.id);
              const highlighted = Boolean(selectedId && activeEdges.has(edge.id));
              return <path key={edge.id} d={`M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`} fill="none" stroke={highlighted ? "#1768f2" : "#a9b5c7"} strokeWidth={highlighted ? Math.min(7, 2.5 + Math.log2(Math.max(1, edge.amount)) / 2) : 2} strokeOpacity={active ? (highlighted ? 0.75 : 0.42) : 0.08} markerEnd={highlighted ? "url(#mrp-arrow-active)" : "url(#mrp-arrow)"} />;
            })}
          </svg>
          {nodes.map((node) => {
            const Icon = typeIcon[node.type];
            const active = !selectedId || related.has(node.id);
            const selected = selectedId === node.id;
            const available = node.onHand === undefined ? null : Math.max(0, node.onHand - (node.allocated ?? 0));
            return <button
              key={node.id}
              type="button"
              onClick={(event) => { event.stopPropagation(); onSelect(node.id); }}
              className={cn(
                "focus-ring absolute overflow-hidden rounded-[12px] border text-left shadow-[0_2px_8px_rgba(37,55,86,.05)] transition",
                node.type === "raw" ? "p-2" : "p-3",
                nodeSurface[node.type],
                node.status === "shortage" && "border-[#f2a0a0] bg-[#fffafa]",
                selected && "z-10 border-[#1768f2] ring-4 ring-[#1768f2]/10",
                active ? "opacity-100" : "opacity-25",
              )}
              style={{ left: node.x, top: node.y + yOffset, width: node.width, height: node.height }}
              aria-pressed={selected}
            >
              <span className="flex items-start gap-2.5">
                <span className={cn("mt-0.5 flex shrink-0 items-center justify-center rounded-lg", node.type === "raw" ? "h-7 w-7" : "h-8 w-8", node.type === "order" ? "bg-[#e7f0ff] text-[#1768f2]" : node.type === "dish" ? "bg-[#eeebff] text-[#6858e8]" : node.type === "semi" ? "bg-[#e3f7f0] text-[#078663]" : "bg-[#eef2f6] text-[#65728a]")}><Icon size={node.type === "raw" ? 14 : 16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5"><b className="block truncate text-[12px] text-[#253351]">{node.name}</b>{node.status === "shortage" ? <AlertTriangle size={13} className="shrink-0 text-[#ef4444]" /> : null}</span>
                  <span className="mt-0.5 block truncate text-[9px] text-[#8b96a8]">{node.code}</span>
                </span>
              </span>
              <span className={cn("flex items-end justify-between gap-2", node.type === "raw" ? "mt-1" : "mt-2")}>
                <strong className={cn("tracking-[-0.02em] text-[#17213d]", node.type === "raw" ? "text-[12px]" : "text-[14px]")}>{formatMrpNumber(node.amount)} <small className="text-[9px] font-medium text-[#748099]">{node.unit}</small></strong>
                {node.shortage && node.shortage > 0 ? <span className="text-[9px] font-semibold text-[#dc3c3c]">缺 {formatMrpNumber(node.shortage)}</span> : available !== null ? <span className="text-[9px] text-[#078663]">可用 {formatMrpNumber(available)}</span> : null}
              </span>
            </button>;
          })}
        </div>
      </div>
    </div>
  </div>;
}

function RowExpander({ expanded, childCount, onClick }: { expanded: boolean; childCount: number; onClick: () => void }) {
  if (!childCount) return <span className="inline-block h-7 w-7" />;
  return <button type="button" onClick={(event) => { event.stopPropagation(); onClick(); }} className="focus-ring flex h-7 w-7 items-center justify-center rounded-md text-[#6e7a90] hover:bg-[#edf2f8]" aria-label={expanded ? "收起" : "展开"}>{expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>;
}

export function BomBreakdownTable({ rows, selectedEntityId, onSelect }: { rows: BomTableRow[]; selectedEntityId: string | null; onSelect: (entityId: string) => void }) {
  const expandableIds = useMemo(() => rows.filter((row) => row.childCount > 0).map((row) => row.id), [rows]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(expandableIds));
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [showFormula, setShowFormula] = useState(true);
  const visibleRows = useMemo(() => {
    const visible = flattenVisibleRows(rows, expanded);
    const normalized = query.trim().toLowerCase();
    if (!normalized) return visible;
    const rowMap = new Map(rows.map((row) => [row.id, row]));
    const keep = new Set<string>();
    rows.forEach((row) => {
      if (`${row.name} ${row.code} ${row.formula}`.toLowerCase().includes(normalized)) {
        keep.add(row.id);
        let parentId = row.parentId;
        while (parentId) {
          keep.add(parentId);
          parentId = rowMap.get(parentId)?.parentId ?? null;
        }
      }
    });
    return visible.filter((row) => keep.has(row.id));
  }, [expanded, query, rows]);

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const exportRows = () => downloadCsv("订单BOM拆解.csv", [
    ["层级", "类型", "物料编码", "名称", "净用量", "出成率", "毛料需求", "单位", "现存", "占用", "缺口", "单位成本", "计算公式"],
    ...visibleRows.map((row) => [row.level, typeLabels[row.type], row.code, row.name, row.net ?? "", row.yieldRate ?? "", row.gross ?? "", row.unit, row.onHand ?? "", row.allocated ?? "", row.shortage ?? "", row.unitCost ?? "", row.formula]),
  ]);

  return <div className="overflow-hidden">
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e8edf3] bg-white p-3">
      <div className="relative min-w-[220px] flex-1 sm:max-w-[360px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} h-9 pl-9 text-xs`} placeholder="搜索物料、编码或公式" /></div>
      <Button size="sm" variant="secondary" onClick={() => setExpanded(new Set(expandableIds))}><ChevronsUpDown size={14} />全部展开</Button>
      <Button size="sm" variant="secondary" onClick={() => setExpanded(new Set(["row-order"]))}>折叠到菜品</Button>
      <Button size="sm" variant={showFormula ? "secondary" : "ghost"} onClick={() => setShowFormula((value) => !value)}><Eye size={14} />{showFormula ? "隐藏公式" : "显示公式"}</Button>
      <Button size="sm" variant="secondary" onClick={() => setCompact((value) => !value)}><FileSpreadsheet size={14} />{compact ? "标准密度" : "紧凑密度"}</Button>
      <Button size="sm" variant="secondary" onClick={exportRows}><Download size={14} />导出 CSV</Button>
    </div>
    <div className="nora-scrollbar max-h-[560px] overflow-auto">
      <table className={cn("w-full text-left text-xs", showFormula ? "min-w-[1460px]" : "min-w-[1180px]")}>
        <thead className="sticky top-0 z-20 bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8290a5] shadow-[0_1px_0_#e8edf3]">
          <tr><th className="sticky left-0 z-30 min-w-[300px] bg-[#f8fafc] px-4 py-2.5">BOM 路径</th><th className="px-3 py-2.5">类型</th><th className="px-3 py-2.5 text-right">净用量</th><th className="px-3 py-2.5 text-right">出成率</th><th className="px-3 py-2.5 text-right">毛料需求</th><th className="px-3 py-2.5 text-right">可用库存</th><th className="px-3 py-2.5 text-right">缺口</th><th className="px-3 py-2.5 text-right">单位成本</th><th className="px-3 py-2.5 text-right">预计金额</th>{showFormula ? <th className="min-w-[260px] px-3 py-2.5">拆解公式</th> : null}</tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const available = row.onHand === null ? null : Math.max(0, row.onHand - (row.allocated ?? 0));
            const amount = row.gross !== null && row.unitCost !== null ? row.gross * row.unitCost : null;
            const selected = selectedEntityId === row.entityId;
            return <tr key={row.id} onClick={() => onSelect(row.entityId)} className={cn("cursor-pointer border-t border-[#edf0f4] transition hover:bg-[#f6f9fd]", selected && "bg-[#eef5ff]") }>
              <td className={cn("sticky left-0 z-10 bg-white px-4", compact ? "py-1.5" : "py-2.5", selected && "bg-[#eef5ff]")}>
                <div className="flex items-center" style={{ paddingLeft: row.level * 22 }}><RowExpander expanded={expanded.has(row.id)} childCount={row.childCount} onClick={() => toggle(row.id)} /><span className="ml-1 min-w-0"><b className="block truncate text-[12px] text-[#263451]">{row.name}</b><span className="block font-mono text-[9px] text-[#929caf]">{row.code}</span></span></div>
              </td>
              <td className={cn("px-3", compact ? "py-1.5" : "py-2.5")}><Badge tone={typeBadgeTone[row.type]}>{typeLabels[row.type]}</Badge></td>
              <td className="px-3 text-right tabular-nums">{row.net === null ? "—" : `${formatMrpNumber(row.net)} ${row.unit}`}</td>
              <td className="px-3 text-right tabular-nums">{row.yieldRate === null ? "—" : `${Math.round(row.yieldRate * 100)}%`}</td>
              <td className="px-3 text-right font-semibold tabular-nums text-[#283650]">{row.gross === null ? "—" : `${formatMrpNumber(row.gross)} ${row.unit}`}</td>
              <td className="px-3 text-right tabular-nums">{available === null ? "—" : `${formatMrpNumber(available)} ${row.unit}`}</td>
              <td className={cn("px-3 text-right font-semibold tabular-nums", row.shortage && row.shortage > 0 ? "text-[#dc3c3c]" : "text-[#078663]")}>{row.shortage === null ? "—" : row.shortage > 0 ? `${formatMrpNumber(row.shortage)} ${row.unit}` : "充足"}</td>
              <td className="px-3 text-right tabular-nums">{row.unitCost === null ? "—" : `¥${formatMrpNumber(row.unitCost, 2)}`}</td>
              <td className="px-3 text-right font-medium tabular-nums">{amount === null ? "—" : `¥${formatMrpNumber(amount, 2)}`}</td>
              {showFormula ? <td className="px-3 text-[11px] text-[#6e7b92]">{row.formula}</td> : null}
            </tr>;
          })}
        </tbody>
      </table>
      {visibleRows.length === 0 ? <div className="py-14 text-center text-sm text-[#8b96a8]">没有符合条件的 BOM 项</div> : null}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8edf3] bg-[#fafbfd] px-4 py-2.5 text-[10px] text-[#7c899e]"><span>显示 {visibleRows.length} / {rows.length} 行 · 表头与首列已冻结</span><span>共享物料在不同 BOM 路径中分别显示，库存按物料统一计算</span></div>
  </div>;
}

type DemandGroupMode = "material" | "source";

export function DemandPivotTable({ materials, selectedMaterialId, onSelect }: { materials: DemandMaterial[]; selectedMaterialId: string | null; onSelect: (id: string) => void }) {
  const [groupMode, setGroupMode] = useState<DemandGroupMode>("material");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(materials.filter((item) => materialShortage(item) > 0).map((item) => item.id)));
  const [query, setQuery] = useState("");
  const [shortageOnly, setShortageOnly] = useState(false);
  const [compact, setCompact] = useState(false);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredMaterials = useMemo(() => materials.filter((material) => {
    if (shortageOnly && materialShortage(material) <= 0) return false;
    if (!normalizedQuery) return true;
    return `${material.name} ${material.code} ${material.category} ${material.contributions.map((item) => item.source).join(" ")}`.toLowerCase().includes(normalizedQuery);
  }), [materials, normalizedQuery, shortageOnly]);
  const sourceGroups = useMemo(() => {
    const groups = new Map<string, Array<{ material: DemandMaterial; contribution: DemandMaterial["contributions"][number] }>>();
    filteredMaterials.forEach((material) => material.contributions.forEach((contribution) => groups.set(contribution.source, [...(groups.get(contribution.source) ?? []), { material, contribution }])));
    return [...groups.entries()];
  }, [filteredMaterials]);

  const exportRows = () => downloadCsv("日期物料需求透视.csv", [
    ["物料编码", "原料", "分类", "需求量", "单位", "现存", "已占用", "可用库存", "缺口", "覆盖率", "单位成本", "采购建议金额", "交期", "来源菜品"],
    ...filteredMaterials.map((material) => {
      const shortage = materialShortage(material);
      return [material.code, material.name, material.category, material.demand, material.unit, material.onHand, material.allocated, Math.max(0, material.onHand - material.allocated), shortage, `${materialCoverage(material)}%`, material.unitCost, shortage * material.unitCost, material.leadTime, material.contributions.map((item) => item.source).join(" / ")];
    }),
  ]);

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return <div className="overflow-hidden">
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e8edf3] bg-white p-3">
      <div className="inline-flex h-9 rounded-[9px] border border-[#dce3ed] bg-[#f6f8fb] p-0.5">
        <button onClick={() => setGroupMode("material")} className={cn("focus-ring rounded-[7px] px-3 text-xs font-medium", groupMode === "material" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d]")}>按原料</button>
        <button onClick={() => setGroupMode("source")} className={cn("focus-ring rounded-[7px] px-3 text-xs font-medium", groupMode === "source" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d]")}>按菜品来源</button>
      </div>
      <div className="relative min-w-[200px] flex-1 sm:max-w-[330px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a8]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} h-9 pl-9 text-xs`} placeholder="搜索原料、编码或来源菜品" /></div>
      <button onClick={() => setShortageOnly((value) => !value)} className={cn("focus-ring inline-flex h-9 items-center gap-2 rounded-[9px] border px-3 text-xs font-medium", shortageOnly ? "border-[#ef9d9d] bg-[#fff3f3] text-[#d83d3d]" : "border-[#dce3ed] bg-white text-[#53617a]")}><AlertTriangle size={14} />仅看缺料</button>
      <Button size="sm" variant="secondary" onClick={() => setCompact((value) => !value)}><FileSpreadsheet size={14} />{compact ? "标准密度" : "紧凑密度"}</Button>
      <Button size="sm" variant="secondary" onClick={exportRows}><Download size={14} />导出 CSV</Button>
    </div>
    <div className="nora-scrollbar max-h-[590px] overflow-auto">
      <table className="w-full min-w-[1260px] text-left text-xs">
        <thead className="sticky top-0 z-20 bg-[#f8fafc] text-[10px] font-semibold uppercase tracking-[0.04em] text-[#8290a5] shadow-[0_1px_0_#e8edf3]"><tr><th className="sticky left-0 z-30 min-w-[290px] bg-[#f8fafc] px-4 py-2.5">{groupMode === "material" ? "原料 / 来源拆分" : "菜品 / 原料拆分"}</th><th className="px-3 py-2.5">分类</th><th className="px-3 py-2.5 text-right">需求量</th><th className="px-3 py-2.5 text-right">现存</th><th className="px-3 py-2.5 text-right">已占用</th><th className="px-3 py-2.5 text-right">可用</th><th className="min-w-[150px] px-3 py-2.5">库存覆盖</th><th className="px-3 py-2.5 text-right">缺口</th><th className="px-3 py-2.5 text-right">单位成本</th><th className="px-3 py-2.5 text-right">采购金额</th><th className="px-3 py-2.5">到货周期</th></tr></thead>
        <tbody>
          {groupMode === "material" ? filteredMaterials.map((material) => {
            const available = Math.max(0, material.onHand - material.allocated);
            const shortage = materialShortage(material);
            const coverage = materialCoverage(material);
            const isExpanded = expanded.has(material.id);
            const selected = selectedMaterialId === material.id;
            return <DemandMaterialRows key={material.id} material={material} available={available} shortage={shortage} coverage={coverage} expanded={isExpanded} selected={selected} compact={compact} onToggle={() => toggle(material.id)} onSelect={() => onSelect(material.id)} />;
          }) : sourceGroups.map(([source, items]) => {
            const sourceId = `source-${source}`;
            const isExpanded = expanded.has(sourceId);
            return <SourceGroupRows key={source} source={source} items={items} expanded={isExpanded} compact={compact} selectedMaterialId={selectedMaterialId} onToggle={() => toggle(sourceId)} onSelect={onSelect} />;
          })}
        </tbody>
      </table>
      {filteredMaterials.length === 0 ? <div className="py-14 text-center text-sm text-[#8b96a8]">没有符合当前筛选条件的物料</div> : null}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e8edf3] bg-[#fafbfd] px-4 py-2.5 text-[10px] text-[#7c899e]"><span>{filteredMaterials.length} 项物料 · 表头与首列已冻结</span><span>包材保留在表格，但不进入 kg 重量流向图</span></div>
  </div>;
}

function DemandMaterialRows({ material, available, shortage, coverage, expanded, selected, compact, onToggle, onSelect }: { material: DemandMaterial; available: number; shortage: number; coverage: number; expanded: boolean; selected: boolean; compact: boolean; onToggle: () => void; onSelect: () => void }) {
  return <>
    <tr onClick={onSelect} className={cn("cursor-pointer border-t border-[#edf0f4] transition hover:bg-[#f6f9fd]", selected && "bg-[#eef5ff]")}>
      <td className={cn("sticky left-0 z-10 bg-white px-4", compact ? "py-1.5" : "py-2.5", selected && "bg-[#eef5ff]")}><div className="flex items-center"><RowExpander expanded={expanded} childCount={material.contributions.length} onClick={onToggle} /><span className="ml-1"><span className="flex items-center gap-2"><b className="text-[12px] text-[#263451]">{material.name}</b>{material.excludedFromWeightFlow ? <Badge tone="neutral">非重量</Badge> : null}</span><span className="block font-mono text-[9px] text-[#929caf]">{material.code}</span></span></div></td>
      <td className="px-3"><Badge tone="neutral">{material.category}</Badge></td><td className="px-3 text-right font-semibold tabular-nums">{formatMrpNumber(material.demand)} {material.unit}</td><td className="px-3 text-right tabular-nums">{formatMrpNumber(material.onHand)}</td><td className="px-3 text-right tabular-nums text-[#7d899d]">{formatMrpNumber(material.allocated)}</td><td className="px-3 text-right tabular-nums">{formatMrpNumber(available)}</td><td className="px-3"><div className="flex items-center gap-2"><Progress value={coverage} tone={shortage > 0 ? "danger" : coverage < 115 ? "warning" : "success"} className="w-20" /><span className="w-8 text-right text-[10px] tabular-nums">{coverage}%</span></div></td><td className={cn("px-3 text-right font-semibold tabular-nums", shortage > 0 ? "text-[#dc3c3c]" : "text-[#078663]")}>{shortage > 0 ? `${formatMrpNumber(shortage)} ${material.unit}` : "充足"}</td><td className="px-3 text-right tabular-nums">¥{formatMrpNumber(material.unitCost, 2)}</td><td className="px-3 text-right font-medium tabular-nums">{shortage > 0 ? `¥${formatMrpNumber(shortage * material.unitCost, 2)}` : "—"}</td><td className="px-3 text-[#68758d]">{material.leadTime}</td>
    </tr>
    {expanded ? material.contributions.map((contribution) => <tr key={contribution.id} onClick={onSelect} className={cn("cursor-pointer border-t border-[#f0f3f7] bg-[#fbfcfe] text-[#65728a] hover:bg-[#f4f8fd]", selected && "bg-[#f5f9ff]")}><td className="sticky left-0 z-10 bg-[#fbfcfe] px-4 py-2"><div className="ml-9 flex items-center gap-2"><span className="h-px w-4 bg-[#c9d2df]" /><span><b className="block text-[11px] font-medium text-[#485670]">来自 {contribution.source}</b><span className="text-[9px]">{contribution.orderCount} 张订单 · {contribution.formula}</span></span></div></td><td className="px-3 text-[10px]">来源拆分</td><td className="px-3 text-right font-medium tabular-nums">{formatMrpNumber(contribution.amount)} {material.unit}</td><td colSpan={8} className="px-3 text-[10px] text-[#8a95a8]">占该物料需求 {Math.round(contribution.amount / material.demand * 100)}%</td></tr>) : null}
  </>;
}

function SourceGroupRows({ source, items, expanded, compact, selectedMaterialId, onToggle, onSelect }: { source: string; items: Array<{ material: DemandMaterial; contribution: DemandMaterial["contributions"][number] }>; expanded: boolean; compact: boolean; selectedMaterialId: string | null; onToggle: () => void; onSelect: (id: string) => void }) {
  return <>
    <tr className="border-t border-[#e8edf3] bg-[#fafbfd]"><td className={cn("sticky left-0 z-10 bg-[#fafbfd] px-4", compact ? "py-1.5" : "py-2.5")}><div className="flex items-center"><RowExpander expanded={expanded} childCount={items.length} onClick={onToggle} /><span className="ml-1 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#efedff] text-[#6858e8]"><CookingPot size={14} /></span><span><b className="block text-[12px]">{source}</b><span className="text-[9px] text-[#8b96a8]">{items.length} 项原料</span></span></span></div></td><td className="px-3"><Badge tone="purple">菜品汇总</Badge></td><td colSpan={9} className="px-3 text-[10px] text-[#7e8a9f]">不同计量单位不做合计，请展开查看原始用量</td></tr>
    {expanded ? items.map(({ material, contribution }) => {
      const shortage = materialShortage(material);
      const coverage = materialCoverage(material);
      const available = Math.max(0, material.onHand - material.allocated);
      const selected = selectedMaterialId === material.id;
      return <tr key={`${source}-${material.id}`} onClick={() => onSelect(material.id)} className={cn("cursor-pointer border-t border-[#edf0f4] hover:bg-[#f6f9fd]", selected && "bg-[#eef5ff]")}><td className={cn("sticky left-0 z-10 bg-white px-4", compact ? "py-1.5" : "py-2.5", selected && "bg-[#eef5ff]")}><div className="ml-10"><b className="block text-[12px]">{material.name}</b><span className="font-mono text-[9px] text-[#929caf]">{material.code} · {contribution.formula}</span></div></td><td className="px-3"><Badge tone="neutral">{material.category}</Badge></td><td className="px-3 text-right font-semibold tabular-nums">{formatMrpNumber(contribution.amount)} {material.unit}</td><td className="px-3 text-right tabular-nums">{formatMrpNumber(material.onHand)}</td><td className="px-3 text-right tabular-nums text-[#7d899d]">{formatMrpNumber(material.allocated)}</td><td className="px-3 text-right tabular-nums">{formatMrpNumber(available)}</td><td className="px-3"><div className="flex items-center gap-2"><Progress value={coverage} tone={shortage > 0 ? "danger" : "success"} className="w-20" /><span className="text-[10px]">{coverage}%</span></div></td><td className={cn("px-3 text-right font-semibold", shortage > 0 ? "text-[#dc3c3c]" : "text-[#078663]")}>{shortage > 0 ? `${formatMrpNumber(shortage)} ${material.unit}` : "充足"}</td><td className="px-3 text-right">¥{formatMrpNumber(material.unitCost, 2)}</td><td className="px-3 text-right">{shortage > 0 ? `¥${formatMrpNumber(shortage * material.unitCost, 2)}` : "—"}</td><td className="px-3 text-[#68758d]">{material.leadTime}</td></tr>;
    }) : null}
  </>;
}

export function GraphNodeInspector({ node, incomingEdges, outgoingEdges }: { node: BomGraphNode | null; incomingEdges: BomGraphEdge[]; outgoingEdges: BomGraphEdge[] }) {
  if (!node) return <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-6 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3f8] text-[#748099]"><Boxes size={20} /></span><b className="mt-3 text-sm text-[#35425e]">选择一个节点</b><p className="mt-1 max-w-[220px] text-xs leading-5 text-[#8792a6]">查看计算公式、库存占用以及上下游来源。</p></div>;
  const available = node.onHand === undefined ? null : Math.max(0, node.onHand - (node.allocated ?? 0));
  const Icon = typeIcon[node.type];
  return <div className="p-4">
    <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf4ff] text-[#1768f2]"><Icon size={18} /></span><div className="min-w-0"><Badge tone={typeBadgeTone[node.type]}>{typeLabels[node.type]}</Badge><h3 className="mt-2 truncate text-sm font-semibold text-[#1d2947]">{node.name}</h3><p className="mt-0.5 font-mono text-[10px] text-[#8a95a8]">{node.code}</p></div></div>
    <p className="mt-4 text-xs leading-5 text-[#68758d]">{node.description}</p>
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e4e9f0] bg-[#e4e9f0]"><div className="bg-white p-3"><p className="text-[10px] text-[#8792a6]">本级需求</p><b className="mt-1 block text-sm">{formatMrpNumber(node.amount)} {node.unit}</b></div><div className="bg-white p-3"><p className="text-[10px] text-[#8792a6]">出成率</p><b className="mt-1 block text-sm">{node.yieldRate ? `${Math.round(node.yieldRate * 100)}%` : "—"}</b></div>{available !== null ? <><div className="bg-white p-3"><p className="text-[10px] text-[#8792a6]">可用库存</p><b className="mt-1 block text-sm">{formatMrpNumber(available)} {node.unit}</b></div><div className="bg-white p-3"><p className="text-[10px] text-[#8792a6]">库存缺口</p><b className={cn("mt-1 block text-sm", node.shortage && node.shortage > 0 ? "text-[#dc3c3c]" : "text-[#078663]")}>{node.shortage && node.shortage > 0 ? `${formatMrpNumber(node.shortage)} ${node.unit}` : "充足"}</b></div></> : null}</div>
    <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#99a3b4]">上游来源</p><div className="mt-2 space-y-2">{incomingEdges.length ? incomingEdges.map((edge) => <div key={edge.id} className="rounded-lg bg-[#f5f7fa] p-2.5"><div className="flex justify-between gap-2 text-[11px]"><span className="text-[#637087]">{edge.formula}</span><b className="shrink-0">{formatMrpNumber(edge.amount)} {edge.unit}</b></div></div>) : <p className="text-xs text-[#8b96a8]">这是拆解起点</p>}</div></div>
    {outgoingEdges.length ? <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#99a3b4]">向下拆解</p><p className="mt-2 text-xs text-[#68758d]">继续拆为 {outgoingEdges.length} 项下级需求</p></div> : null}
  </div>;
}

export function DemandMaterialInspector({ material }: { material: DemandMaterial | null }) {
  if (!material) return <div className="flex h-full min-h-[260px] flex-col items-center justify-center p-6 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3f8] text-[#748099]"><Warehouse size={20} /></span><b className="mt-3 text-sm text-[#35425e]">选择一种原料</b><p className="mt-1 text-xs leading-5 text-[#8792a6]">图表与透视表会共同定位需求来源。</p></div>;
  const shortage = materialShortage(material);
  const available = Math.max(0, material.onHand - material.allocated);
  const coverage = materialCoverage(material);
  return <div className="p-4"><div className="flex items-start justify-between gap-3"><div><Badge tone={shortage > 0 ? "danger" : "success"}>{shortage > 0 ? "存在缺口" : "库存充足"}</Badge><h3 className="mt-2 text-sm font-semibold text-[#1d2947]">{material.name}</h3><p className="font-mono text-[10px] text-[#8a95a8]">{material.code} · {material.category}</p></div><Warehouse size={19} className="text-[#1768f2]" /></div><div className="mt-4 rounded-xl border border-[#e4e9f0] p-3"><div className="flex items-end justify-between"><span><span className="block text-[10px] text-[#8792a6]">库存覆盖</span><b className="text-lg">{coverage}%</b></span><span className="text-right text-[10px] text-[#8792a6]">需求 {formatMrpNumber(material.demand)} {material.unit}<br />可用 {formatMrpNumber(available)} {material.unit}</span></div><Progress value={coverage} tone={shortage > 0 ? "danger" : "success"} className="mt-3 h-2" /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg bg-[#f5f7fa] p-3"><p className="text-[10px] text-[#8792a6]">采购建议</p><b className={cn("mt-1 block text-sm", shortage > 0 ? "text-[#dc3c3c]" : "text-[#078663]")}>{shortage > 0 ? `${formatMrpNumber(shortage)} ${material.unit}` : "无需采购"}</b></div><div className="rounded-lg bg-[#f5f7fa] p-3"><p className="text-[10px] text-[#8792a6]">预计金额</p><b className="mt-1 block text-sm">¥{formatMrpNumber(shortage * material.unitCost, 2)}</b></div></div><div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#99a3b4]">需求来源</p><div className="mt-2 space-y-2">{material.contributions.map((item) => <div key={item.id} className="rounded-lg border border-[#e6ebf1] p-3"><div className="flex justify-between gap-3"><b className="text-xs">{item.source}</b><b className="text-xs text-[#1768f2]">{formatMrpNumber(item.amount)} {material.unit}</b></div><p className="mt-1 text-[10px] leading-4 text-[#7d899d]">{item.formula}</p></div>)}</div></div><Button className="mt-5 w-full" variant={shortage > 0 ? "primary" : "secondary"} disabled={shortage <= 0}>{shortage > 0 ? "加入采购建议" : "库存可满足"}</Button></div>;
}
