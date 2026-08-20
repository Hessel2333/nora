"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  Box,
  Boxes,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Filter,
  GitCompare,
  Layers3,
  PackagePlus,
  Search,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { HelpTip } from "@/components/help-tip";
import {
  Badge,
  Button,
  Card,
  Field,
  MetricCard,
  Modal,
  PageHeader,
  Progress,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import { useNoraStore } from "@/lib/store";
import { getBomVersionValidityState, nextAvailableBomVersion, toLocalDateTimeInput } from "@/lib/bom-validity";
import type { Bom, BomVersionValidityState } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const productType: Record<
  string,
  [string, "neutral" | "info" | "success" | "warning" | "purple"]
> = {
  raw: ["原料", "warning"],
  semi: ["半成品", "purple"],
  processed: ["加工品", "info"],
  finished: ["成品", "success"],
  combo: ["组合商品", "neutral"],
};

export function ProductsPage() {
  const products = useNoraStore((s) => s.products);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () =>
      products.filter(
        (p) =>
          (type === "all" || p.type === type) &&
          `${p.name}${p.code}${p.category}`.includes(query),
      ),
    [products, query, type],
  );
  return (
    <>
      <PageHeader
        title="产品档案"
        actions={
          <Button onClick={() => setOpen(true)}>
            <PackagePlus size={16} />
            新建商品
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="商品总数"
          value={String(products.length)}
          icon={Box}
        />
        <MetricCard
          label="成品"
          value={String(products.filter((p) => p.type === "finished").length)}
          icon={ShieldCheck}
          tone="success"
        />
        <MetricCard
          label="低于安全库存"
          value={String(products.filter((p) => p.stock < p.safetyStock).length)}
          icon={Boxes}
          tone="danger"
        />
        <MetricCard
          label="平均毛利率"
          value="41.2"
          suffix="%"
          icon={CircleDollarSign}
          tone="purple"
        />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b border-[#e8edf3] p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95a8]"
            />
            <input
              className={`${inputClass} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索商品名称、编码或分类"
            />
          </div>
          <select
            className={`${inputClass} w-36`}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">全部类型</option>
            {Object.entries(productType).map(([value, [label]]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button variant="secondary">
            <Filter size={15} />
            筛选
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]">
              <tr>
                <th className="px-5 py-3">商品</th>
                <th className="px-5 py-3">类型/分类</th>
                <th className="px-5 py-3">单位</th>
                <th className="px-5 py-3">成本/售价</th>
                <th className="px-5 py-3">可用库存</th>
                <th className="px-5 py-3">税率</th>
                <th className="px-5 py-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[#edf0f4] hover:bg-[#fbfcfe]"
                >
                  <td className="px-5 py-4">
                    <b className="text-[#283651]">{p.name}</b>
                    <p className="font-mono text-[11px] text-[#8b96a9]">
                      {p.code}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={productType[p.type][1]}>
                      {productType[p.type][0]}
                    </Badge>
                    <span className="ml-2 text-xs text-[#78859b]">
                      {p.category}
                    </span>
                  </td>
                  <td className="px-5 py-4">{p.unit}</td>
                  <td className="px-5 py-4 text-sm">
                    {formatCurrency(p.cost)}
                    <p className="text-xs text-[#8b96a9]">
                      售价 {p.price ? formatCurrency(p.price) : "—"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        p.stock < p.safetyStock
                          ? "font-semibold text-[#e54b4b]"
                          : "text-[#31405d]"
                      }
                    >
                      {formatNumber(p.stock)} {p.unit}
                    </span>
                    <Progress
                      className="mt-2 w-24"
                      value={Math.min(100, (p.stock / p.safetyStock) * 70)}
                      tone={p.stock < p.safetyStock ? "danger" : "success"}
                    />
                  </td>
                  <td className="px-5 py-4">{p.taxRate}%</td>
                  <td className="px-5 py-4">
                    <Badge tone="success">启用</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="新建商品"
        description="商品编码在当前企业内不可重复"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={() => setOpen(false)}>保存商品</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="商品名称" required>
            <input className={inputClass} placeholder="请输入商品名称" />
          </Field>
          <Field label="商品类型" required>
            <select className={inputClass}>
              <option>成品</option>
              <option>原料</option>
              <option>半成品</option>
              <option>组合商品</option>
            </select>
          </Field>
          <Field label="商品编码" required hint="留空时按编号规则自动生成">
            <input className={inputClass} placeholder="自动生成" />
          </Field>
          <Field label="基本单位">
            <select className={inputClass}>
              <option>份</option>
              <option>kg</option>
              <option>套</option>
            </select>
          </Field>
        </div>
      </Modal>
    </>
  );
}

function BomCost({
  item,
}: {
  item: { netQuantity: number; yieldRate: number; unitCost: number };
}) {
  const gross = item.netQuantity / item.yieldRate;
  return (
    <>
      <span>{gross.toFixed(3)}</span>
      <span>{formatCurrency(gross * item.unitCost)}</span>
    </>
  );
}

const bomStatus: Record<BomVersionValidityState, [string, "neutral" | "info" | "success" | "warning" | "purple"]> = {
  current: ["当前生效", "success"],
  scheduled: ["计划生效", "purple"],
  draft: ["草稿", "neutral"],
  historical: ["历史版本", "warning"],
};

function bomValidity(version: {
  status: Bom["status"];
  effectiveAt: string | null;
  effectiveTo?: string | null;
}) {
  return getBomVersionValidityState({
    status: version.status,
    effectiveAt: version.effectiveAt || null,
    effectiveTo: version.effectiveTo,
  });
}

const bomDateTime = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatBomTime(value?: string | null) {
  return value ? bomDateTime.format(new Date(value)) : "—";
}

function formatAuditActor(actor: string) {
  return actor === "migration:historical-actor-unknown" ? "历史迁移 · 操作者未知" : actor;
}

function latestPublishedEffectiveAt(bom: Bom) {
  return Math.max(
    Date.now(),
    ...(bom.versions ?? [])
      .filter((version) => version.status !== "draft" && version.effectiveAt)
      .map((version) => new Date(version.effectiveAt as string).getTime()),
  );
}

function suggestedPublishTime(bom: Bom) {
  const latest = new Date(latestPublishedEffectiveAt(bom));
  const suggestion = new Date(latest);
  suggestion.setDate(suggestion.getDate() + 1);
  suggestion.setHours(6, 0, 0, 0);
  if (suggestion <= latest) suggestion.setDate(suggestion.getDate() + 1);
  return toLocalDateTimeInput(suggestion);
}

function minimumPublishTime(bom: Bom) {
  return toLocalDateTimeInput(new Date(latestPublishedEffectiveAt(bom) + 60_000));
}

export function BomsPage({ detail = false, bomId }: { detail?: boolean; bomId?: string }) {
  const boms = useNoraStore((state) => state.boms);
  const mode = useNoraStore((state) => state.mode);
  const bom = boms.find((item) => item.id === bomId) ?? boms[0];
  const copyBomVersion = useNoraStore((state) => state.copyBomVersion);
  const publishBomVersion = useNoraStore((state) => state.publishBomVersion);
  const [compare, setCompare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishTiming, setPublishTiming] = useState<"now" | "scheduled">("now");
  const scheduledInputRef = useRef<HTMLInputElement>(null);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const nextShift = new Date();
    nextShift.setDate(nextShift.getDate() + 1);
    nextShift.setHours(6, 0, 0, 0);
    return toLocalDateTimeInput(nextShift);
  });
  if (!bom) return <Card className="p-8 text-sm text-[var(--text-tertiary)]">暂无生产配方数据</Card>;
  const total = bom.items.reduce(
    (sum, i) => sum + (i.netQuantity / i.yieldRate) * i.unitCost,
    0,
  );
  const runVersionAction = async () => {
    if (bom.status === "draft") {
      setOperationError("");
      setScheduledAt(suggestedPublishTime(bom));
      setPublishOpen(true);
      return;
    }
    setSaving(true);
    setOperationError("");
    try {
      await copyBomVersion(
        bom.id,
        nextAvailableBomVersion(bom.version, bom.versions?.map((version) => version.version) ?? [bom.version]),
        bom.versionId,
      );
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "BOM 操作失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  };
  const confirmPublish = async () => {
    if (!bom.versionId) return;
    const scheduledValue = scheduledInputRef.current?.value || scheduledAt;
    const effectiveAt = publishTiming === "scheduled" ? new Date(scheduledValue) : null;
    if (effectiveAt && (Number.isNaN(effectiveAt.getTime()) || effectiveAt <= new Date())) {
      setOperationError("计划生效时间必须晚于当前时间。");
      return;
    }
    setSaving(true);
    setOperationError("");
    try {
      await publishBomVersion(
        bom.versionId,
        bom.revision ?? 1,
        effectiveAt?.toISOString(),
      );
      setPublishOpen(false);
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "发布失败，请刷新后重试。");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title={detail ? `${bom.productName} · ${bom.version}` : "生产配方"}
        actions={
          <>
            {mode !== "production" && (
              <Button variant="secondary" onClick={() => setCompare((v) => !v)}>
                <GitCompare size={16} />
                {compare ? "关闭对比" : "版本对比"}
              </Button>
            )}
            {mode !== "production" && (
              <Button disabled={saving} onClick={() => void runVersionAction()}>
                {bom.status === "draft" ? <ShieldCheck size={16} /> : <PackagePlus size={16} />}
                {bom.status === "draft" ? "发布版本" : "复制新版本"}
              </Button>
            )}
          </>
        }
      />
      {operationError && <p className="mb-4 text-sm text-[var(--status-danger)]" role="alert">{operationError}</p>}
      {!detail && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="p-3">
            <div className="mb-3 px-2 pt-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8995a8]"
                />
                <input
                  className={`${inputClass} pl-9`}
                  placeholder="搜索产品或版本"
                />
              </div>
            </div>
            {boms.map((item) => (
              <Link
                key={item.id}
                href={`/catalog/boms/${item.id}`}
                className={`mb-1 flex items-center gap-3 rounded-xl p-3 ${item.id === bom.id ? "bg-[#edf4ff]" : "hover:bg-[#f5f7fa]"}`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.id === bom.id ? "bg-[#1768f2] text-white" : "bg-[#eef1f5] text-[#68758d]"}`}
                >
                  <Box size={17} />
                </span>
                <span className="flex-1">
                  <b className="block text-sm text-[#2b3955]">{item.productName}</b>
                  <span className="text-[11px] text-[#8a95a8]">
                    {item.version} · {bomStatus[bomValidity(item)][0]}
                  </span>
                </span>
                <ChevronRight size={15} className="text-[#9ba5b6]" />
              </Link>
            ))}
          </Card>
          <BomDetail bom={bom} total={total} compare={compare} />
        </div>
      )}
      {detail && <BomDetail bom={bom} total={total} compare={compare} />}
      <Modal
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={`发布配方 ${bom.version}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPublishOpen(false)} disabled={saving}>取消</Button>
            <Button onClick={() => void confirmPublish()} disabled={saving}>
              <ShieldCheck size={16} />
              {saving ? "发布中…" : publishTiming === "scheduled" ? "确认计划发布" : "确认立即发布"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex justify-end"><HelpTip title="版本规则">发布后如需修改，请创建新版本；历史订单继续使用审批时冻结的配方。</HelpTip></div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="生效方式">
            <Button
              variant={publishTiming === "now" ? "primary" : "secondary"}
              onClick={() => setPublishTiming("now")}
            >
              立即生效
            </Button>
            <Button
              variant={publishTiming === "scheduled" ? "primary" : "secondary"}
              onClick={() => setPublishTiming("scheduled")}
            >
              <CalendarClock size={16} />
              计划生效
            </Button>
          </div>
          {publishTiming === "scheduled" && (
            <Field label="计划生效时间" required>
              <input
                ref={scheduledInputRef}
                type="datetime-local"
                className={inputClass}
                value={scheduledAt}
                min={minimumPublishTime(bom)}
                onChange={(event) => setScheduledAt(event.target.value)}
              />
            </Field>
          )}
          <div className="flex justify-end rounded-xl border border-[#dce6f5] bg-[#f7faff] px-2 py-1.5">
            <HelpTip title="发布影响">{publishTiming === "scheduled" ? "当前版本会持续有效，到达计划时间后再切换生产配方。" : "新版本将立即生效；已审核订单和已释放工单继续使用原快照。"}</HelpTip>
          </div>
          {operationError && <p className="text-sm text-[var(--status-danger)]" role="alert">{operationError}</p>}
        </div>
      </Modal>
    </>
  );
}

function BomDetail({
  bom,
  total,
  compare,
}: {
  bom: ReturnType<typeof useNoraStore.getState>["boms"][number];
  total: number;
  compare: boolean;
}) {
  const selectedValidity = bomValidity(bom);
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs text-[#8692a6]">产出商品</p>
            <b className="mt-1 block text-base">{bom.productName}</b>
          </div>
          <div>
            <div className="mt-1 flex gap-2">
              <b>{bom.version}</b>
              <Badge tone={bomStatus[selectedValidity][1]}>{bomStatus[selectedValidity][0]}</Badge>
            </div>
          </div>
          <div>
            <p className="text-xs text-[#8692a6]">标准产出</p>
            <b className="mt-1 block">
              {bom.outputQuantity} {bom.outputUnit}
            </b>
          </div>
          <div>
            <p className="text-xs text-[#8692a6]">材料成本</p>
            <b className="mt-1 block text-[#1768f2]">
              {formatCurrency(total)} / {bom.outputUnit}
            </b>
          </div>
        </div>
      </Card>
      <BomVersionTimeline bom={bom} />
      {compare && (
        <Card className="border-[#cfdcff] bg-[#f8faff] p-4">
          <div className="flex items-center gap-3">
            <GitCompare className="text-[#1768f2]" size={20} />
            <div>
              <b>
                版本对比 {bom.previousVersion} → {bom.version}
              </b>
              <p className="text-xs text-[#6f7d96]">
                鸡胸肉净用量 -0.020kg · 出成率 +2% · 单位成本下降 ¥0.36
              </p>
            </div>
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        <SectionTitle
          title="配方用料结构"
          description="毛料需求 = 净用量 ÷ 出成率"
          action={<Badge tone="info">最多三级</Badge>}
        />
        <div className="overflow-x-auto">
          <div className="grid min-w-[780px] grid-cols-[1.7fr_.65fr_.65fr_.65fr_.65fr] gap-3 bg-[#fafbfd] px-5 py-3 text-[11px] font-semibold text-[#8792a6]">
            <span>物料</span>
            <span>净用量</span>
            <span>出成率</span>
            <span>毛料需求</span>
            <span>材料成本</span>
          </div>
          {bom.items.map((item, index) => (
            <div
              key={item.id}
              className="grid min-w-[780px] grid-cols-[1.7fr_.65fr_.65fr_.65fr_.65fr] items-center gap-3 border-t border-[#edf0f4] px-5 py-4 text-sm"
            >
              <span
                className="flex items-center gap-3"
                style={{ paddingLeft: (item.level - 1) * 20 }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef3f8] text-[#5f6e87]">
                  <Layers3 size={15} />
                </span>
                <span>
                  <b className="block text-[#2d3b57]">{item.name}</b>
                  <span className="text-[11px] text-[#8994a8]">
                    层级 {item.level} · {item.componentId}
                  </span>
                </span>
              </span>
              <span>
                {item.netQuantity.toFixed(3)} {item.unit}
              </span>
              <span>{(item.yieldRate * 100).toFixed(0)}%</span>
              <BomCost item={item} />
            </div>
          ))}
        </div>
        <div className="flex justify-end border-t border-[#e8edf3] bg-[#fafbfd] px-5 py-4">
          <p className="text-sm text-[#64718a]">
            标准材料成本{" "}
            <b className="ml-4 text-lg text-[#17213f]">
              {formatCurrency(total)}
            </b>
          </p>
        </div>
      </Card>
    </div>
  );
}

function BomVersionTimeline({ bom }: { bom: Bom }) {
  const versions = bom.versions?.length
    ? bom.versions
    : [{
        id: bom.versionId ?? `${bom.id}-current`,
        version: bom.version,
        status: bom.status,
        effectiveAt: bom.effectiveAt || null,
        effectiveTo: bom.effectiveTo ?? null,
        publishedAt: bom.status === "draft" ? null : bom.effectiveAt || null,
        revision: bom.revision ?? 1,
        events: [],
      }];
  const ordered = [...versions].sort((left, right) => {
    if (left.status === "draft" && right.status !== "draft") return -1;
    if (right.status === "draft" && left.status !== "draft") return 1;
    return new Date(right.effectiveAt ?? 0).getTime() - new Date(left.effectiveAt ?? 0).getTime();
  });
  return (
    <Card className="overflow-hidden">
      <SectionTitle
        title="版本时间线"
        action={<span className="inline-flex items-center gap-1"><Badge tone="info">{ordered.length} 个版本</Badge><HelpTip title="版本说明">计划生效的新版本不会提前替换当前配方。</HelpTip></span>}
      />
      <div className="divide-y divide-[#edf0f4]">
        {ordered.map((version) => {
          const validity = bomValidity(version);
          const lastEvent = version.events?.[0];
          return (
            <div key={version.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-[#1768f2]">
                <CalendarClock size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm text-[#2d3b57]">{version.version}</b>
                  <Badge tone={bomStatus[validity][1]}>{bomStatus[validity][0]}</Badge>
                  <span className="text-[11px] text-[#8994a8]">修订 {version.revision}</span>
                </div>
                <p className="mt-1 text-xs text-[#69778f]">
                  {validity === "draft" && "尚未发布"}
                  {validity === "scheduled" && `计划于 ${formatBomTime(version.effectiveAt)} 生效${version.effectiveTo ? `，至 ${formatBomTime(version.effectiveTo)}` : ""}`}
                  {validity === "current" && `自 ${formatBomTime(version.effectiveAt)} 起生效${version.effectiveTo ? `，至 ${formatBomTime(version.effectiveTo)}` : ""}`}
                  {validity === "historical" && `${formatBomTime(version.effectiveAt)} — ${formatBomTime(version.effectiveTo)}`}
                </p>
              </div>
              <div className="text-xs text-[#7d899d] sm:text-right">
                {lastEvent ? (
                  <>
                    <p>{formatAuditActor(lastEvent.actor)}</p>
                    <p className="mt-0.5 text-[11px] text-[#9aa4b4]">{formatBomTime(lastEvent.createdAt)}</p>
                  </>
                ) : (
                  <p>暂无操作记录</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function CatalogSettingsPage() {
  return (
    <>
      <PageHeader title="商品基础设置" metadata={<HelpTip title="设置说明">当前页面仅供查看，暂不支持新增或修改。</HelpTip>} />
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          [Tag, "商品分类", ["净菜包", "肉类前处理", "禽肉类", "叶菜类"]],
          [Box, "计量单位", ["千克 kg", "份", "套", "箱"]],
          [
            CircleDollarSign,
            "税率",
            ["6% 餐饮成品", "9% 农产品", "13% 包装耗材"],
          ],
        ].map(([Icon, title, items]) => {
          const I = Icon as typeof Tag;
          return (
            <Card key={title as string} className="p-5">
              <I size={20} className="text-[#1768f2]" />
              <h2 className="mt-3 font-semibold">{title as string}</h2>
              <div className="mt-4 space-y-2">
                {(items as string[]).map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-lg bg-[#f5f7fa] px-3 py-2.5 text-sm"
                  >
                    <span>{item}</span>
                    <Badge tone="success">启用</Badge>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
