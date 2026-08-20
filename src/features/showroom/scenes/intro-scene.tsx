import { ArrowDownRight } from "lucide-react";
import { DataFlow } from "../components/data-flow";
import { SHOWROOM_CUSTOMERS } from "../showroom-data";
import styles from "../showroom.module.css";

const incomingOrders = [
  { store: SHOWROOM_CUSTOMERS[0], portions: 96 },
  { store: SHOWROOM_CUSTOMERS[1], portions: 74 },
  { store: SHOWROOM_CUSTOMERS[2], portions: 82 },
  { store: SHOWROOM_CUSTOMERS[3], portions: 98 },
];

export function IntroScene({ progress, started, autoplay }: { progress: number; started: boolean; autoplay: boolean }) {
  const staticPreview = !autoplay && !started;
  const arrivalsVisible = staticPreview || (started && progress > 0.16);
  const flowVisible = started && progress > 0.66;

  return (
    <section className={`${styles.scene} ${styles.introScene}`} aria-label="一张订单驱动一座工厂">
      <div className={styles.introCopy}>
        <p className={styles.eyebrow}>NORA · MANUFACTURING OS</p>
        <h1>一张订单，<br />驱动一座工厂。</h1>
        <p>订单进入之后，数据开始流动。</p>
      </div>

      <div className={`${styles.incomingOrders} ${arrivalsVisible ? styles.isVisible : ""}`} aria-hidden={!arrivalsVisible}>
        {incomingOrders.map((order, index) => (
          <div key={order.store} className={styles.incomingOrder} data-index={index}>
            <span>{order.store}</span>
            <strong>{order.portions}<small>份</small></strong>
            <ArrowDownRight size={15} />
          </div>
        ))}
      </div>

      <div className={`${styles.introFlowLeft} ${flowVisible ? styles.isVisible : ""}`}><DataFlow active={flowVisible} /></div>
      <div className={`${styles.introFlowRight} ${flowVisible ? styles.isVisible : ""}`}><DataFlow active={flowVisible} /></div>
    </section>
  );
}
