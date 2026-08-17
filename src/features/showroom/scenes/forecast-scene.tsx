"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { CloudSun, Sparkles } from "lucide-react";
import { FORECAST_SCENARIO } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const chartPoint = (value: number, index: number, values: number[]) => {
  const min = Math.min(...FORECAST_SCENARIO.actual, ...FORECAST_SCENARIO.predicted) - 120;
  const max = Math.max(...FORECAST_SCENARIO.actual, ...FORECAST_SCENARIO.predicted) + 120;
  return `${(index / (values.length - 1)) * 1000},${240 - ((value - min) / (max - min)) * 205}`;
};

export function ForecastScene({ progress, onInteract }: { progress: number; onInteract: () => void }) {
  const [selectedStoreId, setSelectedStoreId] = useState(FORECAST_SCENARIO.stores[2].id);
  const selectedStore = useMemo(
    () => FORECAST_SCENARIO.stores.find((store) => store.id === selectedStoreId) ?? FORECAST_SCENARIO.stores[0],
    [selectedStoreId],
  );
  const networkProgress = Math.max(0, Math.min(1, (progress - 0.08) / 0.28));
  const curveProgress = Math.max(0, Math.min(1, (progress - 0.32) / 0.42));

  return (
    <section className={`${styles.scene} ${styles.forecastScene}`}>
      <SceneTitle eyebrow="01 · FORECAST" title="订单还没来，Nora 已经开始准备" description="从历史销量、门店趋势和经营因素中，提前预测明日需求。" />

      <div className={styles.forecastCanvas} style={{ "--forecast-network": networkProgress, "--forecast-curve": curveProgress } as CSSProperties}>
        <div className={styles.storeField}>
          <svg viewBox="0 0 520 520" aria-hidden="true">
            {FORECAST_SCENARIO.stores.map((store) => (
              <path key={store.id} d={`M${store.x * 5.2} ${store.y * 4.7} C260 ${store.y * 4.7}, 290 255, 415 255`} />
            ))}
            <circle cx="415" cy="255" r="74" />
          </svg>
          {FORECAST_SCENARIO.stores.map((store, index) => (
            <button
              key={store.id}
              type="button"
              data-showroom-control
              data-selected={selectedStore.id === store.id}
              onClick={() => { onInteract(); setSelectedStoreId(store.id); }}
              style={{ left: `${store.x}%`, top: `${store.y}%`, "--store-delay": index } as CSSProperties}
            >
              <i /><span><strong>{store.name}</strong><small>{store.portions} 份 · {store.change > 0 ? "+" : ""}{store.change}%</small></span>
            </button>
          ))}
          <div className={styles.forecastCore}>
            <span><Sparkles size={20} /></span>
            <small>明日需求预测</small>
            <strong>3,364<em>份</em></strong>
            <p>{selectedStore.name}贡献 {selectedStore.portions} 份</p>
          </div>
        </div>

        <div className={styles.forecastDishes}>
          {FORECAST_SCENARIO.dishes.map((dish, index) => (
            <div key={dish.name} className={progress > 0.24 + index * 0.08 ? styles.isVisible : ""}>
              <span>{dish.name}</span>
              <strong>{dish.portions.toLocaleString("zh-CN")}<small>份</small></strong>
              <em data-negative={dish.change < 0}>{dish.change > 0 ? "↑" : "↓"} {Math.abs(dish.change)}%</em>
            </div>
          ))}
        </div>

        <div className={styles.forecastCurve}>
          <header><span>过去 14 天 · 实际销量 vs AI 预测</span><p><i />实际销量 <i />AI 预测</p></header>
          <svg viewBox="0 0 1000 260" preserveAspectRatio="none" role="img" aria-label="过去十四天实际销量和 AI 预测曲线">
            <path className={styles.forecastGridLine} d="M0 50 H1000 M0 120 H1000 M0 190 H1000" />
            <polyline pathLength="1" className={styles.actualCurve} points={FORECAST_SCENARIO.actual.map((value, index, values) => chartPoint(value, index, values)).join(" ")} />
            <polyline pathLength="1" className={styles.predictedCurve} points={FORECAST_SCENARIO.predicted.map((value, index, values) => chartPoint(value, index, values)).join(" ")} />
          </svg>
          <div className={styles.forecastDates}>{FORECAST_SCENARIO.dates.map((date) => <span key={date}>{date}</span>)}</div>
        </div>

        <div className={styles.forecastFactors}>
          <span><CloudSun size={18} />预测因素</span>
          {FORECAST_SCENARIO.factors.map((factor, index) => <i key={factor} className={progress > 0.1 + index * 0.065 ? styles.isVisible : ""}>{factor}</i>)}
          <strong className={progress > 0.74 ? styles.isVisible : ""}><small>明日鸡胸肉预计需求</small>+18.6%</strong>
        </div>
      </div>
    </section>
  );
}
