"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Activity, Boxes, ChevronDown, CircleDollarSign, ClipboardCheck,
  Factory, FileBarChart, HelpCircle, LayoutDashboard, Menu, PackageSearch,
  Route, ScanLine, Search, Settings2, ShoppingCart, Sparkles, Truck,
  UserRound, UsersRound, Warehouse, X, RotateCcw, Bell, Database, ClipboardList,
  GitBranch, Workflow,
  Layers3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNoraStore } from "@/lib/store";
import type { UserRole } from "@/lib/types";

const roles: Array<{ value: UserRole; label: string; detail: string }> = [
  { value: "owner", label: "老板", detail: "全局经营与审批" },
  { value: "supervisor", label: "生产主管", detail: "计划、工单与异常" },
  { value: "worker", label: "工位员工", detail: "MES 任务执行" },
  { value: "customer", label: "客户", detail: "订单履约查询" },
];

const navigation = [
  { label: "工作台", items: [
    { label: "运营工作台", href: "/", icon: LayoutDashboard },
    { label: "数字孪生", href: "/digital-twin", icon: Factory },
  ] },
  { label: "客户与订单", items: [
    { label: "客户中心", href: "/customers", icon: UsersRound },
    { label: "订单中心", href: "/orders", icon: ShoppingCart },
    { label: "订单审核", href: "/orders/approvals", icon: ClipboardCheck },
  ] },
  { label: "商品与供应", items: [
    { label: "产品档案", href: "/catalog/products", icon: PackageSearch },
    { label: "产品与 BOM", href: "/catalog/boms", icon: Boxes },
    { label: "基础档案", href: "/master-data/company", icon: Database },
    { label: "采购中心", href: "#", icon: Truck, planned: true },
  ] },
  { label: "生产运营", items: [
    { label: "配方爆炸图", href: "/production/bom-explosion", icon: Layers3 },
    { label: "订单物料拆解", href: "/production/material-explosion", icon: GitBranch },
    { label: "日期需求流向", href: "/production/demand-flow", icon: Workflow },
    { label: "生产计划", href: "/production/plans", icon: Route },
    { label: "生产工单", href: "/production/work-orders", icon: ClipboardList },
    { label: "MES 执行", href: "/mes", icon: ScanLine },
    { label: "质量中心", href: "#", icon: ClipboardCheck, planned: true },
  ] },
  { label: "分拣配送", items: [
    { label: "库存中心", href: "#", icon: Warehouse, planned: true },
    { label: "分拣配送", href: "#", icon: Truck, planned: true },
  ] },
  { label: "财务与分析", items: [
    { label: "财务中心", href: "#", icon: CircleDollarSign, planned: true },
    { label: "报表中心", href: "#", icon: FileBarChart, planned: true },
  ] },
  { label: "平台与应用", items: [
    { label: "AI 销售预测", href: "/ai/forecast", icon: Sparkles },
    { label: "开放平台", href: "#", icon: Activity, planned: true },
  ] },
];

