"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import { SHOWROOM_BOM, SHOWROOM_ORDER, SHOWROOM_ORDER_METRICS } from "../showroom-data";
import { CinematicNumber } from "../components/cinematic-number";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const cascade = [
  { label: "净菜产品", detail: "宫保鸡丁净菜包 · 120份" },
  { label: "BOM", detail: "V2.1 数字菜谱" },
  { label: "配方组件", detail: "6 项标准用量" },
  { label: "原料", detail: "14 种毛料" },
  { label: "Routing", detail: "6 道工艺" },
];

export function OrderScene({ progress, onInteract, onOpenBom }: { progress: number; onInteract: () => void; onOpenBom: () => void }) {
  const [selectedDish, setSelectedDish] = useState("p-001");

  const selectDish = (id: string, interactive: boolean) => {
    setSelectedDish(id);
    if (interactive) onOpenBom();
    else onInteract();
  };

  return (
    <section className={`${styles.scene} ${styles.orderScene}`}>
      <SceneTitle eyebrow="02 · ORDER EXPLOSION" title="一张订单，裂变成工厂可以执行的生产语言" description="350 份需求沿着净菜产品、BOM、半成品、原料和工艺路线持续展开。" />

      <div className={styles.orderExplosionCanvas}>
        <svg className={styles.orderGraphLines} viewBox="0 0 1480 470" aria-hidden="true">
          <path d="M150 228 C260 228 250 90 390 90" />
          <path d="M150 228 H390" />
          <path d="M150 228 C260 228 250 366 390 366" />
          <path d="M575 90 C690 90 690 238 780 238" />
          <path d="M900 238 L1010 178 L1120 238 L1230 178 L1360 238" />
        </svg>

        <article className={`${styles.orderSourceNode} ${progress > 0.22 ? styles.isVisible : ""}`}>
          <span className={styles.orderCustomerName}>{SHOWROOM_ORDER.customer}</span>
          <small>销售订单</small>
          <strong>{SHOWROOM_ORDER.portions}<em>份</em></strong>
          <span className={styles.orderCode}>#{SHOWROOM_ORDER.code}</span>
          <p>{SHOWROOM_ORDER.deliveryAt} 配送</p>
        </article>

        <div className={styles.orderDishField}>
          {SHOWROOM_ORDER.lines.map((line, index) => (
            <button
              key={line.id}
              type="button"
              data-showroom-control
              data-index={index}
              data-selected={selectedDish === line.id}
              className={progress > 0.18 + index * 0.075 ? styles.isVisible : ""}
              onClick={() => selectDish(line.id, line.interactive)}
            >
              <i />
              {line.interactive ? (
                <span className={styles.orderDishThumbnail} data-shared-dish-source>
                  <Image src={SHOWROOM_BOM.finished.image} alt="" fill sizes="90px" />
                </span>
              ) : null}
              <span className={styles.orderDishCopy}><small>{line.name}</small><strong>{line.quantity}<em>份</em></strong></span>
            </button>
          ))}
        </div>

        <div className={styles.orderCascade}>
          {cascade.map((node, index) => (
            <button
              key={node.label}
              type="button"
              data-showroom-control
              className={progress > 0.4 + index * 0.07 ? styles.isVisible : ""}
              style={{ "--cascade-index": index } as CSSProperties}
              onClick={index === 0 ? onOpenBom : onInteract}
            >
              <i>{String(index + 1).padStart(2, "0")}</i>
              <span><strong>{node.label}</strong><small>{node.detail}</small></span>
            </button>
          ))}
        </div>

        <div className={styles.orderLiveMetrics}>
          {SHOWROOM_ORDER_METRICS.map((metric, index) => (
            <div key={metric.label} className={progress > 0.56 + index * 0.055 ? styles.isVisible : ""}>
              <CinematicNumber value={metric.value} suffix={metric.suffix} label={metric.label} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
