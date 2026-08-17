"use client";

import {
  AlertTriangle,
  Box,
  ChevronRight,
  Columns3,
  Download,
  GitBranch,
  GripHorizontal,
  Link2,
  PackageOpen,
  Search,
  Settings2,
  ShoppingCart,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Progress } from "@/components/ui";
import { cn } from "@/lib/utils";

type ExceptionItem = {
  id: string;
  rank: number;
  name: string;
  code: string;
  shortage: number;
  unit: string;
  category: "shortage" | "shared" | "changed";
  demand: number;
  available: number;
  coverage: number;
  amount: number;
  formula: string;
  path: string;
};

const exceptions: ExceptionItem[] = [
  { id: "chicken", rank: 1, name: "冷冻鸡胸肉", code: "RM01234", shortage: 84.5, unit: "kg", category: "shortage", demand: 204.5, available: 120, coverage: 67, amount: 1749.15, formula: "180kg ÷ 88% = 204.5kg", path: "订单 → 宫保鸡丁 → 腌制鸡肉丁 → 冷冻鸡胸肉" },
  { id: "bamboo", rank: 2, name: "鲜冬笋丝", code: "RM02116", shortage: 14, unit: "kg", category: "shortage", demand: 64, available: 50, coverage: 78, amount: 294, formula: "57.6kg ÷ 90% = 64kg", path: "订单 → 鱼香肉丝 → 净配时蔬 → 鲜冬笋丝" },
  { id: "peanut", rank: 3, name: "花生米", code: "RM03108", shortage: 12, unit: "kg", category: "shortage", demand: 48, available: 36, coverage: 75, amount: 180, formula: "47kg ÷ 98% = 48kg", path: "订单 → 宫保鸡丁 → 宫保辅料包 → 花生米" },
  { id: "garlic", rank: 4, name: "葱姜蒜净料", code: "RM03004", shortage: 8, unit: "kg", category: "shared", demand: 28, available: 20, coverage: 71, amount: 68, formula: "26.9kg ÷ 96% = 28kg", path: "订单 → 2 个菜品 → 葱姜蒜净料" },
];

const rows = [
  { id: "chicken", name: "冷冻鸡胸肉", code: "RM01234", category: "禽肉类", demand: "204.5", onHand: "360", allocated: "240", available: "120", coverage: 67, shortage: "84.5", formula: "180 ÷ 88%", path: "宫保鸡丁" },
  { id: "chicken-source", name: "来自 宫保鸡丁", code: "1,200 份 × 标准净用量", category: "来源拆分", demand: "204.5", onHand: "—", allocated: "—", available: "—", coverage: 67, shortage: "84.5", formula: "180 ÷ 88%", path: "完整路径" },
  { id: "bamboo", name: "鲜冬笋丝", code: "RM02116", category: "蔬菜类", demand: "64.0", onHand: "68", allocated: "18", available: "50", coverage: 78, shortage: "14", formula: "57.6 ÷ 90%", path: "鱼香肉丝" },
  { id: "peanut", name: "花生米", code: "RM03108", category: "干货类", demand: "48.0", onHand: "46", allocated: "10", available: "36", coverage: 75, shortage: "12", formula: "47 ÷ 98%", path: "宫保鸡丁" },
  { id: "garlic", name: "葱姜蒜净料", code: "RM03004", category: "净配调料", demand: "28.0", onHand: "42", allocated: "22", available: "20", coverage: 71, shortage: "8", formula: "26.9 ÷ 96%", path: "2 个菜品" },
  { id: "fungus", name: "水发木耳", code: "RM02128", category: "菌菇类", demand: "72.0", onHand: "108", allocated: "18", available: "90", coverage: 100, shortage: "0", formula: "64.8 ÷ 90%", path: "鱼香肉丝" },
];

