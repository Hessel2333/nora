"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Box, Boxes, CircleDollarSign, Search, ShieldCheck } from "lucide-react";
import { Badge, Card, MetricCard, PageHeader, Progress, inputClass } from "@/components/ui";
import { findLatestBomDraft, getBomVersionValidityState } from "@/lib/bom-validity";
import { useNoraStore } from "@/lib/store";
import type { Bom, Product, StatusTone } from "@/lib/types";
import { formatCurrency, formatNumber } from "@/lib/utils";

const productType: Record<string, [string, "neutral" | "info" | "success" | "warning" | "purple"]> = {
  raw: ["原料", "warning"],
  semi: ["半成品", "purple"],
  processed: ["加工品", "info"],
  finished: ["成品", "success"],
  combo: ["组合商品", "neutral"],
};

const recipeProductTypes = new Set<Product["type"]>(["semi", "processed", "finished", "combo"]);

function getRecipePresentation(product: Product, bom?: Bom): {
  label: string;
  tone: StatusTone;
  href?: string;
} {
  if (!bom) {
    return recipeProductTypes.has(product.type)
      ? { label: "尚无配方", tone: "warning" }
      : { label: "无需配方", tone: "neutral" };
  }
  const draft = findLatestBomDraft(bom);
  if (draft) return { label: `有草稿 · ${draft.version}`, tone: "warning", href: `/catalog/boms/${bom.id}` };
  const validity = bom.validityState ?? getBomVersionValidityState({
    status: bom.status,
    effectiveAt: bom.effectiveAt || null,
    effectiveTo: bom.effectiveTo,
  });
  if (validity === "scheduled") return { label: `计划生效 · ${bom.version}`, tone: "purple", href: `/catalog/boms/${bom.id}` };
  if (validity === "historical") return { label: `历史配方 · ${bom.version}`, tone: "neutral", href: `/catalog/boms/${bom.id}` };
  return { label: `当前生效 · ${bom.version}`, tone: "success", href: `/catalog/boms/${bom.id}` };
}

