"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FlaskConical, Plus, Search } from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import { Badge, Button, Card, Field, Modal, PageHeader, inputClass } from "@/components/ui";
import { masterData } from "@/lib/mock-data";

const sections = [
  ["company", "企业资料"], ["organization", "组织架构"], ["employees", "员工档案"],
  ["suppliers", "供应商"], ["access", "角色权限"], ["dictionaries", "基础字典"],
  ["numbering", "编号规则"], ["print-templates", "打印模板"], ["initialization", "初始化导入"],
] as const;

export function MasterDataPage({ section }: { section: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState(masterData[section] ?? []);
  const [draftName, setDraftName] = useState("");
  const [draftMeta, setDraftMeta] = useState("");
  const title = sections.find(([key]) => key === section)?.[1] ?? "基础档案";
  const filtered = useMemo(() => records.filter((record) => `${record.name}${record.code}${record.meta}`.toLowerCase().includes(query.toLowerCase())), [query, records]);
  const addRecord = () => {
    const name = draftName.trim();
    if (!name) return;
    setRecords((items) => [{
      id: `local-${Date.now()}`,
      code: `DEMO-${section.slice(0, 3).toUpperCase()}-${String(items.length + 1).padStart(3, "0")}`,
      name,
      meta: draftMeta.trim() || "暂无补充说明",
      status: "待审核",
    }, ...items]);
    setDraftName("");
    setDraftMeta("");
    setOpen(false);
  };
  return <>
    <PageHeader
      title={title}
      metadata={<HelpTip title="数据说明">本页操作仅用于体验，不会形成正式业务记录。</HelpTip>}
      actions={<Button onClick={() => setOpen(true)}><Plus size={16} />{section === "initialization" ? "新建导入" : "新建记录"}</Button>}
    />
    <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{sections.map(([key, label]) => <Link key={key} href={`/master-data/${key}`} className={`focus-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${key === section ? "border-[#1768f2] bg-[#edf4ff] text-[#1768f2]" : "border-[#dfe5ee] bg-white text-[#65728a] hover:bg-[#f5f7fa]"}`}>{label}</Link>)}</div>
    <Card className="overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8edf3] p-4"><div className="relative w-full max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b96a9]" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} className={`${inputClass} pl-9`} placeholder={`搜索${title}`} /></div><div className="flex items-center gap-2 text-xs text-[#728099]"><FlaskConical size={15} className="text-[#1768f2]" />{filtered.length} 条记录</div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead className="bg-[#fafbfd] text-[11px] uppercase tracking-wide text-[#8792a6]"><tr><th className="px-5 py-3 font-semibold">编码</th><th className="px-5 py-3 font-semibold">名称</th><th className="px-5 py-3 font-semibold">业务信息</th><th className="px-5 py-3 font-semibold">状态</th></tr></thead><tbody>{filtered.map((record) => <tr key={record.id} className="border-t border-[#edf0f4] hover:bg-[#fbfcfe]"><td className="px-5 py-4 font-mono text-xs text-[#56647e]">{record.code}</td><td className="px-5 py-4 font-medium text-[#263451]">{record.name}</td><td className="px-5 py-4 text-sm text-[#69768e]">{record.meta}</td><td className="px-5 py-4"><Badge tone={record.status === "正常" ? "success" : "warning"}>{record.status}</Badge></td></tr>)}</tbody></table></div>
    </Card>
    <Modal open={open} onOpenChange={setOpen} title={`新建${title}`} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>取消</Button><Button onClick={addRecord} disabled={!draftName.trim()}>保存</Button></>}><div className="grid gap-4"><Field label="名称" required><input className={inputClass} value={draftName} onChange={(event) => setDraftName(event.target.value)} placeholder={`请输入${title}名称`} /></Field><Field label="业务说明"><textarea className={`${inputClass} h-24 py-2`} value={draftMeta} onChange={(event) => setDraftMeta(event.target.value)} placeholder="补充负责人、结算方式或适用范围" /></Field></div></Modal>
  </>;
}
