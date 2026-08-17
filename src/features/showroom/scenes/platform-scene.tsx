import { PLATFORM_CAPABILITIES, PLATFORM_NODES } from "../showroom-data";
import styles from "../showroom.module.css";

export function PlatformScene({ progress }: { progress: number }) {
  const networkVisible = progress > 0.14;
  const sloganVisible = progress > 0.5;

  return (
    <section className={`${styles.scene} ${styles.platformScene}`}>
      <div className={`${styles.platformNetwork} ${networkVisible ? styles.isVisible : ""}`}>
        <svg viewBox="0 0 1000 520" aria-hidden="true">
          <path d="M500 260 L178 104 M500 260 L820 104 M500 260 L884 332 M500 260 L748 466 M500 260 L252 466 M500 260 L116 332" />
          <circle cx="500" cy="260" r="132" />
          <circle cx="500" cy="260" r="82" />
        </svg>
        <div className={styles.noraCore}>
          <small>MANUFACTURING OS</small>
          <strong>NORA</strong>
          <span>{PLATFORM_CAPABILITIES.map((item) => <em key={item}>{item}</em>)}</span>
        </div>
        {PLATFORM_NODES.map((node, index) => (
          <div key={node} className={`${styles.platformNode} ${styles[`platformNode${index + 1}`]} ${progress > 0.14 + index * 0.055 ? styles.isVisible : ""}`}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{node}</strong><small>在线运行</small>
          </div>
        ))}
      </div>

      <div className={`${styles.platformClosing} ${sloganVisible ? styles.isVisible : ""}`}>
        <p>从一座工厂，到可复制的行业能力</p>
        <h1>让订单驱动生产，<br />让数据驱动经营。</h1>
      </div>
    </section>
  );
}