const commands = [
  ["创建销售订单", "/orders/new"], ["查看生产计划", "/production/plans"], ["进入 MES 工位", "/mes"],
  ["配方爆炸图", "/production/bom-explosion"],
  ["订单物料拆解", "/production/material-explosion"], ["日期需求流向", "/production/demand-flow"],
  ["打开数字孪生", "/digital-twin"], ["维护生产 BOM", "/catalog/boms"], ["客户中心", "/customers"],
  ["组织与产线", "/master-data/organization"], ["AI 销售预测", "/ai/forecast"],
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <div className="flex h-full flex-col bg-white"><div className="flex h-16 items-center border-b border-[#edf0f5] px-5"><Link href="/" onClick={onNavigate} className="focus-ring rounded-md text-[22px] font-semibold tracking-[-0.05em] text-[#101a35]">Nora</Link><span className="ml-2 rounded-md bg-[#eef4ff] px-2 py-0.5 text-[10px] font-semibold text-[#1768f2]">V0.1</span></div><nav className="nora-scrollbar flex-1 overflow-y-auto px-3 py-3">{navigation.map((group) => <div key={group.label} className="mb-3"><p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a0a9ba]">{group.label}</p><div className="space-y-0.5">{group.items.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); const Icon = item.icon; if (item.planned) return <button key={item.label} disabled className="flex w-full items-center gap-3 rounded-[9px] px-3 py-2 text-left text-[13px] text-[#9aa4b7]"><Icon size={17} strokeWidth={1.8} /><span className="flex-1">{item.label}</span><span className="text-[9px]">规划中</span></button>; return <Link key={item.label} href={item.href} onClick={onNavigate} className={cn("focus-ring flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] font-medium transition", active ? "bg-[#edf4ff] text-[#1768f2]" : "text-[#53617b] hover:bg-[#f5f7fa] hover:text-[#1b2947]")}><Icon size={17} strokeWidth={active ? 2.1 : 1.8} /><span>{item.label}</span></Link>; })}</div></div>)}</nav><div className="border-t border-[#edf0f5] p-3"><Link href="/master-data/access" className="focus-ring flex items-center gap-3 rounded-[9px] px-3 py-2 text-[13px] text-[#657188] hover:bg-[#f5f7fa]"><Settings2 size={17} />系统设置</Link><div className="mt-2 flex items-center gap-3 px-3 py-2"><span className="h-2 w-2 rounded-full bg-[#08a879]" /><span className="text-[11px] text-[#8b95a8]">演示数据已连接</span></div></div></div>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { currentRole, setRole, resetDemo } = useNoraStore();
  const current = roles.find((role) => role.value === currentRole) ?? roles[0];
  const filtered = useMemo(() => commands.filter(([label]) => label.includes(query.trim())), [query]);

  const changeRole = (role: UserRole) => {
    setRole(role);
    if (role === "worker") router.push("/mes");
    if (role === "customer") router.push("/portal/orders");
  };

  return <div className="min-h-screen bg-[#f7f9fc]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[224px] border-r border-[#e5eaf1] lg:block"><SidebarContent /></aside><header className="fixed left-0 right-0 top-0 z-30 h-16 border-b border-[#e6eaf1] bg-white/95 backdrop-blur lg:left-[224px]"><div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="focus-ring rounded-lg p-2 text-[#56647e] hover:bg-[#f2f5f9] lg:hidden" aria-label="打开导航"><Menu size={20} /></button><button onClick={() => setCommandOpen(true)} className="focus-ring flex h-10 w-[min(52vw,390px)] items-center gap-2 rounded-[10px] border border-[#e1e6ee] bg-[#fafbfd] px-3 text-left text-sm text-[#8994a8] transition hover:border-[#ccd5e2]"><Search size={17} /><span className="truncate">搜索菜单、功能或报表...</span><kbd className="ml-auto hidden rounded border border-[#dfe5ed] bg-white px-1.5 py-0.5 text-[10px] text-[#8590a4] sm:block">⌘ K</kbd></button></div><div className="flex items-center gap-1"><button className="focus-ring relative rounded-lg p-2 text-[#60708b] hover:bg-[#f3f6f9]" aria-label="通知"><Bell size={19} /><span className="absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-white bg-[#ef4444]" /></button><button className="focus-ring hidden rounded-lg p-2 text-[#60708b] hover:bg-[#f3f6f9] sm:block" aria-label="帮助"><HelpCircle size={19} /></button><DropdownMenu.Root><DropdownMenu.Trigger className="focus-ring ml-1 flex items-center gap-2 rounded-[10px] px-2 py-1.5 hover:bg-[#f3f6f9]"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eaf2ff] text-[#1768f2]"><UserRound size={17} /></span><span className="hidden text-left md:block"><span className="block text-xs font-semibold text-[#263557]">{current.label}</span><span className="block text-[10px] text-[#8b96a9]">美味中央厨房</span></span><ChevronDown size={14} className="text-[#8490a3]" /></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-56 rounded-xl border border-[#dfe5ee] bg-white p-1.5 shadow-xl"><p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9aa4b5]">切换演示身份</p>{roles.map((role) => <DropdownMenu.Item key={role.value} onSelect={() => changeRole(role.value)} className={cn("focus-ring flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 outline-none", role.value === currentRole ? "bg-[#edf4ff]" : "hover:bg-[#f4f6f9]")}><span className={cn("h-2 w-2 rounded-full", role.value === currentRole ? "bg-[#1768f2]" : "bg-[#cbd3df]")} /><span><span className="block text-sm font-medium text-[#2c3a58]">{role.label}</span><span className="block text-[11px] text-[#8792a6]">{role.detail}</span></span></DropdownMenu.Item>)}<DropdownMenu.Separator className="my-1 h-px bg-[#e8edf3]" /><DropdownMenu.Item onSelect={resetDemo} className="focus-ring flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-[#64718a] outline-none hover:bg-[#f4f6f9]"><RotateCcw size={15} />重置演示数据</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div></div></header><main className="min-h-screen pt-16 lg:pl-[224px]"><div className="mx-auto max-w-[1680px] p-4 sm:p-5 lg:p-6">{children}</div></main>{mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-[#0e1830]/35" onClick={() => setMobileOpen(false)} aria-label="关闭导航" /><aside className="absolute inset-y-0 left-0 w-[280px] border-r border-[#e5eaf1] bg-white shadow-2xl"><button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 rounded-lg p-2 text-[#64718a] hover:bg-[#f2f5f9]" aria-label="关闭导航"><X size={18} /></button><SidebarContent onNavigate={() => setMobileOpen(false)} /></aside></div>}<Dialog.Root open={commandOpen} onOpenChange={setCommandOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-[#101a32]/35 backdrop-blur-[2px]" /><Dialog.Content className="fixed left-1/2 top-[18%] z-50 w-[min(92vw,620px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[#dfe5ee] bg-white shadow-2xl"><div className="flex items-center gap-3 border-b border-[#e7ebf2] px-4"><Search size={19} className="text-[#7a879d]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入功能名称..." className="h-14 flex-1 border-0 bg-transparent text-base text-[#1f2d4b] outline-none placeholder:text-[#a0a9b8]" /><Dialog.Close className="rounded-lg p-2 text-[#8390a5] hover:bg-[#f2f5f8]"><X size={18} /></Dialog.Close></div><div className="max-h-[360px] overflow-auto p-2">{filtered.map(([label, href]) => <button key={href} onClick={() => { router.push(href); setCommandOpen(false); setQuery(""); }} className="focus-ring flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-[#34425f] hover:bg-[#f4f7fb]"><span>{label}</span><span className="text-xs text-[#9aa4b5]">打开</span></button>)}{filtered.length === 0 && <div className="py-10 text-center text-sm text-[#8b96a8]">没有找到相关功能</div>}</div></Dialog.Content></Dialog.Portal></Dialog.Root></div>;
}
