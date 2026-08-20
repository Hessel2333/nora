import type { CSSProperties } from "react";
import { Factory, PackageSearch, Truck } from "lucide-react";
import { SHOWROOM_MRP } from "../showroom-data";
import { SceneTitle } from "../components/scene-title";
import styles from "../showroom.module.css";

export function MrpScene({ progress }: { progress: number }) {
  const calculation = SHOWROOM_MRP.calculation;
  const calculationIndex = Math.min(calculation.steps.length - 1, Math.max(0, Math.floor(((progress - 0.2) / 0.36) * calculation.steps.length)));
  const engineProgress = Math.max(0, Math.min(1, (progress - 0.16) / 0.46));
  const outputsVisible = progress > 0.58;

  return (
    <section className={`${styles.scene} ${styles.mrpScene}`}>
      <SceneTitle eyebrow="04 · MRP ENGINE" title="计划不是黑盒，每一步都有依据" description="示例需求、库存、在途与安全库存进入同一套可解释计划流程。" />

      <div className={styles.mrpLiveCanvas} style={{ "--engine-progress": engineProgress } as CSSProperties}>
        <div className={styles.mrpReadings}>
          <span className={progress > 0.08 ? styles.isVisible : ""}><small>{calculation.material}</small><strong>{calculation.demandKg.toFixed(1)}<em>kg</em></strong></span>
          <span className={progress > 0.2 ? styles.isVisible : ""}><small>当前库存</small><strong>{calculation.onHandKg.toFixed(1)}<em>kg</em></strong></span>
          <span className={progress > 0.3 ? styles.isVisible : ""}><small>在途库存</small><strong>{calculation.inTransitKg.toFixed(1)}<em>kg</em></strong></span>
          <span className={progress > 0.4 ? styles.isVisible : ""}><small>安全库存</small><strong>{calculation.safetyStockKg.toFixed(1)}<em>kg</em></strong></span>
        </div>

        <div className={styles.mrpLiveTrack}><i /><i /><i /></div>

        <div className={styles.mrpLiveEngine}>
          <span /><span />
          <PackageSearch size={30} />
          <small>MRP · LIVE</small>
          <strong>{calculation.steps[calculationIndex].toFixed(1)}<em>kg</em></strong>
          <p>{calculationIndex === calculation.steps.length - 1 ? "采购缺口" : "演示净算中"}</p>
        </div>

        <div className={`${styles.mrpRecommendation} ${progress > 0.52 ? styles.isVisible : ""}`}>
          <small>采购缺口</small><strong>{calculation.shortageKg.toFixed(1)}<em>kg</em></strong>
          <p>已生成采购建议 <span>{calculation.purchaseOrderCode}</span></p>
        </div>

        <div className={`${styles.mrpLiveOutputs} ${outputsVisible ? styles.isVisible : ""}`}>
          <span><PackageSearch size={20} /><small>采购建议</small><strong>6<em>项</em></strong></span>
          <span><Factory size={20} /><small>生产任务</small><strong>12<em>项</em></strong></span>
          <span><Truck size={20} /><small>配送批次</small><strong>4<em>批</em></strong></span>
        </div>

        <div className={`${styles.mrpScheduleRail} ${progress > 0.64 ? styles.isVisible : ""}`}>
          <header><span>鸡胸肉工艺排程</span><strong>09:20 净料称量</strong></header>
          <div>
            {SHOWROOM_MRP.timeline.map((item, index) => (
              <span key={item.time} className={progress > 0.61 + index * 0.035 ? styles.isVisible : ""}>
                <i /><strong>{item.time}</strong><small>{item.task}</small>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