export function ProductsPage() {
  const products = useNoraStore((state) => state.products);
  const boms = useNoraStore((state) => state.boms);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const rows = useMemo(
    () => products.filter((product) =>
      (type === "all" || product.type === type)
      && `${product.name}${product.code}${product.category}`.includes(query),
    ),
    [products, query, type],
  );
  const pricedProducts = products.filter((product) => product.price > 0);
  const averageMargin = pricedProducts.length
    ? pricedProducts.reduce((sum, product) => sum + ((product.price - product.cost) / product.price) * 100, 0) / pricedProducts.length
    : 0;

  return <>
    <PageHeader title="产品档案" />

    <div className="horizontal-snap -mx-4 mb-4 grid grid-flow-col auto-cols-[82%] gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
      <MetricCard label="商品总数" value={String(products.length)} icon={Box} />
      <MetricCard label="成品" value={String(products.filter((product) => product.type === "finished").length)} icon={ShieldCheck} tone="success" />
      <MetricCard label="低于安全库存" value={String(products.filter((product) => product.stock < product.safetyStock).length)} icon={Boxes} tone="danger" />
      <MetricCard label="在售商品平均毛利率" value={averageMargin.toFixed(1)} suffix="%" icon={CircleDollarSign} tone="purple" />
    </div>

    <Card className="overflow-hidden">
      <div className="flex flex-wrap gap-3 border-b border-[#e8edf3] p-3 sm:p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a95a8]" />
          <input
            aria-label="搜索商品"
            className={`${inputClass} pl-9`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索商品名称、编码或分类"
          />
        </div>
        <select aria-label="商品类型" className={`${inputClass} flex-1 sm:w-36 sm:flex-none`} value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">全部类型</option>
          {Object.entries(productType).map(([value, [label]]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div className="divide-y divide-[#edf0f4] md:hidden">
        {rows.map((product) => {
          const belowSafetyStock = product.stock < product.safetyStock;
          const recipe = getRecipePresentation(product, boms.find((bom) => bom.productId === product.id));
          return <div key={product.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-semibold text-[#1768f2]">{product.code}</p>
                <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.02em] text-[#1d2939]">
                  {recipe.href ? <Link href={recipe.href} className="focus-ring rounded-md hover:text-[var(--interactive)]">{product.name}</Link> : product.name}
                </h2>
                <p className="mt-1 text-xs text-[#667085]">{product.category} · 基本单位 {product.unit}</p>
              </div>
              <Badge tone={productType[product.type][1]}>{productType[product.type][0]}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-[#f6f8fb] p-3">
              <div><span className="text-[11px] text-[#98a2b3]">可用库存</span><strong className={`mt-1 block tabular-nums text-sm ${belowSafetyStock ? "text-[#d92d20]" : "text-[#344054]"}`}>{formatNumber(product.stock)} {product.unit}</strong></div>
              <div className="text-right"><span className="text-[11px] text-[#98a2b3]">成本 / 售价</span><strong className="mt-1 block tabular-nums text-sm text-[#344054]">{formatCurrency(product.cost)} / {product.price ? formatCurrency(product.price) : "—"}</strong></div>
              <Progress className="col-span-2 h-1.5" value={Math.min(100, Math.round(product.stock / product.safetyStock * 70))} tone={belowSafetyStock ? "danger" : "success"} />
            </div>
            <div className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-[#edf0f4] pt-3">
              <Badge tone={recipe.tone}>{recipe.label}</Badge>
              {recipe.href && <Link href={recipe.href} className="focus-ring inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--interactive)] hover:bg-[var(--interactive-soft)]">查看生产配方<ArrowRight size={14} /></Link>}
            </div>
          </div>;
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[980px] text-left">
          <thead className="bg-[#fafbfd] text-[11px] text-[#8792a6]"><tr><th className="min-w-44 px-5 py-3">商品</th><th className="px-5 py-3">类型/分类</th><th className="px-5 py-3">单位</th><th className="px-5 py-3">成本/售价</th><th className="px-5 py-3">可用库存</th><th className="px-5 py-3">税率</th><th className="min-w-52 px-5 py-3">生产配方</th></tr></thead>
          <tbody>{rows.map((product) => {
            const recipe = getRecipePresentation(product, boms.find((bom) => bom.productId === product.id));
            return <tr key={product.id} className="border-t border-[#edf0f4] hover:bg-[#fbfcfe]">
            <td className="px-5 py-4">{recipe.href ? <Link href={recipe.href} className="focus-ring whitespace-nowrap rounded-md font-semibold text-[#283651] hover:text-[var(--interactive)]">{product.name}</Link> : <b className="whitespace-nowrap text-[#283651]">{product.name}</b>}<p className="font-mono text-[11px] text-[#8b96a9]">{product.code}</p></td>
            <td className="px-5 py-4"><Badge tone={productType[product.type][1]}>{productType[product.type][0]}</Badge><span className="ml-2 text-xs text-[#78859b]">{product.category}</span></td>
            <td className="px-5 py-4">{product.unit}</td>
            <td className="px-5 py-4 text-sm">{formatCurrency(product.cost)}<p className="text-xs text-[#8b96a9]">售价 {product.price ? formatCurrency(product.price) : "—"}</p></td>
            <td className="px-5 py-4"><span className={product.stock < product.safetyStock ? "font-semibold text-[#e54b4b]" : "text-[#31405d]"}>{formatNumber(product.stock)} {product.unit}</span><Progress className="mt-2 w-24" value={Math.min(100, Math.round(product.stock / product.safetyStock * 70))} tone={product.stock < product.safetyStock ? "danger" : "success"} /></td>
            <td className="px-5 py-4">{product.taxRate}%</td>
            <td className="px-5 py-4"><div className="flex items-center justify-between gap-3"><Badge tone={recipe.tone}>{recipe.label}</Badge>{recipe.href && <Link href={recipe.href} aria-label={`查看${product.name}生产配方`} className="focus-ring inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--interactive)] hover:bg-[var(--interactive-soft)]">查看<ArrowRight size={14} /></Link>}</div></td>
          </tr>})}</tbody>
        </table>
      </div>

      {rows.length === 0 && <div className="px-5 py-12 text-center"><Search className="mx-auto text-[#b8c1cf]" /><p className="mt-3 font-medium text-[#344054]">没有匹配的商品</p><p className="mt-1 text-sm text-[#98a2b3]">请调整搜索词或商品类型</p></div>}
    </Card>
  </>;
}
