"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import { RotateCcw, ScanLine, ShieldCheck } from "lucide-react";
import { SHOWROOM_BOM, TRACEABILITY_SCENARIO } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

export function TraceabilityScene({ progress, onInteract }: { progress: number; onInteract: () => void }) {
  const [recallActive, setRecallActive] = useState(false);
  const traceProgress = Math.max(0, Math.min(1, (progress - 0.16) / 0.52));

  return (
    <section className={`${styles.scene} ${styles.traceabilityScene}`}>
      <SceneTitle eyebrow="08 · TRACEABILITY" title="每一份净配菜，都能追溯到它来自哪里" description="从成品批次回溯原料、人员、工序和冷链记录。" />

      <div className={styles.traceCanvas} data-recall={recallActive} style={{ "--trace-progress": traceProgress } as CSSProperties}>
        <svg className={styles.traceConnections} viewBox="0 0 1200 560" aria-hidden="true">
          <path d="M612 276 C520 276 520 92 408 92 H98" />
          <path d="M612 276 C520 276 520 172 408 172 H98" />
          <path d="M612 276 C520 276 520 252 408 252 H98" />
          <path d="M612 276 C520 276 520 332 408 332 H98" />
          <path d="M612 276 C520 276 520 412 408 412 H98" />
          <path d="M612 276 C520 276 520 492 408 492 H98" />
          <path d="M692 276 C790 276 790 126 902 126 H1132" />
          <path d="M692 276 C790 276 790 236 902 236 H1132" />
          <path d="M692 276 C790 276 790 346 902 346 H1132" />
          <path d="M692 276 C790 276 790 456 902 456 H1132" />
        </svg>

        <div className={styles.tracePack}>
          <div><Image src={SHOWROOM_BOM.finished.image} alt="宫保鸡丁净菜包批次" fill sizes="300px" /></div>
          <span><ScanLine size={22} /></span>
          <small>成品批次</small>
          <strong>{TRACEABILITY_SCENARIO.finished.code}</strong>
          <p>{TRACEABILITY_SCENARIO.finished.label} · {SHOWROOM_BOM.finished.quantity} g</p>
        </div>

        <div className={styles.traceChain}>
          {TRACEABILITY_SCENARIO.chain.map((node, index) => (
            <button
              type="button"
              data-showroom-control
              key={node.code}
              data-raw={node.type === "原料批次"}
              className={progress > 0.18 + index * 0.075 ? styles.isVisible : ""}
              onClick={() => onInteract()}
            >
              <i /><span><small>{node.type}</small><strong>{node.label}</strong><em>{node.code}</em></span>
            </button>
          ))}
        </div>

        <div className={styles.traceFacts}>
          {TRACEABILITY_SCENARIO.facts.map((fact, index) => (
            <button type="button" data-showroom-control key={fact.label} onClick={onInteract} className={progress > 0.3 + index * 0.075 ? styles.isVisible : ""}>
              <i /><span><small>{fact.label}</small><strong>{fact.value}</strong></span>
            </button>
          ))}
        </div>

        <button
          type="button"
          data-showroom-control
          className={styles.recallTrigger}
          onClick={() => { onInteract(); setRecallActive((value) => !value); }}
        >
          {recallActive ? <RotateCcw size={18} /> : <ShieldCheck size={18} />}
          {recallActive ? "结束模拟" : "模拟批次召回"}
          <small>演练数据</small>
        </button>

        <div className={styles.recallImpact}>
          <p>原料批次 RM260813124 · 模拟召回影响</p>
          <span><small>影响成品批次</small><strong>{TRACEABILITY_SCENARIO.recall.batches}</strong></span>
          <span><small>影响门店</small><strong>{TRACEABILITY_SCENARIO.recall.stores}</strong></span>
          <span><small>影响数量</small><strong>{TRACEABILITY_SCENARIO.recall.portions}<em>份</em></strong></span>
        </div>
      </div>
    </section>
  );
}
