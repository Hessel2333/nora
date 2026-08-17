"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Check, TrendingDown } from "lucide-react";
import { PROCUREMENT_SCENARIO } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const netCost = (price: number, yieldRate: number) => price / (yieldRate / 100);

export function ProcurementScene({ progress, onInteract }: { progress: number; onInteract: () => void }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState("supplier-a");
  const selectedSupplier = useMemo(
    () => PROCUREMENT_SCENARIO.suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? PROCUREMENT_SCENARIO.suppliers[0],
    [selectedSupplierId],
  );
  const lowestQuote = Math.min(...PROCUREMENT_SCENARIO.suppliers.map((supplier) => supplier.price));

  return (
    <section className={`${styles.scene} ${styles.procurementScene}`}>
      <SceneTitle eyebrow="07 · PROCUREMENT DECISION" title="为什么 Nora 没有选择最低报价？" description="采购价只有一半答案；质量、履约和实际出成率共同决定真正的净料成本。" />

      <div className={styles.procurementCanvas}>
        <div className={styles.procurementNeed}>
          <small>采购需求 · {PROCUREMENT_SCENARIO.material}</small>
          <strong>{PROCUREMENT_SCENARIO.quantity}<em>{PROCUREMENT_SCENARIO.unit}</em></strong>
          <p>明日 08:00 前到货</p>
        </div>

        <div className={styles.decisionAxis}>
          <span><i /></span>
          {PROCUREMENT_SCENARIO.suppliers.map((supplier, index) => {
            const actualCost = netCost(supplier.price, supplier.yieldRate);
            const selected = selectedSupplier.id === supplier.id;
            return (
              <button
                key={supplier.id}
                type="button"
                data-showroom-control
                data-recommended={supplier.recommended}
                data-selected={selected}
                className={progress > 0.12 + index * 0.09 ? styles.isVisible : ""}
                onClick={() => { onInteract(); setSelectedSupplierId(supplier.id); }}
              >
                <i><span /></i>
                <small>供应商 {String.fromCharCode(65 + index)}</small>
                <h2>{supplier.name}</h2>
                <div className={styles.quoteToNet}>
                  <span><small>采购报价</small><strong>¥{supplier.price.toFixed(2)}<em>/kg</em></strong></span>
                  <b>→</b>
                  <span><small>实际净料成本</small><strong>¥{actualCost.toFixed(2)}<em>/kg</em></strong></span>
                </div>
                <div className={styles.supplierDecisionFacts}>
                  <span>质量 <strong>{supplier.quality}</strong></span>
                  <span>履约 <strong>{supplier.fulfillment}</strong></span>
                  <span>出成率 <strong>{supplier.yieldRate}%</strong></span>
                </div>
                {supplier.price === lowestQuote ? <em className={styles.lowestQuote}>最低采购价</em> : null}
                {supplier.recommended && progress > 0.62 ? <em className={styles.recommendedMark}><Check size={14} />综合推荐</em> : null}
              </button>
            );
          })}
        </div>

        <div className={`${styles.procurementReasoning} ${progress > 0.58 ? styles.isVisible : ""}`}>
          <div><TrendingDown size={19} /><span><small>最低采购价</small><strong>≠</strong><small>最低实际成本</small></span></div>
          <p>供应商 C 报价低 ¥0.20/kg，但出成率低 2.8 个百分点，净料成本反而高 ¥0.18/kg。</p>
        </div>

        <div className={`${styles.procurementRecommendation} ${progress > 0.66 ? styles.isVisible : ""}`}>
          <span><small>综合推荐</small><strong>{selectedSupplier.name}</strong><em>¥{netCost(selectedSupplier.price, selectedSupplier.yieldRate).toFixed(2)}/kg 净料</em></span>
          <div>{[
            ["价格竞争力", 92],
            ["到货质量", selectedSupplier.quality],
            ["历史履约", selectedSupplier.fulfillment],
            ["供应稳定性", selectedSupplier.stability],
          ].map(([label, value]) => <i key={label as string} style={{ "--score": Number(value) / 100 } as CSSProperties}><small>{label}</small><span><b /></span><strong>{value}</strong></i>)}</div>
        </div>
      </div>
    </section>
  );
}
