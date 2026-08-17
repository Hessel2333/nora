"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { BUSINESS_SCENARIO } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const bridgeValues = [30.4, 29.6, 29.0, 28.7, 27.8, 28.1];
const BRIDGE_WIDTH = 1120;
const BRIDGE_HEIGHT = 330;
const BRIDGE_POINTS = [
  { x: 40, y: 68 },
  { x: 202, y: 126 },
  { x: 390, y: 170 },
  { x: 576, y: 194 },
  { x: 762, y: 258 },
  { x: 946, y: 234 },
  { x: 1080, y: 234 },
] as const;
const BRIDGE_PATH = BRIDGE_POINTS.slice(1).reduce(
  (path, point) => `${path} H${point.x} V${point.y}`,
  `M${BRIDGE_POINTS[0].x} ${BRIDGE_POINTS[0].y}`,
);

function bridgePosition(point: (typeof BRIDGE_POINTS)[number]) {
  return {
    "--bridge-x": `${(point.x / BRIDGE_WIDTH) * 100}%`,
    "--bridge-y": `${(point.y / BRIDGE_HEIGHT) * 100}%`,
  } as CSSProperties;
}

const driverSources: Record<string, string> = {
  "鸡胸肉上涨": "采购到货批次 RM260813124 · 加权价较昨日 +6.2%",
  "实际出成率下降": "肉类前处理 R15 · 实际 91.9%，低于标准 94.0%",
  "加班增加": "包装工序 · 18:00 后工时增加 7.4 小时",
  "促销": "鄞州店午餐促销 · 单份折让 ¥0.42",
  "配送优化": "北线合单配送 · 里程减少 18.6 km",
};

export function BusinessScene({ progress, onInteract }: { progress: number; onInteract: () => void }) {
  const [selectedDriver, setSelectedDriver] = useState(BUSINESS_SCENARIO.attribution[1].label);
  const selectedItem = useMemo(
    () => BUSINESS_SCENARIO.attribution.find((item) => item.label === selectedDriver) ?? BUSINESS_SCENARIO.attribution[0],
    [selectedDriver],
  );

  return (
    <section className={`${styles.scene} ${styles.businessScene}`}>
      <SceneTitle eyebrow="08 · MARGIN BRIDGE" title="毛利率，是如何一步一步变化的？" description="从采购、出成、工时、促销到配送，把今天的利润变化追到业务现场。" />

      <div className={styles.marginCanvas}>
        <div className={styles.marginHeadline}>
          <span><small>销售收入</small><strong>¥{BUSINESS_SCENARIO.revenue.toLocaleString("zh-CN")}</strong></span>
          <span><small>毛利</small><strong>¥{BUSINESS_SCENARIO.grossProfit.toLocaleString("zh-CN")}</strong></span>
        </div>

        <div className={styles.marginBridge}>
          <svg viewBox={`0 0 ${BRIDGE_WIDTH} ${BRIDGE_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={BRIDGE_PATH} />
          </svg>
          <div className={styles.marginTerminal} data-terminal="start" style={bridgePosition(BRIDGE_POINTS[0])}>
            <i />
            <div className={styles.marginStart}><small>昨日毛利率</small><strong>{bridgeValues[0]}%</strong></div>
          </div>
          {BUSINESS_SCENARIO.attribution.map((item, index) => {
            const positive = item.value > 0;
            const point = BRIDGE_POINTS[index + 1];
            return (
              <div
                key={item.label}
                className={`${styles.marginDriver} ${progress > 0.2 + index * 0.09 ? styles.isVisible : ""}`}
                data-label-side={point.y > 220 ? "above" : "below"}
                style={bridgePosition(point)}
              >
                <i />
                <button
                  type="button"
                  data-showroom-control
                  data-positive={positive}
                  data-selected={selectedDriver === item.label}
                  data-final-driver={index === BUSINESS_SCENARIO.attribution.length - 1}
                  onClick={() => { onInteract(); setSelectedDriver(item.label); }}
                >
                  <span>{positive ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}{item.value > 0 ? "+" : ""}{item.value}%</span>
                  <strong>{bridgeValues[index + 1]}%</strong>
                  <small>{item.label}</small>
                </button>
              </div>
            );
          })}
          <div className={`${styles.marginTerminal} ${progress > 0.7 ? styles.isVisible : ""}`} data-terminal="end" style={bridgePosition(BRIDGE_POINTS[BRIDGE_POINTS.length - 1])}>
            <i />
            <div className={styles.marginEnd}><small>今日毛利率</small><strong>{BUSINESS_SCENARIO.grossMargin}%</strong></div>
          </div>
        </div>

        <div className={`${styles.marginEvidence} ${progress > 0.48 ? styles.isVisible : ""}`}>
          <span><small>当前归因</small><strong>{selectedDriver} {selectedItem.value > 0 ? "+" : ""}{selectedItem.value}%</strong></span>
          <p>{driverSources[selectedDriver]}</p>
          <em>基于实际领料、批次出成、工时报工与配送费用</em>
        </div>
      </div>
    </section>
  );
}
