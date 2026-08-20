import type { CSSProperties } from "react";
import { CheckCircle2, Clock3, GitMerge, Snowflake } from "lucide-react";
import { SCHEDULING_SCENARIO } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

const reasonIcons = [Clock3, GitMerge, CheckCircle2, Snowflake];

export function SchedulingScene({ progress }: { progress: number }) {
  const railProgress = Math.max(0, Math.min(1, (progress - 0.18) / 0.52));
  const activeStep = Math.min(
    SCHEDULING_SCENARIO.criticalPath.length - 1,
    Math.floor(railProgress * SCHEDULING_SCENARIO.criticalPath.length),
  );

  return (
    <section className={`${styles.scene} ${styles.schedulingScene}`}>
      <SceneTitle
        eyebrow="06 · SMART SCHEDULING"
        title="先做什么，后做什么，排程依据清晰可见"
        description="基于交付时间、工艺前置关系与工位负荷，生成一版可解释的今日排程建议。"
      />

      <div
        className={styles.schedulingCanvas}
        style={{ "--schedule-progress": railProgress } as CSSProperties}
      >
        <aside className={styles.schedulingDecision}>
          <span>排程建议 · 演示</span>
          <small>今日订单</small>
          <strong>{SCHEDULING_SCENARIO.orderPortions}<em>份</em></strong>
          <p><Clock3 size={18} />{SCHEDULING_SCENARIO.deliveryAt} 前完成</p>
          <div>
            <small>优先结论</small>
            <h2>先做鸡胸肉</h2>
            <p>最长工艺路径先启动，避免腌制与静置时间挤压后续包装。</p>
          </div>
        </aside>

        <div className={styles.schedulingLogic}>
          <div className={styles.schedulingReasons}>
            {SCHEDULING_SCENARIO.reasons.map((reason, index) => {
              const Icon = reasonIcons[index];
              return <span key={reason}><Icon size={17} />{reason}</span>;
            })}
          </div>

          <div className={styles.scheduleMainLane}>
            <header><span>关键路径</span><strong>08:00 — 10:20</strong></header>
            <div className={styles.scheduleRailLine}><i /></div>
            <div className={styles.scheduleSteps}>
              {SCHEDULING_SCENARIO.criticalPath.map((item, index) => (
                <div
                  key={item.id}
                  className={index <= activeStep ? styles.scheduleStepActive : ""}
                  style={{ "--schedule-index": index } as CSSProperties}
                >
                  <i><span /></i>
                  <small>{item.time}</small>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                  <em>{item.duration} min</em>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.parallelWindow} ${progress > 0.54 ? styles.isVisible : ""}`}>
            <header><GitMerge size={19} /><span>腌制等待期间，并行完成</span><strong>节省 35 min</strong></header>
            <div>
              {SCHEDULING_SCENARIO.parallelTasks.map((item) => (
                <span key={item.label}>
                  <small>{item.time}</small>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