const dishRows = [
  { id: "dish-kungpao", name: "宫保鸡丁", code: "CP0001 · 1,200 份", category: "菜品来源", demand: "—", onHand: "—", allocated: "—", available: "—", coverage: 100, shortage: "0", formula: "BOM V2.1", path: "3 种原料" },
  { ...rows[0], category: "宫保鸡丁", path: "完整路径" },
  { ...rows[3], category: "宫保鸡丁", path: "共享原料" },
  { ...rows[4], id: "garlic-kungpao", category: "宫保鸡丁", demand: "16.0", shortage: "4.6", path: "共享原料" },
  { id: "dish-yuxiang", name: "鱼香肉丝", code: "CP0002 · 800 份", category: "菜品来源", demand: "—", onHand: "—", allocated: "—", available: "—", coverage: 100, shortage: "0", formula: "BOM V1.8", path: "3 种原料" },
  { ...rows[2], category: "鱼香肉丝", path: "完整路径" },
  { ...rows[5], category: "鱼香肉丝", path: "完整路径" },
  { ...rows[4], id: "garlic-yuxiang", category: "鱼香肉丝", demand: "12.0", shortage: "3.4", path: "共享原料" },
];

const filters = ["全部", "缺料", "共享原料", "BOM 变更"];

export function MrpWorkbenchConcept() {
  const [filter, setFilter] = useState("缺料");
  const [selectedId, setSelectedId] = useState("chicken");
  const [view, setView] = useState<"graph" | "list">("graph");
  const [group, setGroup] = useState<"material" | "dish">("material");
  const selected = exceptions.find((item) => item.id === selectedId) ?? exceptions[0];
  const filteredExceptions = useMemo(() => filter === "共享原料" ? exceptions.filter((item) => item.category === "shared") : exceptions, [filter]);
  const visibleRows = group === "dish" ? dishRows : rows;

  return <div className="-m-4 flex h-[calc(100vh-64px)] min-h-[760px] flex-col overflow-hidden bg-[#f5f7fb] lg:-m-6">
    <header className="flex h-[76px] shrink-0 items-center justify-between border-b border-[#dfe5ed] bg-white px-6">
      <div><h1 className="text-[24px] font-semibold tracking-[-0.035em] text-[#111c3b]">MRP 分析工作台</h1></div>
      <div className="flex items-end gap-2">
        <label><span className="mb-1 block text-[9px] font-semibold text-[#7d899e]">选择销售订单</span><select className="h-9 w-[300px] rounded-[9px] border border-[#dce3ed] bg-white px-3 text-xs text-[#263451]"><option>SO202608060018 · 华润万家深圳福田店</option><option>SO202608060021 · 招商银行深圳分行</option></select></label>
        <label><span className="mb-1 block text-[9px] font-semibold text-[#7d899e]">需求日期</span><button className="h-9 rounded-[9px] border border-[#dce3ed] bg-white px-3 text-xs text-[#263451]">2026-08-06</button></label>
        <Button size="sm" className="h-9"><PackageOpen size={14} />生成需求建议</Button>
      </div>
    </header>

    <section className="grid h-[72px] shrink-0 grid-cols-4 border-b border-[#e1e6ee] bg-white px-6">
      <Metric icon={Box} label="订单份数" value="2,000 份" />
      <Metric icon={GitBranch} label="毛料需求总量" value="668.6 kg 毛料" />
      <Metric icon={AlertTriangle} label="缺料原料数" value="4 项缺料" danger />
      <Metric icon={ShoppingCart} label="建议采购金额" value="¥6,904.8" />
    </section>

    <main className="grid min-h-0 flex-1 grid-rows-[minmax(330px,.9fr)_16px_minmax(280px,1.1fr)] p-3">
      <section className="grid min-h-0 grid-cols-[238px_minmax(520px,1fr)_286px] overflow-hidden rounded-xl border border-[#dfe5ed] bg-white shadow-[0_2px_10px_rgba(36,52,82,.04)]">
        <aside className="min-h-0 border-r border-[#e5e9ef]">
          <div className="border-b border-[#e8ecf2] p-3"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-[#1c2946]">异常优先</h2><Badge tone="danger">4 项待处理</Badge></div><div className="mt-3 flex flex-wrap gap-1">{filters.map((item) => <button key={item} onClick={() => { setFilter(item); if (item === "共享原料") setSelectedId("garlic"); }} className={cn("rounded-md px-2 py-1 text-[10px] font-medium", filter === item ? "bg-[#eaf2ff] text-[#1768f2]" : "text-[#748099] hover:bg-[#f3f6fa]")}>{item}</button>)}</div></div>
          <div className="nora-scrollbar h-[calc(100%-82px)] overflow-auto p-2">{filteredExceptions.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={cn("mb-1 flex w-full items-center gap-2 rounded-[9px] border px-2.5 py-2 text-left transition", selectedId === item.id ? "border-[#83adf7] bg-[#edf4ff] shadow-sm" : "border-transparent hover:bg-[#f6f8fb]")}><span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white", item.rank === 1 ? "bg-[#e44444]" : item.rank < 4 ? "bg-[#ef9500]" : "bg-[#8a97ab]")}>{item.rank}</span><span className="min-w-0 flex-1"><b className="block truncate text-[11px] text-[#273553]">{item.name}</b><span className="font-mono text-[8px] text-[#909bad]">{item.code}</span></span><span className="shrink-0 text-[10px] font-semibold text-[#dc3c3c]">缺 {item.shortage} {item.unit}</span></button>)}</div>
        </aside>

        <div className="relative min-w-0 overflow-hidden bg-[#fbfcfe]">
          <div className="absolute left-3 top-3 z-10 flex h-8 items-center gap-1 rounded-lg border border-[#dce3ed] bg-white p-1 shadow-sm"><button className="rounded p-1 text-[#69768d]"><ZoomOut size={13} /></button><span className="w-8 text-center text-[10px]">90%</span><button className="rounded p-1 text-[#69768d]"><ZoomIn size={13} /></button></div>
          <div className="absolute right-3 top-3 z-10 flex h-8 rounded-lg border border-[#dce3ed] bg-white p-0.5"><button onClick={() => setView("graph")} className={cn("flex items-center gap-1 rounded-md px-2 text-[10px]", view === "graph" ? "bg-[#eaf2ff] text-[#1768f2]" : "text-[#68758d]")}><GitBranch size={12} />图形视图</button><button onClick={() => setView("list")} className={cn("flex items-center gap-1 rounded-md px-2 text-[10px]", view === "list" ? "bg-[#eaf2ff] text-[#1768f2]" : "text-[#68758d]")}><Columns3 size={12} />列表视图</button></div>
          {view === "graph" ? <FlowCanvas selected={selected} onSelect={setSelectedId} /> : <div className="flex h-full items-center justify-center text-sm text-[#7b879d]">列表视图将每条 BOM 路径按优先级纵向排列</div>}
        </div>

        <aside className="border-l border-[#e5e9ef] p-3">
          <div className="flex items-start justify-between"><div><Badge tone="danger">缺料</Badge><h2 className="mt-2 text-sm font-semibold text-[#1c2946]">{selected.name}</h2><p className="mt-0.5 font-mono text-[9px] text-[#8a95a8]">{selected.code}</p></div><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4ff] text-[#1768f2]"><Box size={15} /></span></div>
          <div className="mt-2"><div className="flex items-end justify-between"><div><p className="text-[9px] text-[#8994a7]">库存覆盖</p><b className="text-lg text-[#17213d]">{selected.coverage}%</b></div><p className="text-right text-[9px] leading-4 text-[#8a95a8]">需求 {selected.demand} kg<br />可用 {selected.available} kg</p></div><Progress value={selected.coverage} tone="danger" className="mt-1.5" /></div>
          <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[#e5e9ef] bg-[#e5e9ef]"><InspectorCell label="需求量" value={`${selected.demand} kg`} /><InspectorCell label="可用库存" value={`${selected.available} kg`} /><InspectorCell label="缺料量" value={`${selected.shortage} ${selected.unit}`} danger /><InspectorCell label="预计金额" value={`¥${selected.amount.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`} /></div>
          <div className="mt-2"><p className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#98a2b3]">计算路径</p><p title={selected.path} className="mt-0.5 truncate text-[9px] text-[#53617a]">{selected.path}</p></div>
          <div className="mt-1 flex items-center gap-2 rounded-lg bg-[#f5f7fa] px-2 py-1"><span className="shrink-0 text-[8px] text-[#8b96a8]">计算公式</span><b className="truncate text-[10px] text-[#263451]">{selected.formula}</b></div>
          <Button size="sm" className="mt-1.5 w-full"><ShoppingCart size={14} />加入采购建议</Button>
        </aside>
      </section>

      <div className="flex items-center justify-center"><span className="flex h-4 w-12 items-center justify-center rounded-full border border-[#dce3ed] bg-white text-[#8994a7] shadow-sm"><GripHorizontal size={14} /></span></div>

      <section className="min-h-0 overflow-hidden rounded-xl border border-[#dfe5ed] bg-white shadow-[0_2px_10px_rgba(36,52,82,.04)]">
        <div className="flex h-12 items-center gap-2 border-b border-[#e6eaf0] px-3">
          <div className="flex h-8 rounded-lg border border-[#dce3ed] bg-[#f6f8fb] p-0.5"><button onClick={() => setGroup("material")} className={cn("rounded-md px-3 text-[10px] font-medium", group === "material" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d]")}>按原料</button><button onClick={() => setGroup("dish")} className={cn("rounded-md px-3 text-[10px] font-medium", group === "dish" ? "bg-white text-[#1768f2] shadow-sm" : "text-[#68758d]")}>按菜品来源</button></div>
          <div className="relative w-[300px]"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8f9bad]" /><input className="h-8 w-full rounded-lg border border-[#dce3ed] pl-8 pr-3 text-[10px] outline-none" placeholder="搜索原料、编码或来源菜品" /></div>
          <div className="ml-auto flex gap-1"><button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#dce3ed] px-2.5 text-[10px] text-[#53617a]"><AlertTriangle size={12} />仅看缺料</button><button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#dce3ed] px-2.5 text-[10px] text-[#53617a]"><Settings2 size={12} />列设置</button><button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#dce3ed] px-2.5 text-[10px] text-[#53617a]"><Download size={12} />导出 CSV</button></div>
        </div>
          <div className="nora-scrollbar h-[calc(100%-48px)] overflow-auto"><table className="w-full min-w-[1040px] text-left text-[10px]"><thead className="sticky top-0 z-10 bg-[#f8fafc] text-[#8190a5]"><tr><th className="sticky left-0 z-20 min-w-[240px] bg-[#f8fafc] px-4 py-2">{group === "dish" ? "菜品 / 原料拆分" : "原料 / 来源拆分"}</th><th className="px-3">分类</th><th className="px-3 text-right">需求量 kg</th><th className="px-3 text-right">现有库存</th><th className="px-3 text-right">已占用</th><th className="px-3 text-right">可用库存</th><th className="min-w-[130px] px-3">覆盖率</th><th className="px-3 text-right">缺料量</th><th className="px-3">计算公式</th><th className="px-3">关联路径</th></tr></thead><tbody>{visibleRows.map((row) => { const selectedRow = row.id === selectedId || (selectedId === "chicken" && row.id === "chicken-source") || (selectedId === "garlic" && row.id.startsWith("garlic-")); const child = group === "dish" ? !row.id.startsWith("dish-") : row.id.includes("source"); const selectableId = row.id === "chicken-source" ? "chicken" : row.id.startsWith("garlic-") ? "garlic" : exceptions.some((item) => item.id === row.id) ? row.id : null; return <tr key={row.id} onClick={() => { if (selectableId) setSelectedId(selectableId); }} className={cn("border-t border-[#edf0f4]", selectableId && "cursor-pointer", row.id.startsWith("dish-") && "bg-[#f7f9fc]", selectedRow ? "bg-[#eef5ff]" : "hover:bg-[#f7f9fc]")}><td className={cn("sticky left-0 z-[5] px-4 py-2", row.id.startsWith("dish-") ? "bg-[#f7f9fc]" : selectedRow ? "bg-[#eef5ff]" : "bg-white")}><div className={cn("flex items-center", child && "pl-6")}><span className="mr-2 text-[#78859a]">{child ? <span className="inline-block h-px w-4 bg-[#cbd4e1]" /> : <ChevronRight size={13} />}</span><span><b className="block text-[11px] text-[#273553]">{row.name}</b><span className="font-mono text-[8px] text-[#929caf]">{row.code}</span></span></div></td><td className="px-3 text-[#64718a]">{row.category}</td><td className="px-3 text-right font-semibold">{row.demand}</td><td className="px-3 text-right">{row.onHand}</td><td className="px-3 text-right text-[#8792a6]">{row.allocated}</td><td className="px-3 text-right">{row.available}</td><td className="px-3"><div className="flex items-center gap-2"><Progress value={row.coverage} tone={row.coverage < 80 ? "danger" : row.coverage < 100 ? "warning" : "success"} className="w-16" /><span>{row.coverage}%</span></div></td><td className={cn("px-3 text-right font-semibold", row.shortage === "0" ? "text-[#078663]" : "text-[#dc3c3c]")}>{row.shortage === "0" ? "充足" : row.shortage}</td><td className="px-3 font-mono text-[#617089]">{row.formula}</td><td className="px-3"><span className="inline-flex items-center gap-1 text-[#1768f2]"><Link2 size={12} />{row.path}</span></td></tr>; })}</tbody></table></div>
      </section>
    </main>
  </div>;
}

function Metric({ icon: Icon, label, value, danger = false }: { icon: typeof Box; label: string; value: string; danger?: boolean }) {
  return <div className="flex items-center gap-3 border-r border-[#edf0f4] px-5 last:border-r-0"><span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", danger ? "bg-[#ffeded] text-[#e24444]" : "bg-[#eef3f8] text-[#617089]")}><Icon size={15} /></span><span><b className={cn("block text-[15px]", danger ? "text-[#d83d3d]" : "text-[#263451]")}>{value}</b><span className="mt-0.5 block text-[9px] text-[#8b96a8]">{label}</span></span></div>;
}

function InspectorCell({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="bg-white p-1.5"><p className="text-[9px] text-[#8994a7]">{label}</p><b className={cn("mt-0.5 block text-[11px]", danger ? "text-[#dc3c3c]" : "text-[#263451]")}>{value}</b></div>;
}

function FlowCanvas({ selected, onSelect }: { selected: ExceptionItem; onSelect: (id: string) => void }) {
  return <div className="relative h-full min-h-[330px] overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#dfe5ee_1px,transparent_0)] bg-[size:18px_18px] pt-12">
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 620 360" preserveAspectRatio="none" aria-hidden="true"><path d="M120 180 C155 180 160 120 195 120" fill="none" stroke="#1768f2" strokeWidth="3" /><path d="M325 120 C360 120 360 100 390 100" fill="none" stroke="#1768f2" strokeWidth="4" /><path d="M500 100 C535 100 520 190 545 190" fill="none" stroke="#1768f2" strokeWidth="4" /><path d="M325 120 C360 120 350 245 390 245" fill="none" stroke="#bfc9d7" strokeOpacity=".45" strokeWidth="2" /><path d="M120 180 C160 180 155 285 195 285" fill="none" stroke="#cbd3df" strokeOpacity=".4" strokeWidth="2" /></svg>
    <GraphNode className="left-[4%] top-[42%]" title="订单需求" code="SC20260806-018" value="2,000 份" />
    <GraphNode className="left-[27%] top-[26%]" title="宫保鸡丁" code="CP0001" value="1,200 份" tone="purple" />
    <GraphNode className="left-[27%] top-[69%] opacity-35" title="鱼香肉丝" code="CP0002" value="800 份" tone="purple" />
    <GraphNode className="left-[53%] top-[21%]" title="腌制鸡肉丁" code="SF01012" value="180 kg" tone="green" />
    <GraphNode className="left-[53%] top-[63%] opacity-35" title="宫保调味汁" code="SF02008" value="72 kg" tone="green" />
    <button onClick={() => onSelect(selected.id)} className="absolute left-[77%] top-[42%] w-[150px] rounded-xl border border-[#ef7676] bg-[#fffafa] p-3 text-left shadow-sm ring-4 ring-[#ef4444]/10"><span className="flex items-center justify-between"><b className="truncate text-[11px] text-[#273553]">{selected.name}</b><AlertTriangle size={13} className="shrink-0 text-[#ef4444]" /></span><span className="mt-1 block font-mono text-[8px] text-[#8e99aa]">{selected.code}</span><span className="mt-2 flex justify-between text-[10px]"><b>{selected.demand} kg</b><b className="text-[#dc3c3c]">缺 {selected.shortage}</b></span></button>
  </div>;
}

function GraphNode({ className, title, code, value, tone = "blue" }: { className: string; title: string; code: string; value: string; tone?: "blue" | "purple" | "green" }) {
  const surfaces = { blue: "border-[#a9c7ff] bg-[#f4f8ff]", purple: "border-[#cfc7fa] bg-[#faf9ff]", green: "border-[#9fdcca] bg-[#f4fcf9]" };
  return <div className={cn("absolute w-[132px] -translate-y-1/2 rounded-xl border p-3 shadow-sm", surfaces[tone], className)}><b className="text-[11px] text-[#273553]">{title}</b><span className="mt-1 block font-mono text-[8px] text-[#8e99aa]">{code}</span><b className="mt-2 block text-[11px] text-[#273553]">{value}</b></div>;
}
